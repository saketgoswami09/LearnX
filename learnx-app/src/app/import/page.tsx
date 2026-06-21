'use client';

import { useState, useEffect } from 'react';
import { FolderOpen, RefreshCw, AlertCircle, CheckCircle2, Folder, Info, HardDrive } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { importFolder } from '@/lib/service';

export default function ImportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  // null = not yet checked (SSR), true/false = client result
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setIsSupported('showDirectoryPicker' in window);
  }, []);

  const handleImport = async () => {
    setLoading(true);
    setResult(null);

    try {
      const data = await importFolder();
      if (!data) {
        // User cancelled the picker — not an error
        setLoading(false);
        return;
      }
      setResult({ success: true, ...data });
    } catch (err: any) {
      setResult({ error: err?.message || 'Import failed. Please try again.' });
    }
    setLoading(false);
  };

  return (
    <>
      {/* ── AURORA MESH BACKGROUND LAYER ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-[#F8F9FC]">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-300/40 mix-blend-multiply filter blur-[120px] opacity-70" />
        <div className="absolute top-[10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-indigo-300/40 mix-blend-multiply filter blur-[120px] opacity-70" />
        <div className="absolute bottom-[-10%] left-[20%] w-[700px] h-[700px] rounded-full bg-cyan-200/40 mix-blend-multiply filter blur-[120px] opacity-60" />
      </div>

      <div className="max-w-3xl mx-auto w-full p-6 md:p-12 space-y-8 font-sans animate-in fade-in duration-500 relative z-10">

        {/* ── HEADER ── */}
        <div className="text-center space-y-4 pt-4">
          <div className="w-20 h-20 bg-white/80 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-white/60">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <FolderOpen size={28} className="text-indigo-600" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
              Import Local Folder
            </h1>
            <p className="text-[15px] text-gray-500 font-medium max-w-lg mx-auto leading-relaxed">
              Pick a folder from your computer. LearnX will scan it for videos and PDFs and build a course — <span className="text-gray-700 font-bold">entirely in your browser.</span>
            </p>
          </div>
        </div>

        {/* ── MAIN IMPORT CARD ── */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2rem] p-6 sm:p-8 shadow-sm">

          {/* Instructions Box */}
          <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-6 mb-8">
            <h3 className="flex items-center gap-2 text-[14px] font-bold text-gray-800 mb-4">
              <Info size={16} className="text-indigo-500" /> How it works:
            </h3>
            <ul className="space-y-3">
              {[
                { bold: '"Pick Folder"', text: 'and select your course folder in the system dialog.' },
                { bold: 'Course Title', text: 'is automatically generated from the top-level folder name.' },
                { bold: 'Modules', text: 'are created from your sub-folders.' },
                { bold: 'Lessons', text: 'are mapped from .mp4, .mkv, .webm, .ts, and .pdf files.' },
                { bold: '100% Local', text: 'Files stay on your disk. No uploads. No servers.' },
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-[13.5px] text-gray-600 leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                  <span>
                    Click <strong className="font-semibold text-gray-900">{item.bold}</strong> {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Browser Support Warning */}
          {isSupported === false && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-in fade-in">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="text-[14px] font-bold block">Browser not supported</strong>
                <p className="text-[12px] opacity-90 leading-relaxed">
                  The File System Access API requires Chrome, Edge, or Opera 86+. Firefox and Safari are not supported yet.
                </p>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-gray-900 hover:bg-black text-white text-[15px] font-semibold rounded-2xl transition-all shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed group"
            onClick={handleImport}
            disabled={isSupported === false || loading}
            id="pick-folder-btn"
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin text-white/70" />
                Scanning Folder...
              </>
            ) : (
              <>
                <HardDrive size={18} className="text-white/70 group-hover:text-white transition-colors" />
                Pick Folder & Import Course
              </>
            )}
          </button>
        </div>

        {/* ── RESULT / FEEDBACK BOX ── */}
        {result && (
          <div className={`p-6 sm:p-8 rounded-[2rem] border backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300 ${result.error
              ? 'bg-red-50/90 border-red-100/50 shadow-sm'
              : 'bg-white/70 border-white/50 shadow-lg shadow-indigo-500/5'
            }`}>

            {result.error ? (
              <div className="flex items-start gap-4 text-red-600">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div className="pt-1">
                  <div className="text-[15px] font-bold tracking-tight">Import Failed</div>
                  <div className="text-[13px] font-medium opacity-90 mt-1">{result.error}</div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">

                {/* Success Header */}
                <div className="flex items-center gap-4 text-emerald-600">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-emerald-200">
                    <CheckCircle2 size={24} className="text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-[18px] font-extrabold tracking-tight text-gray-900">Import Successful!</div>
                    <div className="text-[13.5px] font-medium text-emerald-700 mt-0.5">Created &ldquo;{result.course.title}&rdquo;</div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/60 border border-white/80 rounded-2xl p-5 text-center shadow-sm">
                    <div className="text-3xl font-black text-gray-900 tracking-tight">{result.stats.modules}</div>
                    <div className="text-[12px] font-bold uppercase tracking-wider text-gray-400 mt-1">Modules Found</div>
                  </div>
                  <div className="bg-white/60 border border-white/80 rounded-2xl p-5 text-center shadow-sm">
                    <div className="text-3xl font-black text-gray-900 tracking-tight">{result.stats.lessons}</div>
                    <div className="text-[12px] font-bold uppercase tracking-wider text-gray-400 mt-1">Lessons Linked</div>
                  </div>
                </div>

                {/* Go To Course Action */}
                <button
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[14px] font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-[0.99]"
                  onClick={() => router.push(`/course/${result.course.id}`)}
                  id="go-to-course-btn"
                >
                  <FolderOpen size={16} /> Go to Course
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}