'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, FolderOpen, HardDrive, Info, Loader2, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { importFolder } from '@/lib/service';

export default function ImportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  useEffect(() => { setIsSupported('showDirectoryPicker' in window); }, []);

  const handleImport = async () => {
    setLoading(true); setResult(null);
    try {
      const data = await importFolder();
      if (data) setResult({ success: true, ...data });
    } catch (error: any) { setResult({ error: error?.message || 'Import failed. Please try again.' }); }
    finally { setLoading(false); }
  };

  const steps = [
    ['Choose a folder', 'Select the folder that contains a course or study materials.'],
    ['We organize it', 'Top-level folders become modules and supported files become lessons.'],
    ['Stay private', 'Files remain on your device; LearnX only keeps local references.'],
  ];

  return <div className="mx-auto max-w-4xl space-y-7">
    <div><p className="ui-kicker">Local-first import</p><h1 className="mt-2 ui-page-title">Bring a course into LearnX</h1><p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#667085]">Import a folder of videos and PDFs. LearnX creates a structured course without uploading your learning materials anywhere.</p></div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
      <section className="ui-card p-6 sm:p-7"><div className="flex size-11 items-center justify-center rounded-xl bg-[#eaf2fb] text-[#2563a6]"><FolderOpen size={22} /></div><h2 className="mt-5 text-[19px] font-bold tracking-[-.025em] text-[#182230]">Select a local folder</h2><p className="mt-2 text-[13px] leading-6 text-[#667085]">LearnX recognizes videos and PDFs, including MP4, MKV, WebM, MOV, TS, and PDF files.</p>
        {isSupported === false && <div role="alert" className="mt-5 flex gap-3 rounded-lg border border-[#fecdca] bg-[#fff5f4] p-3.5 text-[#b42318]"><AlertCircle size={18} className="mt-0.5 shrink-0" /><p className="text-[12px] leading-5">Folder import requires the File System Access API. Use a current version of Chrome, Edge, or Opera.</p></div>}
        <button type="button" id="pick-folder-btn" onClick={handleImport} disabled={isSupported === false || loading} className="ui-btn ui-btn-primary mt-7 w-full sm:w-auto">{loading ? <><Loader2 size={17} className="animate-spin" /> Scanning folder…</> : <><HardDrive size={17} /> Choose folder</>}</button>
      </section>
      <aside className="ui-card p-6"><p className="ui-kicker">How it works</p><ol className="mt-5 space-y-5">{steps.map(([title, copy], index) => <li key={title} className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#f1f3f6] text-[11px] font-bold text-[#475467]">{index + 1}</span><span><strong className="block text-[13px] text-[#344054]">{title}</strong><span className="mt-1 block text-[12px] leading-5 text-[#667085]">{copy}</span></span></li>)}</ol><div className="mt-7 flex items-start gap-2 border-t border-[var(--line)] pt-5 text-[#667085]"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#167a55]" /><p className="text-[11px] leading-5">Your local file handles are stored in this browser only. You can re-import if access is later revoked.</p></div></aside>
    </div>
    {result && <section className={`ui-card p-6 sm:p-7 ${result.error ? 'border-[#fecdca]' : 'border-[#b7e2cd]'}`}>{result.error ? <div className="flex gap-3 text-[#b42318]"><AlertCircle size={20} className="mt-0.5 shrink-0" /><div><h2 className="font-bold">Import could not be completed</h2><p className="mt-1 text-[13px] text-[#b5473f]">{result.error}</p></div></div> : <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#edf7f1] text-[#167a55]"><CheckCircle2 size={20} /></span><div><p className="text-[15px] font-bold text-[#182230]">Import complete</p><p className="mt-1 text-[13px] text-[#667085]">“{result.course.title}” now has {result.stats.modules} modules and {result.stats.lessons} lessons.</p></div></div><button type="button" id="go-to-course-btn" onClick={() => router.push(`/course/${result.course.id}`)} className="ui-btn ui-btn-accent shrink-0">Open course</button></div>}</section>}
  </div>;
}
