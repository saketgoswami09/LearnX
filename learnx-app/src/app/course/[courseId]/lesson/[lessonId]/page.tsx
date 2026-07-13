'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle, Bookmark, BookmarkCheck, CheckCircle2, ChevronDown, ChevronLeft,
  ChevronRight, Circle, Clock, Download, FileText, ListVideo, Loader2, Maximize,
  Pause, Play, Plus, RefreshCw, Sparkles, PlaySquare, X,
} from 'lucide-react';
import { formatDuration, timeAgo } from '@/lib/utils';
import { createBookmark, getCourse, getLesson, getMediaUrl, saveProgress } from '@/lib/service';
import { buildEmbedUrl, extractVideoId, formatTimecode, getOrFetchTimestamps, saveManualTimestamps, clearTimestampCache } from '@/lib/youtube';
import type { YouTubeTimestamp } from '@/types';
import { dbGet, STORES } from '@/lib/idb';
import { motion } from 'framer-motion';

export default function LessonPlayerPage() {
  const params  = useParams();
  const router  = useRouter();

  const [lesson,     setLesson]     = useState<any>(null);
  const [course,     setCourse]     = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaUrl,   setMediaUrl]   = useState<string | null>(null);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [bookmarked,    setBookmarked]    = useState(false);
  const [activeTab,     setActiveTab]     = useState<'playlist' | 'notes' | 'timestamps'>('playlist');
  const [showMini,      setShowMini]      = useState(false);
  const [openSection,   setOpenSection]   = useState<string | null>(null);

  const [timestamps,    setTimestamps]    = useState<YouTubeTimestamp[]>([]);
  const [tsLoading,     setTsLoading]     = useState(false);
  const [tsSource,      setTsSource]      = useState<string | null>(null);
  const [ytReady,       setYtReady]       = useState(false);
  const [ytProgress,    setYtProgress]    = useState(0);
  const [ytDuration,    setYtDuration]    = useState(0);
  const [ytPlaying,     setYtPlaying]     = useState(false);
  const [geminiKey,     setGeminiKey]     = useState<string | null>(null);
  const [aiGenerating,  setAiGenerating]  = useState(false);

  const revokeRef       = useRef<(() => void) | null>(null);
  const videoRef        = useRef<HTMLVideoElement>(null);
  const playerRef       = useRef<any>(null);
  const ytPlayerRef     = useRef<any>(null);
  const ytIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoSectionRef = useRef<HTMLElement>(null);

  /* ── Load lesson + course ─────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setMediaError(null); setIsPlaying(false); setProgress(0);
      if (revokeRef.current) { revokeRef.current(); revokeRef.current = null; setMediaUrl(null); }
      if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null; }
      try {
        const [nextCourse, nextLesson] = await Promise.all([
          getCourse(params.courseId as string),
          getLesson(params.lessonId as string),
        ]);
        if (cancelled) return;
        if (!nextCourse || !nextLesson) { router.push('/library'); return; }
        setCourse(nextCourse);
        setLesson(nextLesson);
        setProgress(nextLesson.position || 0);
        if (nextLesson.type === 'video' || nextLesson.type === 'pdf') {
          const result = await getMediaUrl(nextLesson.id);
          if (cancelled) return;
          if (!result) {
            setMediaError('The local file is unavailable. It may have been moved or access may have expired. Re-import the folder to restore it.');
            setInitialLoading(false);
            return;
          }
          revokeRef.current = result.revoke;
          setMediaUrl(result.url);
        }
        setInitialLoading(false);
      } catch {
        if (!cancelled) { setMediaError('This lesson could not be loaded.'); setInitialLoading(false); }
      }
    };
    load();
    return () => {
      cancelled = true;
      if (revokeRef.current) { revokeRef.current(); revokeRef.current = null; }
      if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null; }
    };
  }, [params.courseId, params.lessonId, router]);

  /* ── mpegts / native video source ────────────────────── */
  useEffect(() => {
    if (!mediaUrl || !videoRef.current || lesson?.type !== 'video') return;
    const isTsFile   = lesson.file_path?.toLowerCase().endsWith('.ts');
    const setNative  = () => {
      if (!videoRef.current) return;
      videoRef.current.src = mediaUrl;
      if (lesson.position > 0) videoRef.current.currentTime = lesson.position;
    };
    if (isTsFile) {
      import('mpegts.js').then(mpegts => {
        if (mpegts.default.getFeatureList().mseLivePlayback && videoRef.current) {
          if (playerRef.current) playerRef.current.destroy();
          const player = mpegts.default.createPlayer({ type: 'mse', isLive: false, url: mediaUrl });
          player.attachMediaElement(videoRef.current); player.load(); playerRef.current = player;
          if (lesson.position > 0) videoRef.current.currentTime = lesson.position;
        } else setNative();
      }).catch(setNative);
    } else setNative();
  }, [mediaUrl, lesson]);

  /* ── Auto-save progress every 5 s ────────────────────── */
  useEffect(() => {
    if (!isPlaying) return;
    const iv = window.setInterval(() => {
      if (videoRef.current)
        void saveProgress({ lesson_id: params.lessonId as string, position: Math.floor(videoRef.current.currentTime), watch_time: 5 });
    }, 5000);
    return () => window.clearInterval(iv);
  }, [isPlaying, params.lessonId]);

  /* ── Floating mini player (IntersectionObserver) ─────── */
  useEffect(() => {
    if (!videoSectionRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowMini(!entry.isIntersecting),
      { threshold: 0.15 },
    );
    obs.observe(videoSectionRef.current);
    return () => obs.disconnect();
  }, [initialLoading]);

  /* ── YouTube Initialization ───────────────────────────── */
  const initYoutubePlayer = useCallback(() => {
    if (!lesson?.file_path || lesson.type !== 'youtube') return;
    if (ytPlayerRef.current || !window.YT) return;
    
    ytPlayerRef.current = new window.YT.Player('yt-player-container', {
      videoId: lesson.file_path,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        rel: 0,
        modestbranding: 1,
        start: lesson.position > 0 ? Math.floor(lesson.position) : 0,
      },
      events: {
        onReady: (e: any) => {
          setYtReady(true);
          setYtDuration(e.target.getDuration());
        },
        onStateChange: (e: any) => {
          setYtPlaying(e.data === window.YT.PlayerState.PLAYING);
          if (e.data === window.YT.PlayerState.ENDED) markComplete();
        },
      }
    });
  }, [lesson]);

  useEffect(() => {
    if (lesson?.type !== 'youtube') return;
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = initYoutubePlayer;
    } else {
      initYoutubePlayer();
    }
  }, [lesson, initYoutubePlayer]);

  useEffect(() => {
    if (ytPlaying) {
      ytIntervalRef.current = setInterval(() => {
        if (ytPlayerRef.current?.getCurrentTime) {
          const t = ytPlayerRef.current.getCurrentTime();
          setYtProgress(t);
          setProgress(t);
        }
      }, 1000);
    } else if (ytIntervalRef.current) {
      clearInterval(ytIntervalRef.current);
    }
    return () => { if (ytIntervalRef.current) clearInterval(ytIntervalRef.current); };
  }, [ytPlaying]);

  /* ── Fetch Timestamps & Gemini Key ────────────────────── */
  useEffect(() => {
    if (lesson?.type !== 'youtube' || !lesson.file_path) return;
    let active = true;

    const loadTS = async () => {
      setTsLoading(true);
      const keyRec = await dbGet<{ value: string }>(STORES.settings, 'gemini_api_key');
      if (active && keyRec?.value) setGeminiKey(keyRec.value);

      const res = await getOrFetchTimestamps(lesson.id, lesson.file_path, lesson.description || '', keyRec?.value || null);
      if (!active) return;
      if (res.status === 'ok') {
        setTimestamps(res.timestamps);
        setTsSource(res.source);
      }
      setTsLoading(false);
    };
    loadTS();

    return () => { active = false; };
  }, [lesson]);

  /* ── Helpers ──────────────────────────────────────────── */
  const togglePlay = () => {
    if (lesson?.type === 'youtube' && ytPlayerRef.current) {
      if (ytPlaying) ytPlayerRef.current.pauseVideo();
      else ytPlayerRef.current.playVideo();
      return;
    }
    if (!videoRef.current) return;
    if (videoRef.current.paused) void videoRef.current.play().catch(() => setIsPlaying(false));
    else videoRef.current.pause();
  };
  const handleTimeUpdate = () => {
    if (videoRef.current) { setProgress(videoRef.current.currentTime); setDuration(videoRef.current.duration); }
  };

  const handleGenerateAI = async () => {
    if (!geminiKey) {
      alert('Please add your Gemini API key in Settings first.');
      router.push('/settings');
      return;
    }
    if (!lesson?.file_path) return;
    
    setAiGenerating(true);
    try {
      const { fetchTranscript, compressTranscript, fetchYTMeta, segmentWithGemini } = await import('@/lib/youtube');
      const transcript = await fetchTranscript(lesson.file_path);
      if (!transcript) {
        alert('Could not find english captions for this video.');
        setAiGenerating(false);
        return;
      }
      
      const compressed = compressTranscript(transcript);
      const meta = await fetchYTMeta(lesson.file_path);
      const ai = await segmentWithGemini(compressed, meta?.title ?? 'Video', geminiKey);
      
      if (ai && ai.length > 0) {
        await dbPut(STORES.ytTimestamps, {
          lesson_id: lesson.id, video_id: lesson.file_path,
          timestamps: ai, source: 'ai', cached_at: Date.now(),
        });
        setTimestamps(ai);
        setTsSource('ai');
        // Now it's integrated into the playlist, no need to switch tabs
      } else {
        alert('Failed to generate topics from AI. No timestamps returned.');
      }
    } catch (e: any) {
      alert(`An error occurred: ${e.message}`);
    }
    setAiGenerating(false);
  };
  const markComplete = async () => {
    const next = !lesson.completed;
    await saveProgress({ lesson_id: params.lessonId as string, completed: next });
    setLesson({ ...lesson, completed: next ? 1 : 0 });
  };
  const addBookmark = async () => {
    if (!videoRef.current) return;
    await createBookmark({ lesson_id: params.lessonId as string, timestamp: Math.floor(videoRef.current.currentTime), label: `Bookmark at ${formatDuration(progress)}` });
    setBookmarked(true);
    window.setTimeout(() => setBookmarked(false), 2000);
  };

  /* ── Derived nav data ─────────────────────────────────── */
  const { allLessons, lessonIndex, prevLesson, nextLesson, moduleTitle, completedCount } = useMemo(() => {
    if (!course?.modules) return { allLessons: [], lessonIndex: -1, prevLesson: null, nextLesson: null, moduleTitle: '', completedCount: 0 };
    const all   = course.modules.flatMap((m: any) => m.lessons || []);
    const idx   = all.findIndex((l: any) => l.id === params.lessonId);
    const mod   = course.modules.find((m: any) => m.lessons?.some((l: any) => l.id === params.lessonId));
    const done  = all.filter((l: any) => l.completed).length;
    return {
      allLessons:     all,
      lessonIndex:    idx,
      prevLesson:     idx > 0 ? all[idx - 1] : null,
      nextLesson:     idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null,
      moduleTitle:    mod?.title ?? '',
      completedCount: done,
    };
  }, [course, params.lessonId]);

  /* ── Skeleton ─────────────────────────────────────────── */
  if (initialLoading || !course || !lesson) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-60 rounded-lg" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <div className="skeleton rounded-xl" style={{ aspectRatio: '16/9', maxHeight: '56vh' }} />
            <div className="skeleton h-24 rounded-xl" />
          </div>
          <div className="skeleton min-h-[420px] rounded-xl" />
        </div>
      </div>
    );
  }

  const themeColor  = course?.color || '#2563a6';
  const totalCount  = allLessons.length;
  const progressPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const isVideo     = lesson.type === 'video';
  const lastWatched = lesson.position > 0 ? timeAgo(lesson.updated_at ?? Date.now() / 1000) : null;

  return (
    <div className="space-y-4 fade-in-up">

      {/* ── Breadcrumb + Prev/Next ─────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

        {/* Rich breadcrumb */}
        <Link
          href={`/course/${params.courseId}`}
          className="group flex items-center gap-2 rounded-lg px-2 py-1 -ml-2 text-[#667085] transition-colors hover:bg-[#f1f3f6] hover:text-[#344054]"
        >
          <ChevronLeft size={16} className="shrink-0 transition-transform group-hover:-translate-x-0.5" />
          <span>
            <span className="block text-[13px] font-semibold text-[#344054]">{course?.title}</span>
            {moduleTitle && (
              <span className="block text-[11px] text-[#98a2b3]">
                {moduleTitle}
                {lessonIndex >= 0 && totalCount > 0 && ` · Lesson ${lessonIndex + 1} of ${totalCount}`}
              </span>
            )}
          </span>
        </Link>

        {/* Prev / Next with lesson names */}
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={!prevLesson}
            onClick={() => prevLesson && router.push(`/course/${course.id}/lesson/${prevLesson.id}`)}
            className="ui-btn ui-btn-secondary min-h-9 px-3 text-[12px] disabled:cursor-not-allowed disabled:opacity-40"
            title={prevLesson?.title}
          >
            <ChevronLeft size={15} />
            <span className="hidden sm:inline">
              {prevLesson ? <span className="max-w-[120px] truncate block">{prevLesson.title}</span> : 'Previous'}
            </span>
          </button>
          <button
            type="button"
            disabled={!nextLesson}
            onClick={() => nextLesson && router.push(`/course/${course.id}/lesson/${nextLesson.id}`)}
            className="ui-btn min-h-9 px-3 text-[12px] text-white disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: themeColor, borderColor: themeColor, border: '1px solid' }}
            title={nextLesson?.title}
          >
            <span className="hidden sm:inline">
              {nextLesson ? <span className="max-w-[120px] truncate block">{nextLesson.title}</span> : 'Next'}
            </span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* ── Two-column grid ───────────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">

        {/* LEFT — Player + info */}
        <div className="min-w-0 space-y-4">

          {/* Video / PDF player — shadow-lg, tighter radius */}
          <section
            ref={videoSectionRef}
            className="overflow-hidden rounded-[10px] border border-[#1f2937] bg-[#101828] shadow-[0_8px_28px_rgb(0_0_0/18%),0_2px_6px_rgb(0_0_0/12%)]"
          >
            <div className="group relative w-full" style={{ aspectRatio: '16/9', maxHeight: '56vh' }}>
              {/* ── YouTube Player ── */}
              {lesson.type === 'youtube' && (
                <div className="absolute inset-0 size-full bg-black">
                  <div id="yt-player-container" className="size-full" />
                  
                  {/* Custom Controls Overlay for YT */}
                  {ytReady && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-3.5 pt-12 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-auto">
                      {/* seek bar */}
                      <button
                        type="button"
                        aria-label="Seek"
                        className="relative mb-2.5 h-1 w-full overflow-hidden rounded-full bg-white/20 hover:h-1.5 transition-all"
                        onClick={e => {
                          if (!ytPlayerRef.current || !ytDuration) return;
                          const r = e.currentTarget.getBoundingClientRect();
                          const targetTime = ((e.clientX - r.left) / r.width) * ytDuration;
                          ytPlayerRef.current.seekTo(targetTime, true);
                        }}
                      >
                        <span
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ width: `${(ytProgress / (ytDuration || 1)) * 100}%`, backgroundColor: themeColor }}
                        />
                      </button>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={togglePlay} className="rounded p-1 text-white hover:bg-white/15" aria-label={ytPlaying ? 'Pause' : 'Play'}>
                          {ytPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
                        </button>
                        <span className="font-mono text-[11px] tabular-nums text-white">
                          {formatTimecode(ytProgress)} <span className="text-slate-400">/</span> {formatTimecode(ytDuration)}
                        </span>
                        <span className="flex-1" />
                        <button type="button" onClick={() => videoSectionRef.current?.requestFullscreen()} className="rounded p-1 text-white hover:bg-white/15" aria-label="Fullscreen">
                          <Maximize size={17} />
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Invisible overlay for capturing clicks if we want to toggle play */}
                  <div className="absolute inset-x-0 top-0 bottom-16 cursor-pointer" onClick={togglePlay} />
                </div>
              )}

              {/* ── Video ── */}
              {isVideo && (
                <>
                  {mediaError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-white">
                      <AlertTriangle size={30} className="mb-3 text-[#fda29b]" />
                      <h1 className="text-[15px] font-bold">Cannot access this video</h1>
                      <p className="mt-2 max-w-md text-[12px] leading-5 text-slate-300">{mediaError}</p>
                      <Link href="/import" className="ui-btn ui-btn-secondary mt-5">Re-import folder</Link>
                    </div>
                  ) : !mediaUrl ? (
                    <div className="absolute inset-0 flex items-center justify-center gap-3 text-slate-400">
                      <Loader2 size={18} className="animate-spin" />
                      <span className="text-[13px]">Loading local media…</span>
                    </div>
                  ) : (
                    <video
                      ref={videoRef}
                      className="absolute inset-0 size-full cursor-pointer bg-black object-contain"
                      onTimeUpdate={handleTimeUpdate}
                      onClick={togglePlay}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => void markComplete()}
                    />
                  )}

                  {/* Custom controls */}
                  {mediaUrl && !mediaError && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-3.5 pt-12 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      {/* seek bar */}
                      <button
                        type="button"
                        aria-label="Seek"
                        className="relative mb-2.5 h-1 w-full overflow-hidden rounded-full bg-white/20 hover:h-1.5 transition-all"
                        onClick={e => {
                          if (!videoRef.current || !duration) return;
                          const r = e.currentTarget.getBoundingClientRect();
                          videoRef.current.currentTime = ((e.clientX - r.left) / r.width) * duration;
                        }}
                      >
                        <span
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ width: `${(progress / (duration || 1)) * 100}%`, backgroundColor: themeColor }}
                        />
                      </button>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={togglePlay} className="rounded p-1 text-white hover:bg-white/15" aria-label={isPlaying ? 'Pause' : 'Play'}>
                          {isPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
                        </button>
                        <span className="font-mono text-[11px] tabular-nums text-white">
                          {formatDuration(progress)} <span className="text-slate-400">/</span> {formatDuration(duration || lesson.duration)}
                        </span>
                        <span className="flex-1" />
                        <button type="button" onClick={() => videoRef.current?.requestFullscreen()} className="rounded p-1 text-white hover:bg-white/15" aria-label="Fullscreen">
                          <Maximize size={17} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── PDF ── */}
              {lesson.type === 'pdf' && (
                mediaUrl
                  ? <iframe src={mediaUrl} className="absolute inset-0 size-full border-0 bg-white" title={lesson.title} />
                  : <div className="absolute inset-0 flex items-center justify-center gap-3 bg-white text-[#667085]">
                      {mediaError
                        ? <><AlertTriangle size={18} className="text-[#b42318]" /><span className="text-[13px]">{mediaError}</span></>
                        : <><Loader2 size={18} className="animate-spin" /><span className="text-[13px]">Loading document…</span></>
                      }
                    </div>
              )}

              {/* ── Other ── */}
              {lesson.type !== 'video' && lesson.type !== 'pdf' && lesson.type !== 'youtube' && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 pointer-events-none">
                  <p className="text-[13px]">Viewer for {lesson.type} files is not yet available.</p>
                </div>
              )}
            </div>
          </section>

          {/* ── AI Analysis Prompt (YouTube Only) ── */}
          {lesson.type === 'youtube' && tsSource !== 'ai' && (
            <div className="flex items-center justify-between rounded-[10px] border border-[#e0f0ff] bg-[#f0f8ff] px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-[#dbeafe] text-[#2563a6]">
                  <Sparkles size={18} />
                </span>
                <div>
                  <p className="text-[13px] font-bold text-[#1d4f86]">Analyze video structure with AI</p>
                  <p className="mt-0.5 text-[12px] text-[#2563a6] opacity-80">Automatically generate intelligent topic chapters using Gemini Flash.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={aiGenerating}
                className="ui-btn ui-btn-accent min-h-9 px-4 text-[12px] shadow-sm whitespace-nowrap"
              >
                {aiGenerating ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Sparkles size={14} className="mr-1.5" />}
                {aiGenerating ? 'Analyzing...' : 'Analyze video'}
              </button>
            </div>
          )}

          {/* ── Course progress — border-only strip, no white card ── */}
          {totalCount > 0 && (
            <div className="rounded-[10px] border border-[var(--line)] px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-[#667085]">Course progress</span>
                <span className="text-[11px] font-bold text-[#344054]">{progressPct}% · {completedCount} / {totalCount} lessons</span>
              </div>
              <div className="ui-progress">
                <span style={{ width: `${progressPct}%`, backgroundColor: themeColor }} />
              </div>
            </div>
          )}

          {/* ── Lesson info + action bar — subtle #FCFCFD bg ── */}
          <div className="rounded-[10px] border border-[var(--line)] px-5 py-4" style={{ background: '#FCFCFD' }}>
            {/* Course / module labels */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#eaf2fb] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[.07em] text-[#1d4f86]">
                {course?.title}
              </span>
              {moduleTitle && (
                <span className="rounded-full bg-[#f1f3f6] px-2.5 py-0.5 text-[10px] font-semibold text-[#667085]">
                  {moduleTitle}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-[20px] font-bold tracking-[-.03em] text-[#182230] sm:text-[24px]">
              {lesson.title}
            </h1>

            {/* Metadata row */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#98a2b3]">
              {lesson.duration > 0 && <span>{formatDuration(lesson.duration)}</span>}
              {totalCount > 0 && lessonIndex >= 0 && (
                <><span>·</span><span>Lesson {lessonIndex + 1} of {totalCount}</span></>
              )}
              {lesson.type && <><span>·</span><span className="capitalize">{lesson.type}</span></>}
              {lastWatched && <><span>·</span><span>Last watched {lastWatched}</span></>}
            </div>

            {/* Action bar */}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
              <button
                type="button"
                onClick={() => void addBookmark()}
                disabled={!isVideo}
                className={`ui-btn ui-btn-secondary min-h-9 px-3 text-[12px] ${bookmarked ? 'border-[#f59e0b] bg-[#fffbeb] text-[#92400e]' : ''}`}
              >
                {bookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                {bookmarked ? 'Bookmarked' : 'Bookmark'}
              </button>

              <button
                type="button"
                onClick={() => void markComplete()}
                className={`ui-btn min-h-9 px-3 text-[12px] ${
                  lesson.completed
                    ? 'border border-[#b7e2cd] bg-[#edf7f1] text-[#167a55] hover:bg-[#dff3e8]'
                    : 'ui-btn-secondary'
                }`}
              >
                {lesson.completed ? (
                  <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
                    <CheckCircle2 size={15} />
                  </motion.div>
                ) : (
                  <Circle size={15} />
                )}
                {lesson.completed ? 'Completed' : 'Mark complete'}
              </button>

              <button
                type="button"
                onClick={async () => {
                  const content = window.prompt(`Note at ${formatDuration(progress)}:`);
                  if (!content) return;
                  const { createNote } = await import('@/lib/service');
                  await createNote({ lesson_id: params.lessonId as string, course_id: params.courseId as string, content, timestamp_ref: Math.floor(progress) });
                }}
                className="ui-btn ui-btn-secondary min-h-9 px-3 text-[12px]"
              >
                <Plus size={15} /> Add note
              </button>
            </div>

            {/* ── Collapsed accordion sections ─────────────── */}
            <div className="mt-4 divide-y divide-[var(--line)] border-t border-[var(--line)]">
              {([
                { key: 'description', label: 'Description', icon: FileText,  content: lesson.description || 'No description provided for this lesson.' },
                { key: 'resources',   label: 'Resources',   icon: Download,  content: null },
                { key: 'downloads',   label: 'Downloads',   icon: Download,  content: null },
              ] as const).map(({ key, label, icon: Icon, content }) => (
                <div key={key}>
                  <button
                    type="button"
                    onClick={() => setOpenSection(prev => prev === key ? null : key)}
                    className="flex w-full items-center justify-between py-3 text-left"
                  >
                    <span className="flex items-center gap-2 text-[13px] font-semibold text-[#344054]">
                      <Icon size={14} className="text-[#98a2b3]" /> {label}
                    </span>
                    <ChevronDown
                      size={15}
                      className={`text-[#98a2b3] transition-transform duration-200 ${openSection === key ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {openSection === key && (
                    <div className="pb-4 text-[13px] leading-6 text-[#667085]">
                      {content ?? <span className="text-[#98a2b3] italic">Nothing here yet.</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Playlist / Notes sidebar */}
        <aside className="ui-card flex min-h-[420px] flex-col overflow-hidden">

          {/* Tab bar */}
          <div className="flex gap-1 border-b border-[var(--line)] bg-[#fafbfc] p-1.5">
            {([ ['playlist', ListVideo, 'Playlist', totalCount > 0 ? String(totalCount) : ''],
                ['notes',    FileText,  'Notes',    ''],
            ] as const).map(([tab, Icon, label, badge]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[7px] px-3 py-2 text-[12px] font-semibold transition-colors ${
                  activeTab === tab ? 'bg-white text-[#344054] shadow-sm' : 'text-[#667085] hover:text-[#344054]'
                }`}
              >
                <Icon size={14} />
                {label}
                {badge && (
                  <span className="rounded-full bg-[#e7e9ee] px-1.5 py-0.5 text-[10px] font-bold text-[#667085]">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">

            {/* ── Playlist tab ── */}
            {activeTab === 'playlist' && (
              <div>
                {course?.modules?.map((module: any) => (
                  <section key={module.id}>
                    <header className="sticky top-0 z-10 border-b border-[#edf0f3] bg-[#fafbfc] px-4 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#667085]">{module.title}</p>
                    </header>
                    <div>
                      {module.lessons?.map((item: any) => {
                        const current = item.id === params.lessonId;
                        return (
                          <div key={item.id} className="border-b border-[#edf0f3]">
                            <Link
                              href={`/course/${course.id}/lesson/${item.id}`}
                              className={`relative flex items-start gap-3 px-4 py-3 transition-colors ${
                                current
                                  ? 'bg-white shadow-[0_1px_6px_rgb(16_24_40/6%)]'
                                  : 'hover:bg-[#fafbfc]'
                              }`}
                            >
                              {/* 4px left accent bar for active */}
                              {current && (
                                <motion.span
                                  layoutId="activeLessonIndicator"
                                  className="absolute inset-y-0 left-0 w-[3px] rounded-r-full"
                                  style={{ backgroundColor: themeColor }}
                                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                />
                              )}

                              {/* Icon */}
                              <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                                item.completed
                                  ? 'bg-[#edf7f1] text-[#167a55]'
                                  : current
                                    ? 'text-white'
                                    : 'bg-[#f1f3f6] text-[#98a2b3]'
                              }`}
                                style={current && !item.completed ? { backgroundColor: themeColor } : undefined}
                              >
                                {item.completed ? (
                                  <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
                                    <CheckCircle2 size={13} />
                                  </motion.div>
                                ) : (
                                  <Play size={11} fill="currentColor" />
                                )}
                              </span>

                              {/* Info */}
                              <span className="min-w-0 flex-1">
                                <span className={`block line-clamp-2 text-[12px] leading-5 ${
                                  current ? 'font-bold text-[#1d4f86]' : 'font-semibold text-[#475467]'
                                }`}>
                                  {item.title}
                                </span>
                                <span className="mt-1 flex items-center gap-2 text-[10px] text-[#98a2b3]">
                                  {item.duration > 0 && <span>{formatDuration(item.duration)}</span>}
                                  {item.completed && (
                                    <span className="flex items-center gap-0.5 text-[#167a55]">
                                      <CheckCircle2 size={10} /> Completed
                                    </span>
                                  )}
                                  {current && !item.completed && item.duration > 0 && progress > 0 && (
                                    <span>{formatDuration(progress)} / {formatDuration(item.duration)}</span>
                                  )}
                                </span>
                              </span>
                            </Link>

                            {/* Inject timestamps directly into playlist for the active lesson! */}
                            {current && timestamps.length > 0 && (
                              <div className="bg-[#fcfdff] pl-14 pr-4 py-3 shadow-[inset_0_2px_4px_rgb(0_0_0/2%)] border-t border-[#edf0f3]">
                                <p className="text-[10px] font-bold text-[#667085] mb-2.5 uppercase tracking-wider flex items-center gap-1.5">
                                  <Clock size={11} /> Video Chapters
                                </p>
                                <motion.div 
                                  className="space-y-1.5"
                                  initial="hidden"
                                  animate="show"
                                  variants={{
                                    hidden: { opacity: 0 },
                                    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
                                  }}
                                >
                                  {timestamps.map((ts, i) => {
                                    const isActive = ytProgress >= ts.time && (i === timestamps.length - 1 || ytProgress < timestamps[i + 1].time);
                                    return (
                                      <motion.button
                                        variants={{
                                          hidden: { opacity: 0, x: -10 },
                                          show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
                                        }}
                                        key={ts.time + ts.label}
                                        type="button"
                                        onClick={() => ytPlayerRef.current?.seekTo(ts.time, true)}
                                        className={`flex items-start gap-2.5 w-full text-left rounded p-1 -ml-1 transition-colors ${
                                          isActive ? 'bg-[#f0f8ff] text-[#1d4f86] font-bold' : 'text-[#667085] hover:bg-[#f1f3f6] hover:text-[#344054]'
                                        }`}
                                      >
                                        <span className={`font-mono text-[10px] shrink-0 pt-0.5 ${isActive ? 'text-[#2563a6]' : 'text-[#98a2b3]'}`}>
                                          {formatTimecode(ts.time)}
                                        </span>
                                        <span className="text-[11px] leading-snug">{ts.label}</span>
                                      </motion.button>
                                    );
                                  })}
                                </motion.div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {/* ── Notes tab ── */}
            {activeTab === 'notes' && (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center px-6 text-center">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[#f1f3f6] text-[#667085]">
                  <FileText size={20} />
                </span>
                <h2 className="mt-4 text-[14px] font-bold text-[#344054]">Capture a thought</h2>
                <p className="mt-2 text-[12px] leading-5 text-[#667085]">
                  Create a note linked to this moment in the lesson.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    const content = window.prompt(`Note at ${formatDuration(progress)}:`);
                    if (!content) return;
                    const { createNote } = await import('@/lib/service');
                    await createNote({ lesson_id: params.lessonId as string, course_id: params.courseId as string, content, timestamp_ref: Math.floor(progress) });
                  }}
                  className="ui-btn ui-btn-primary mt-5 w-full"
                >
                  <Plus size={15} /> Add note at {formatDuration(progress)}
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── Floating mini player ─────────────────────────── */}
      {showMini && isVideo && mediaUrl && !mediaError && (
        <div className="fixed bottom-5 right-5 z-50 w-[300px] overflow-hidden rounded-[10px] border border-[#1f2937] bg-[#101828] shadow-[0_12px_40px_rgb(0_0_0/35%)] transition-all">
          <div className="relative" style={{ aspectRatio: '16/9' }}>
            <video
              src={mediaUrl}
              className="size-full object-contain bg-black"
              ref={el => {
                // Mirror currentTime from main player
                if (el && videoRef.current) el.currentTime = videoRef.current.currentTime;
              }}
              muted
              autoPlay={isPlaying}
              style={{ pointerEvents: 'none' }}
            />
            {/* Controls overlay */}
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-2.5 pb-2 pt-6">
              <button
                type="button"
                onClick={togglePlay}
                className="rounded p-1 text-white hover:bg-white/15"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
              </button>
              <span className="flex-1 text-[10px] font-mono tabular-nums text-white/70">
                {formatDuration(progress)}
              </span>
              <button
                type="button"
                onClick={() => { setShowMini(false); videoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                className="rounded p-1 text-white/60 hover:text-white"
                aria-label="Back to player"
              >
                <X size={13} />
              </button>
            </div>
            {/* thin progress bar at bottom edge */}
            <div className="absolute bottom-0 left-0 h-[2px] w-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{ width: `${(progress / (duration || 1)) * 100}%`, backgroundColor: themeColor }}
              />
            </div>
          </div>
          <div className="px-3 py-2">
            <p className="truncate text-[11px] font-semibold text-white/80">{lesson.title}</p>
            <p className="truncate text-[10px] text-white/40">{course?.title}</p>
          </div>
        </div>
      )}
    </div>
  );
}
