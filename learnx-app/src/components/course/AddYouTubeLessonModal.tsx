'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, PlaySquare, X } from 'lucide-react';
import { extractVideoId, fetchYTMeta } from '@/lib/youtube';
import { createLesson, getModules } from '@/lib/service';
import type { Module } from '@/types';

interface Props {
  courseId: string;
  onClose: () => void;
  onCreated: (lessonId: string) => void;
}

type Step = 'input' | 'preview' | 'saving';

export function AddYouTubeLessonModal({ courseId, onClose, onCreated }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ title: string; author: string; thumbnailUrl: string; videoId: string } | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  useEffect(() => {
    getModules(courseId).then(mods => {
      setModules(mods);
      if (mods.length > 0) setSelectedModule(mods[0].id);
    });
    window.setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [courseId, onClose]);

  /* ── Try to auto-detect pasted URL ── */
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (extractVideoId(pasted)) {
      e.preventDefault();
      setUrl(pasted);
      setError(null);
      void handlePreview(pasted);
    }
  };

  const handlePreview = async (rawUrl = url) => {
    const vid = extractVideoId(rawUrl.trim());
    if (!vid) { setError('Could not find a valid YouTube video ID in that URL. Try pasting a full youtube.com or youtu.be link.'); return; }
    setError(null); setStep('input');
    try {
      const ytMeta = await fetchYTMeta(vid);
      setMeta({ ...(ytMeta ?? { title: `YouTube video ${vid}`, author: '', thumbnailUrl: `https://img.youtube.com/vi/${vid}/hqdefault.jpg` }), videoId: vid });
      setCustomTitle(ytMeta?.title ?? '');
      setStep('preview');
    } catch {
      setError('Could not fetch video info. Check your internet connection.');
    }
  };

  const handleSave = async () => {
    if (!meta || !selectedModule) return;
    setStep('saving');
    try {
      const lesson = await createLesson({
        module_id: selectedModule,
        course_id: courseId,
        title: customTitle.trim() || meta.title,
        type: 'youtube',
        file_path: meta.videoId,
        youtube_url: `https://www.youtube.com/watch?v=${meta.videoId}`,
        duration: 0,
      });
      onCreated(lesson.id);
      onClose();
    } catch {
      setError('Failed to save. Please try again.');
      setStep('preview');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="yt-modal-title"
        className="w-full max-w-[540px] overflow-hidden rounded-xl border border-[#d9dee7] bg-white shadow-[0_24px_48px_rgb(16_24_40/18%)]"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#fef2f2] text-[#ef4444]">
              <PlaySquare size={17} />
            </span>
            <div>
              <h2 id="yt-modal-title" className="text-[15px] font-bold tracking-[-.02em] text-[#182230]">
                Add YouTube Lesson
              </h2>
              <p className="text-[11px] text-[#667085]">Paste any YouTube URL — chapters are detected automatically.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="ui-btn ui-btn-ghost min-h-8 px-2" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="space-y-5 p-5 sm:p-6">
          {/* URL input */}
          {step === 'input' && (
            <div>
              <label htmlFor="yt-url" className="mb-1.5 block text-[12px] font-semibold text-[#344054]">
                YouTube URL <span className="text-[#b42318]">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  id="yt-url"
                  value={url}
                  onChange={e => { setUrl(e.target.value); setError(null); }}
                  onPaste={handlePaste}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="ui-input px-3 py-2.5 flex-1"
                />
                <button
                  type="button"
                  onClick={() => void handlePreview()}
                  disabled={!url.trim()}
                  className="ui-btn ui-btn-accent shrink-0"
                >
                  Preview
                </button>
              </div>
              {error && (
                <div className="mt-3 flex gap-2 rounded-lg border border-[#fecdca] bg-[#fff5f4] p-3 text-[12px] text-[#b42318]">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
              <p className="mt-3 text-[11px] text-[#98a2b3]">
                💡 Just paste — we auto-detect the URL. Works with youtube.com, youtu.be, and Shorts.
              </p>
            </div>
          )}

          {/* Preview */}
          {(step === 'preview' || step === 'saving') && meta && (
            <>
              {/* Thumbnail + meta */}
              <div className="flex gap-3 rounded-xl border border-[var(--line)] bg-[#fafbfc] p-3">
                <div className="relative shrink-0 overflow-hidden rounded-lg" style={{ width: 120, height: 68 }}>
                  <img
                    src={meta.thumbnailUrl}
                    alt="Thumbnail"
                    className="size-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    <PlaySquare size={9} /> YT
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[13px] font-semibold text-[#182230]">{meta.title}</p>
                  <p className="mt-0.5 text-[11px] text-[#667085]">{meta.author}</p>
                  <button
                    type="button"
                    onClick={() => { setStep('input'); setMeta(null); }}
                    className="mt-2 text-[11px] text-[#2563a6] hover:underline"
                  >
                    ← Change URL
                  </button>
                </div>
              </div>

              {/* Customise title */}
              <div>
                <label htmlFor="yt-custom-title" className="mb-1.5 block text-[12px] font-semibold text-[#344054]">
                  Lesson title
                </label>
                <input
                  id="yt-custom-title"
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  className="ui-input px-3 py-2.5"
                />
              </div>

              {/* Module selector */}
              {modules.length > 1 && (
                <div>
                  <label htmlFor="yt-module" className="mb-1.5 block text-[12px] font-semibold text-[#344054]">
                    Add to module
                  </label>
                  <select
                    id="yt-module"
                    value={selectedModule}
                    onChange={e => setSelectedModule(e.target.value)}
                    className="ui-input h-10 px-3"
                  >
                    {modules.map(m => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* AI hint */}
              <div className="flex gap-2 rounded-lg border border-[#e0f0ff] bg-[#f0f8ff] p-3 text-[11px] text-[#1d4f86]">
                <span className="text-[16px] leading-none">✨</span>
                <span>
                  Timestamps will be auto-detected from video chapters. If none are found, we'll try fetching the transcript.
                  Add a <strong>Gemini API key</strong> in Settings for AI-generated topic segments.
                </span>
              </div>

              {error && (
                <div className="flex gap-2 rounded-lg border border-[#fecdca] bg-[#fff5f4] p-3 text-[12px] text-[#b42318]">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="flex justify-end gap-2 border-t border-[var(--line)] bg-[#fafbfc] px-5 py-4 sm:px-6">
          <button type="button" onClick={onClose} className="ui-btn ui-btn-secondary">
            Cancel
          </button>
          {(step === 'preview' || step === 'saving') && (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={step === 'saving' || !selectedModule}
              className="ui-btn ui-btn-accent"
            >
              {step === 'saving' ? (
                <><Loader2 size={15} className="animate-spin" /> Adding lesson…</>
              ) : (
                <><CheckCircle2 size={15} /> Add lesson</>
              )}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
