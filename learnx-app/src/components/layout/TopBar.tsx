'use client';

import { BookOpen, Command, FileText, Flame, Loader2, Menu, PlayCircle, Search, TrendingUp } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { DashboardStats, SearchResult } from '@/types';
import { getStats, search as clientSearch } from '@/lib/service';
import { useSidebarStore } from '@/store/useSidebarStore';

const titles: Record<string, string> = { '/': 'Overview', '/library': 'Library', '/import': 'Import content', '/search': 'Search', '/settings': 'Settings' };

export function TopBar() {
  const router   = useRouter();
  const pathname = usePathname();
  const [open,    setOpen]    = useState(false);
  const [q,       setQ]       = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats,   setStats]   = useState<DashboardStats | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toggleMobile } = useSidebarStore();
  const title = titles[pathname] ?? (pathname.startsWith('/course/') ? 'Course' : 'LearnX');

  // Fetch lightweight stats for header indicators
  useEffect(() => {
    getStats().then(s => setStats(s)).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen(true); window.setTimeout(() => inputRef.current?.focus(), 30); }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!q.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try { setResults(await clientSearch(q) as SearchResult[]); } catch { setResults([]); } finally { setLoading(false); }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [q]);

  const go = (result: SearchResult) => {
    setOpen(false); setQ('');
    if (result.type === 'course') router.push(`/course/${result.id}`);
    else if (result.type === 'lesson') router.push(`/course/${result.course_id}/lesson/${result.id}`);
    else router.push(`/course/${result.course_id}`);
  };

  return <>
    <header className="sticky top-0 z-30 flex h-[68px] shrink-0 items-center gap-3 border-b border-[var(--line)] bg-white px-4 sm:px-6">
      <button type="button" onClick={toggleMobile} aria-label="Open navigation" className="ui-btn ui-btn-ghost -ml-2 min-h-9 px-2 md:hidden"><Menu size={20} /></button>
      <div className="hidden min-w-0 sm:block"><p className="truncate text-[14px] font-semibold text-[#344054]">{title}</p></div>
      <button type="button" onClick={() => { setOpen(true); window.setTimeout(() => inputRef.current?.focus(), 30); }} className="group flex h-10 w-full max-w-[430px] items-center gap-2 rounded-[9px] border border-[var(--line-strong)] bg-white px-3 text-left text-[13px] font-medium text-[#667085] shadow-sm transition-colors hover:border-[#bfc7d3] hover:bg-[#fafbfc] sm:ml-3">
        <Search size={16} className="text-[#98a2b3]" /><span className="flex-1 truncate">Search lessons, notes...</span><kbd className="hidden items-center gap-0.5 rounded border border-[#d9dee7] bg-[#f7f8fa] px-1.5 py-0.5 text-[10px] font-semibold text-[#98a2b3] sm:flex"><Command size={10} />K</kbd>
      </button>
      {/* Status indicators — replaces the date */}
      <div className="ml-auto hidden items-center gap-2 md:flex">
        {stats && (stats.streak ?? 0) > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-[#fff7ed] px-2.5 py-1 text-[11px] font-semibold text-[#ea580c]">
            <Flame size={12} />{stats.streak}d streak
          </span>
        )}
        {stats && (stats.totalLessons ?? 0) > 0 && (() => {
          const pct = Math.round(((stats.completedLessons ?? 0) / stats.totalLessons) * 100);
          return (
            <span className="flex items-center gap-1.5 rounded-full bg-[#eaf2fb] px-2.5 py-1 text-[11px] font-semibold text-[#1d4f86]">
              <TrendingUp size={12} />{pct}% complete
            </span>
          );
        })()}
      </div>
    </header>

    {open && <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/30 p-4 pt-[12vh]" onMouseDown={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="Search workspace" className="w-full max-w-[640px] overflow-hidden rounded-xl border border-[#d9dee7] bg-white shadow-[0_24px_48px_rgb(16_24_40/18%)]" onMouseDown={event => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3"><Search size={18} className="text-[#2563a6]" /><input ref={inputRef} value={q} onChange={event => setQ(event.target.value)} placeholder="Search anything in your workspace" className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[#182230] outline-none placeholder:text-[#98a2b3]" />{loading ? <Loader2 size={16} className="animate-spin text-[#667085]" /> : <kbd className="rounded border border-[#d9dee7] px-1.5 py-0.5 text-[10px] font-semibold text-[#98a2b3]">ESC</kbd>}</div>
        {results.length > 0 && <div className="max-h-[360px] overflow-y-auto p-2 custom-scrollbar"><p className="px-3 pb-2 pt-1 ui-kicker">Results</p>{results.map(result => <button type="button" key={`${result.type}-${result.id}`} onClick={() => go(result)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#f4f6f8]"><span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${result.type === 'course' ? 'bg-[#eaf2fb] text-[#2563a6]' : result.type === 'lesson' ? 'bg-[#fff3e8] text-[#a64b13]' : 'bg-[#edf7f1] text-[#167a55]'}`}>{result.type === 'course' ? <BookOpen size={15} /> : result.type === 'lesson' ? <PlayCircle size={15} /> : <FileText size={15} />}</span><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-[#344054]">{result.title}</span><span className="block truncate text-[11px] text-[#98a2b3]">{result.subtitle || result.type}</span></span></button>)}</div>}
        {q && !loading && results.length === 0 && <div className="px-6 py-14 text-center"><Search size={25} className="mx-auto mb-3 text-[#c5ccd6]" /><p className="text-[13px] font-medium text-[#667085]">No results for “{q}”</p></div>}
        {!q && <div className="p-3"><p className="px-2 pb-2 pt-1 ui-kicker">Quick links</p>{[['Overview', '/'], ['Browse library', '/library'], ['Import local content', '/import']].map(([label, href]) => <button type="button" key={href} onClick={() => { router.push(href); setOpen(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-[#667085] hover:bg-[#f4f6f8] hover:text-[#344054]"><Command size={15} className="text-[#98a2b3]" />{label}</button>)}</div>}
      </div>
    </div>}
  </>;
}
