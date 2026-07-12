'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, FileText, PlayCircle, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { SearchResult } from '@/types';
import { search as searchWorkspace } from '@/lib/service';

export default function SearchPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    if (!query.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const timer = window.setTimeout(async () => { try { setResults(await searchWorkspace(query) as SearchResult[]); } catch { setResults([]); } finally { setLoading(false); } }, 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  const openResult = (result: SearchResult) => {
    if (result.type === 'course') router.push(`/course/${result.id}`);
    else if (result.type === 'lesson') router.push(`/course/${result.course_id}/lesson/${result.id}`);
    else router.push(`/course/${result.course_id}`);
  };

  return <div className="mx-auto max-w-4xl space-y-7"><div><p className="ui-kicker">Workspace search</p><h1 className="mt-2 ui-page-title">Find what you need</h1><p className="mt-2 text-[14px] text-[#667085]">Search across courses, lessons, and notes saved on this device.</p></div><div className="ui-card p-2 shadow-sm"><div className="flex items-center gap-3 px-3"><Search size={19} className="text-[#2563a6]" /><input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Try a course name, lesson, or note…" className="h-12 min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[#182230] outline-none placeholder:text-[#98a2b3]" />{loading && <span className="size-4 animate-spin rounded-full border-2 border-[#cbd2dc] border-t-[#2563a6]" />}</div></div>{query && !loading && <section className="ui-card overflow-hidden">{results.length > 0 ? <><div className="border-b border-[var(--line)] px-5 py-3 text-[12px] font-semibold text-[#667085]">{results.length} result{results.length === 1 ? '' : 's'} for “{query}”</div><div className="divide-y divide-[#edf0f3]">{results.map(result => <button type="button" key={`${result.type}-${result.id}`} onClick={() => openResult(result)} className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[#fafbfc]"><span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${result.type === 'course' ? 'bg-[#eaf2fb] text-[#2563a6]' : result.type === 'lesson' ? 'bg-[#fff3e8] text-[#a64b13]' : 'bg-[#edf7f1] text-[#167a55]'}`}>{result.type === 'course' ? <BookOpen size={17} /> : result.type === 'lesson' ? <PlayCircle size={17} /> : <FileText size={17} />}</span><span className="min-w-0"><span className="block truncate text-[14px] font-semibold text-[#344054]">{result.title}</span><span className="mt-0.5 block truncate text-[12px] text-[#98a2b3]">{result.subtitle || result.type}</span></span></button>)}</div></> : <div className="px-6 py-16 text-center"><Search size={26} className="mx-auto mb-3 text-[#c5ccd6]" /><h2 className="text-[15px] font-semibold text-[#344054]">No results found</h2><p className="mt-1 text-[13px] text-[#667085]">Try a shorter or more specific search term.</p></div>}</section>}{!query && <section className="ui-card px-6 py-14 text-center"><Search size={27} className="mx-auto mb-3 text-[#98a2b3]" /><p className="text-[14px] font-medium text-[#667085]">Start typing to search your learning workspace.</p></section>}</div>;
}
