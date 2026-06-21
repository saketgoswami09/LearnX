'use client';

import { Search, Command, Loader2, BookOpen, PlayCircle, FileText, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import type { SearchResult } from '@/types';
import { search as clientSearch } from '@/lib/service';
import { useSidebarStore } from '@/store/useSidebarStore';

export function TopBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toggleMobile } = useSidebarStore();

  // Keyboard Shortcut Handler (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Debounced Search Logic
  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await clientSearch(q);
        setResults(data as SearchResult[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const go = (r: SearchResult) => {
    setOpen(false);
    setQ('');
    if (r.type === 'course') router.push(`/course/${r.id}`);
    else if (r.type === 'lesson') router.push(`/course/${r.course_id}/lesson/${r.id}`);
    else router.push(`/course/${r.course_id}`);
  };

  return (
    <>
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-20 h-[60px] bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center px-6 gap-4 shrink-0">

        {/* Mobile Hamburger Menu */}
        <button
          onClick={toggleMobile}
          className="md:hidden p-2 -ml-3 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none"
        >
          <Menu size={20} />
        </button>

        {/* Search Trigger Button */}
        <button
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          className="flex items-center gap-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200/80 rounded-xl px-3.5 py-2 text-[13.5px] text-gray-500 font-medium transition-colors w-full max-w-[380px] group shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <Search size={15} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
          <span>Search anything...</span>
          <span className="ml-auto flex items-center">
            <kbd className="hidden sm:inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-400 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase shadow-sm">
              <Command size={10} /> K
            </kbd>
          </span>
        </button>

        {/* Date Display */}
        <div className="ml-auto hidden sm:flex items-center gap-2">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100" suppressHydrationWarning>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </header>

      {/* ── COMMAND PALETTE (MODAL) ── */}
      {open && (
        <div className="fixed inset-0 z-50 bg-gray-900/20 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4" onClick={() => setOpen(false)}>

          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-[560px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Search Input Area */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 bg-gray-50/50">
              <Search size={18} className="text-indigo-600 shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search courses, lessons, notes..."
                className="flex-1 bg-transparent border-none text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
              />
              {loading && <Loader2 size={16} className="animate-spin text-indigo-600 shrink-0" />}
            </div>

            {/* Results Area */}
            {results.length > 0 && (
              <div className="max-h-[360px] overflow-y-auto custom-scrollbar p-2">
                <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase px-3 pt-2 pb-1">
                  Results
                </div>
                {results.map(r => (
                  <button
                    key={r.id}
                    onClick={() => go(r)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-transparent hover:bg-gray-50 text-left transition-colors group focus:outline-none focus:bg-gray-50"
                  >
                    {/* Icon mapping based on result type */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${r.type === 'course' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
                      r.type === 'lesson' ? 'bg-orange-50 border-orange-100 text-orange-600' :
                        'bg-emerald-50 border-emerald-100 text-emerald-600'
                      }`}>
                      {r.type === 'course' ? <BookOpen size={14} /> :
                        r.type === 'lesson' ? <PlayCircle size={14} /> :
                          <FileText size={14} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                        {r.title}
                      </div>
                      <div className="text-[11px] font-medium text-gray-500 capitalize">
                        {r.subtitle} <span className="mx-1">•</span> {r.type}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Empty State */}
            {q && results.length === 0 && !loading && (
              <div className="py-12 px-4 text-center">
                <Search size={32} className="mx-auto text-gray-200 mb-3" />
                <p className="text-[14px] font-medium text-gray-600">No results found for "{q}"</p>
                <p className="text-[12px] text-gray-400 mt-1">Try searching with different keywords.</p>
              </div>
            )}

            {/* Quick Actions (Default View) */}
            {!q && (
              <div className="p-2 pb-3">
                <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase px-3 pt-3 pb-2">
                  Quick Actions
                </div>
                {[
                  { label: 'Go to Dashboard', href: '/' },
                  { label: 'Browse Library', href: '/library' },
                  { label: 'Import Content', href: '/import' },
                ].map(a => (
                  <button
                    key={a.href}
                    onClick={() => { router.push(a.href); setOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left transition-colors text-[13.5px] font-medium text-gray-600 hover:text-gray-900 focus:outline-none focus:bg-gray-50"
                  >
                    <Command size={14} className="text-gray-400" />
                    {a.label}
                  </button>
                ))}
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}