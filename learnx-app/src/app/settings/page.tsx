'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, Eye, EyeOff, FolderInput, HardDrive, KeyRound, Loader2, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { dbGet, dbPut, STORES } from '@/lib/idb';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    dbGet<{ key: string; value: string }>(STORES.settings, 'gemini_api_key')
      .then(rec => { if (rec?.value) setApiKey(rec.value); })
      .catch(() => {});
  }, []);

  const saveKey = async () => {
    setSaving(true);
    await dbPut(STORES.settings, { key: 'gemini_api_key', value: apiKey.trim() });
    setSaving(false); setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const clearKey = async () => {
    setClearing(true);
    await dbPut(STORES.settings, { key: 'gemini_api_key', value: '' });
    setApiKey(''); setClearing(false);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div>
        <p className="ui-kicker">Workspace</p>
        <h1 className="mt-2 ui-page-title">Settings</h1>
        <p className="mt-2 text-[14px] text-[#667085]">LearnX is designed to keep your personal learning library on this device.</p>
      </div>

      {/* Local-first workspace */}
      <section className="ui-card overflow-hidden">
        <div className="flex items-start gap-4 border-b border-[var(--line)] p-5 sm:p-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#edf7f1] text-[#167a55]">
            <ShieldCheck size={20} />
          </span>
          <div>
            <h2 className="text-[16px] font-bold text-[#182230]">Local-first workspace</h2>
            <p className="mt-1 text-[13px] leading-5 text-[#667085]">
              Courses, progress, notes, and folder references are stored in your browser's local database. Nothing is sent to a cloud service.
            </p>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f1f3f6] text-[#475467]">
                <HardDrive size={18} />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-[#344054]">Manage your local content</p>
                <p className="mt-1 text-[12px] text-[#667085]">Import a folder to add videos and PDFs to your course library.</p>
              </div>
            </div>
            <Link href="/import" className="ui-btn ui-btn-secondary shrink-0">
              <FolderInput size={16} /> Import content
            </Link>
          </div>
        </div>
      </section>

      {/* Gemini AI key */}
      <section className="ui-card overflow-hidden">
        <div className="flex items-start gap-4 border-b border-[var(--line)] p-5 sm:p-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#faf5ff] text-[#7c3aed]">
            <Sparkles size={20} />
          </span>
          <div>
            <h2 className="text-[16px] font-bold text-[#182230]">AI Timestamp Segmentation</h2>
            <p className="mt-1 text-[13px] leading-5 text-[#667085]">
              Add your Gemini API key to enable AI-powered topic detection from YouTube video transcripts.
              When a video has no chapters, LearnX will use Gemini Flash to generate structured timestamps automatically.
            </p>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {/* Cost info */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Cost per 1hr video', value: '~₹0.05', sub: 'Gemini Flash pricing' },
              { label: 'Free tier', value: '1,500 req/day', sub: 'No credit card needed' },
              { label: 'Cached after first run', value: '0 cost', sub: 'Results stored locally' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="rounded-[10px] border border-[var(--line)] bg-[#fafbfc] px-4 py-3">
                <p className="text-[11px] font-semibold text-[#667085]">{label}</p>
                <p className="mt-1 text-[18px] font-bold tracking-[-.025em] text-[#182230]">{value}</p>
                <p className="text-[10px] text-[#98a2b3]">{sub}</p>
              </div>
            ))}
          </div>

          {/* API key input */}
          <div>
            <label htmlFor="gemini-key" className="mb-1.5 block text-[12px] font-semibold text-[#344054]">
              <KeyRound size={12} className="inline mr-1" />
              Gemini API Key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="gemini-key"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setSaved(false); }}
                  placeholder="AIza..."
                  className="ui-input px-3 py-2.5 pr-10 w-full font-mono text-[13px]"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(v => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-[#98a2b3] hover:text-[#475467]"
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button
                type="button"
                onClick={saveKey}
                disabled={saving || !apiKey.trim()}
                className={`ui-btn shrink-0 ${saved ? 'border-[#b7e2cd] bg-[#edf7f1] text-[#167a55]' : 'ui-btn-accent'}`}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : null}
                {saving ? 'Saving…' : saved ? 'Saved!' : 'Save key'}
              </button>
              {apiKey && (
                <button
                  type="button"
                  onClick={clearKey}
                  disabled={clearing}
                  className="ui-btn ui-btn-ghost text-[#b42318] hover:bg-[#fff1f2]"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-[#98a2b3]">
              Key is stored only in this browser's IndexedDB — never sent to our servers.
              Get a free key at{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[#2563a6] hover:underline">
                aistudio.google.com
              </a>
            </p>
          </div>

          {/* How it works */}
          <div className="rounded-[10px] border border-[#e0f0ff] bg-[#f0f8ff] p-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[.08em] text-[#1d4f86]">How AI timestamps work</p>
            <ol className="space-y-2">
              {[
                ['Parse video description', 'If the creator added chapters (0:00 - Intro format), we use them directly. Free, instant.'],
                ['Fetch transcript via proxy', 'If no chapters, we fetch the auto-generated captions via a public CORS proxy.'],
                ['Compress + send to Gemini', 'The transcript is reduced to ~30% token size, then Gemini Flash segments it into topic sections.'],
                ['Cache locally', 'Results are stored in IndexedDB — the same video is never processed twice.'],
              ].map(([title, desc], i) => (
                <li key={title} className="flex gap-3">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#dbeafe] text-[10px] font-bold text-[#1d4f86]">{i + 1}</span>
                  <span>
                    <strong className="block text-[12px] text-[#344054]">{title}</strong>
                    <span className="text-[11px] leading-4 text-[#667085]">{desc}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}
