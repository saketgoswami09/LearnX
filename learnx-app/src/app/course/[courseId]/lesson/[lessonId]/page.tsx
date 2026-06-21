'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Play, Pause, Maximize,
  Volume2, Bookmark, CheckCircle2, Circle, ListVideo, FileText, AlertTriangle, Loader2, Plus
} from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { getLesson, getCourse, saveProgress, createBookmark, getMediaUrl } from '@/lib/service';

export default function LessonPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const [lesson, setLesson] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const revokeRef = useRef<(() => void) | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<'playlist' | 'notes'>('playlist');

  // ── Load lesson + course ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMediaError(null);
      setIsPlaying(false);

      // Revoke previous object URL
      if (revokeRef.current) {
        revokeRef.current();
        revokeRef.current = null;
        setMediaUrl(null);
      }

      // Destroy mpegts player if active
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      const [c, l] = await Promise.all([
        getCourse(params.courseId as string),
        getLesson(params.lessonId as string),
      ]);

      if (cancelled) return;

      if (!l || !c) {
        router.push('/library');
        return;
      }

      setCourse(c);
      setLesson(l);
      setLoading(false);

      // Resolve media URL from IndexedDB FileSystemFileHandle
      if (l.type === 'video' || l.type === 'pdf') {
        const result = await getMediaUrl(l.id);
        if (cancelled) return;

        if (!result) {
          setMediaError(
            'File handle not available. The file may have been moved or permissions were denied. ' +
            'Please re-import the course folder.'
          );
          return;
        }

        revokeRef.current = result.revoke;
        setMediaUrl(result.url);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (revokeRef.current) {
        revokeRef.current();
        revokeRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.courseId, params.lessonId]);

  // Set video src when mediaUrl changes
  useEffect(() => {
    if (!mediaUrl || !videoRef.current || lesson?.type !== 'video') return;

    const isTsFile = lesson.file_path?.toLowerCase().endsWith('.ts');

    if (isTsFile) {
      // Use mpegts.js for .ts files if available
      import('mpegts.js').then((mpegts) => {
        if (mpegts.default.getFeatureList().mseLivePlayback && videoRef.current) {
          if (playerRef.current) playerRef.current.destroy();
          const player = mpegts.default.createPlayer({
            type: 'mse',
            isLive: false,
            url: mediaUrl,
          });
          player.attachMediaElement(videoRef.current);
          player.load();
          playerRef.current = player;
          if (lesson.position > 0) {
            videoRef.current.currentTime = lesson.position;
          }
        } else if (videoRef.current) {
          videoRef.current.src = mediaUrl;
          if (lesson.position > 0) videoRef.current.currentTime = lesson.position;
        }
      }).catch(() => {
        if (videoRef.current) {
          videoRef.current.src = mediaUrl;
          if (lesson.position > 0) videoRef.current.currentTime = lesson.position;
        }
      });
    } else {
      videoRef.current.src = mediaUrl;
      if (lesson.position > 0) videoRef.current.currentTime = lesson.position;
    }
  }, [mediaUrl, lesson]);

  // ── Progress sync every 5 s ───────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (!videoRef.current) return;
      saveProgress({
        lesson_id: params.lessonId as string,
        position: Math.floor(videoRef.current.currentTime),
        watch_time: 5,
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, params.lessonId]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setProgress(videoRef.current.currentTime);
      setDuration(videoRef.current.duration);
    }
  };

  const markComplete = async () => {
    const isCompleted = !lesson.completed;
    await saveProgress({ lesson_id: params.lessonId as string, completed: isCompleted });
    setLesson({ ...lesson, completed: isCompleted ? 1 : 0 });
  };

  const addBookmark = async () => {
    if (!videoRef.current) return;
    await createBookmark({
      lesson_id: params.lessonId as string,
      timestamp: Math.floor(videoRef.current.currentTime),
      label: `Bookmark at ${formatDuration(progress)}`,
    });
  };

  const { prevLesson, nextLesson } = useMemo(() => {
    if (!course || !course.modules) return { prevLesson: null, nextLesson: null };
    const flatLessons = course.modules.flatMap((m: any) => m.lessons || []);
    const currentIndex = flatLessons.findIndex((l: any) => l.id === params.lessonId);
    return {
      prevLesson: currentIndex > 0 ? flatLessons[currentIndex - 1] : null,
      nextLesson: currentIndex >= 0 && currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null,
    };
  }, [course, params.lessonId]);

  if (loading || !lesson) return (
    <div className="w-full h-[calc(100vh-100px)] p-6 animate-pulse">
      <div className="h-full bg-gray-100 rounded-3xl w-full" />
    </div>
  );

  const themeColor = course?.color || '#4f46e5';

  return (
    <div className="max-w-[1600px] mx-auto w-full h-[calc(100vh-100px)] p-6 md:p-8 animate-in fade-in duration-500 font-sans">

      {/* ── LAYOUT GRID: Fixed grid blowout issue here ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 h-full">

        {/* ── LEFT AREA: PLAYER (min-w-0 prevents grid blowout) ── */}
        <div className="flex flex-col min-w-0 h-full">

          {/* Top Actions */}
          <div className="flex items-center justify-between mb-5 shrink-0">
            <Link
              href={`/course/${params.courseId}`}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-900 transition-colors group focus:outline-none"
            >
              <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
              Back to {course?.title}
            </Link>

            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-[13px] font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!prevLesson}
                onClick={() => prevLesson && router.push(`/course/${course.id}/lesson/${prevLesson.id}`)}
              >
                <ChevronLeft size={16} className="-ml-1" /> Previous
              </button>
              <button
                className="flex items-center gap-1.5 px-4 py-2 text-white text-[13px] font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                style={{ backgroundColor: themeColor }}
                disabled={!nextLesson}
                onClick={() => nextLesson && router.push(`/course/${course.id}/lesson/${nextLesson.id}`)}
              >
                Next <ChevronRight size={16} className="-mr-1" />
              </button>
            </div>
          </div>

          {/* Video Container (aspect-video locks perfect 16:9 ratio) */}
          <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden relative shadow-lg ring-1 ring-gray-900/5 group flex shrink-0">
            {lesson.type === 'video' ? (
              <>
                {mediaError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gray-900/90 text-white">
                    <AlertTriangle size={48} className="text-red-500 mb-4 opacity-80" />
                    <div className="text-lg font-bold mb-2">Cannot access file</div>
                    <div className="text-[13px] text-gray-300 max-w-md leading-relaxed mb-6">{mediaError}</div>
                    <Link
                      href="/import"
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-md"
                    >
                      Re-import Folder
                    </Link>
                  </div>
                ) : !mediaUrl ? (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 gap-3">
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-sm font-medium">Loading local media...</span>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-contain bg-black cursor-pointer"
                    onTimeUpdate={handleTimeUpdate}
                    onClick={togglePlay}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => markComplete()}
                  />
                )}

                {/* Custom Video Controls overlay */}
                {mediaUrl && !mediaError && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5 pt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center gap-4 mb-2">
                      <button
                        onClick={togglePlay}
                        className="text-white hover:text-indigo-400 hover:scale-110 transition-all focus:outline-none"
                      >
                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                      </button>

                      <div className="text-white text-[12px] font-medium font-mono tabular-nums">
                        {formatDuration(progress)} <span className="text-gray-500 mx-1">/</span> {formatDuration(duration || lesson.duration)}
                      </div>

                      <div
                        className="flex-1 h-1.5 bg-white/20 rounded-full relative cursor-pointer group/bar"
                        onClick={(e) => {
                          if (!videoRef.current || !duration) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pct = (e.clientX - rect.left) / rect.width;
                          videoRef.current.currentTime = pct * duration;
                        }}
                      >
                        {/* Hover seeker thumb */}
                        <div className="absolute top-1/2 -translate-y-1/2 -ml-2 w-4 h-4 bg-white rounded-full shadow opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none" style={{ left: `${(progress / (duration || 1)) * 100}%` }} />
                        <div
                          className="h-full rounded-full pointer-events-none"
                          style={{ width: `${(progress / (duration || 1)) * 100}%`, backgroundColor: themeColor }}
                        />
                      </div>

                      <button className="text-white hover:text-indigo-400 transition-colors focus:outline-none">
                        <Volume2 size={20} />
                      </button>
                      <button
                        className="text-white hover:text-indigo-400 transition-colors focus:outline-none"
                        onClick={() => videoRef.current?.requestFullscreen()}
                      >
                        <Maximize size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : lesson.type === 'pdf' ? (
              mediaUrl ? (
                <iframe
                  src={mediaUrl}
                  className="w-full h-full border-none bg-white"
                  title={lesson.title}
                />
              ) : mediaError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gray-50 text-gray-900">
                  <AlertTriangle size={48} className="text-red-500 mb-4 opacity-80" />
                  <div className="text-sm font-medium text-red-600">{mediaError}</div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 gap-3 bg-white">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-sm font-medium">Loading Document...</span>
                </div>
              )
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-900">
                <p className="text-sm font-medium text-white/50">Viewer for {lesson.type} not implemented yet.</p>
              </div>
            )}
          </div>

          {/* Lesson Metadata & Actions */}
          <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight mb-1">{lesson.title}</h1>
              <p className="text-[13.5px] font-medium text-gray-500">Module content</p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-[13px] font-semibold rounded-xl transition-all shadow-sm"
                onClick={addBookmark}
              >
                <Bookmark size={16} /> Bookmark
              </button>

              <button
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-semibold rounded-xl transition-all shadow-sm active:scale-95 border ${lesson.completed
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                onClick={markComplete}
              >
                {lesson.completed ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Circle size={16} className="text-gray-400" />}
                {lesson.completed ? 'Completed' : 'Mark Complete'}
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT AREA: PLAYLIST / NOTES SIDEBAR ── */}
        <div className="bg-white border border-gray-100 rounded-2xl flex flex-col h-full shadow-sm overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-gray-100 bg-gray-50/50 p-1.5 shrink-0">
            {(['playlist', 'notes'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-[13px] font-semibold rounded-xl transition-all ${activeTab === tab
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200/60'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 border border-transparent'
                  }`}
              >
                {tab === 'playlist' ? <><ListVideo size={15} /> Playlist</> : <><FileText size={15} /> Notes</>}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            {activeTab === 'playlist' && (
              <div className="flex flex-col pb-4">
                {course?.modules?.map((mod: any) => (
                  <div key={mod.id}>
                    {/* Module Header */}
                    <div className="sticky top-0 z-10 px-4 py-3 bg-gray-50/95 backdrop-blur-sm border-b border-gray-100/80">
                      <span className="text-[12px] font-bold text-gray-500 uppercase tracking-widest">{mod.title}</span>
                    </div>

                    {/* Lessons */}
                    <div className="divide-y divide-gray-50">
                      {mod.lessons?.map((l: any) => {
                        const isCurrent = l.id === params.lessonId;
                        return (
                          <Link
                            key={l.id}
                            href={`/course/${course.id}/lesson/${l.id}`}
                            className={`flex items-start gap-3 px-4 py-3.5 transition-colors group focus:outline-none ${isCurrent ? 'bg-indigo-50/50' : 'hover:bg-gray-50'
                              }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {l.completed ? (
                                <CheckCircle2 size={16} className="text-emerald-500" />
                              ) : (
                                <Circle size={16} className={`transition-colors ${isCurrent ? 'text-indigo-400' : 'text-gray-300 group-hover:text-gray-400'}`} />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className={`text-[13px] leading-snug line-clamp-2 transition-colors ${isCurrent ? 'font-bold text-indigo-700' : 'font-medium text-gray-700 group-hover:text-gray-900'
                                }`}>
                                {l.title}
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 text-[11px] font-medium text-gray-400">
                                <span className="flex items-center gap-1 uppercase tracking-wider">
                                  {l.type === 'video' ? <Play size={10} className="fill-current" /> : <FileText size={10} />}
                                </span>
                                {l.duration > 0 && <span>{formatDuration(l.duration)}</span>}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="p-6 text-center flex flex-col items-center justify-center h-full">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100">
                  <FileText size={28} className="text-gray-300" />
                </div>
                <h3 className="text-[15px] font-bold text-gray-900 mb-2">Capture your thoughts</h3>
                <p className="text-[13px] text-gray-500 max-w-[240px] leading-relaxed mb-6">
                  Take notes linked to the current video timestamp for easy review later.
                </p>

                <button
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-[13px] font-semibold rounded-xl transition-all shadow-sm"
                  onClick={async () => {
                    const content = prompt(`Note at ${formatDuration(progress)}:`);
                    if (!content) return;
                    const { createNote } = await import('@/lib/service');
                    await createNote({
                      lesson_id: params.lessonId as string,
                      course_id: params.courseId as string,
                      content,
                      timestamp_ref: Math.floor(progress),
                    });
                  }}
                >
                  <Plus size={16} /> Add Note at {formatDuration(progress)}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}