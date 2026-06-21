'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DashboardStats } from '@/types';
import { formatDuration, formatHours, timeAgo } from '@/lib/utils';
import {
  Flame, Clock, BookOpen, TrendingUp,
  Play, ChevronRight, Zap, Target, BarChart3, Loader2
} from 'lucide-react';
import { getStats } from '@/lib/service';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats().then(data => {
      setStats(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="max-w-6xl mx-auto w-full space-y-6 p-6 animate-pulse">
      <div className="h-32 bg-gray-100 rounded-3xl w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl w-full" />
        ))}
      </div>
    </div>
  );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="max-w-6xl mx-auto w-full p-6 space-y-8 font-sans text-gray-900 animate-in fade-in duration-500">

      {/* ── HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/40 border border-indigo-100/50 p-8 sm:p-10 shadow-sm">
        {/* Decorative Blur Orb */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-indigo-100 text-indigo-600 text-[11px] font-bold uppercase tracking-widest mb-4 shadow-sm">
            {stats?.streak && stats.streak > 0 ? (
              <><Flame size={14} className="fill-orange-500 text-orange-500" /> {stats.streak} Day Streak</>
            ) : (
              <><Zap size={14} className="fill-indigo-500 text-indigo-500" /> Start your streak today</>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 mb-3">
            {greeting()}, let&apos;s keep learning ✨
          </h1>

          <p className="text-[15px] text-gray-500 font-medium leading-relaxed">
            {stats?.totalCourses === 0
              ? 'Import your first course folder to get started and build your learning library.'
              : `You have ${stats?.totalCourses} course${stats?.totalCourses !== 1 ? 's' : ''} active — ${stats?.completedLessons} lessons completed so far.`}
          </p>

          {stats?.totalCourses === 0 && (
            <Link
              href="/import"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-95"
            >
              <BookOpen size={16} /> Import Folder
            </Link>
          )}
        </div>
      </div>

      {/* ── STATS GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Courses', value: stats?.totalCourses ?? 0, icon: BookOpen, colorClass: 'text-indigo-600 bg-indigo-50 border-indigo-100', suffix: '' },
          { label: 'Hours Learned', value: stats?.totalHoursLearned ?? 0, icon: Clock, colorClass: 'text-orange-600 bg-orange-50 border-orange-100', suffix: 'h' },
          { label: 'Streak', value: stats?.streak ?? 0, icon: Flame, colorClass: 'text-rose-600 bg-rose-50 border-rose-100', suffix: ' days' },
          { label: 'Today', value: stats?.todayMinutes ?? 0, icon: Target, colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-100', suffix: 'm' },
        ].map(({ label, value, icon: Icon, colorClass, suffix }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-semibold text-gray-500">{label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${colorClass}`}>
                <Icon size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight text-gray-900 leading-none">{value}</span>
              <span className="text-sm font-semibold text-gray-400">{suffix}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── CONTINUE LEARNING ── */}
      {(stats?.continueWatching?.length ?? 0) > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 tracking-tight">
              <Play size={18} className="text-indigo-600 fill-indigo-600/20" /> Continue Learning
            </h2>
            <Link
              href="/library"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {stats?.continueWatching?.map((item: any) => (
              <Link
                key={item.lesson_id}
                href={`/course/${item.course_id}/lesson/${item.lesson_id}`}
                className="group block bg-white border border-gray-100 hover:border-indigo-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Play size={18} className="text-indigo-600 fill-indigo-600" />
                </div>

                <div className="space-y-1 mb-4">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider truncate">{item.course_title}</p>
                  <h3 className="text-[15px] font-bold text-gray-900 leading-snug line-clamp-2">{item.lesson_title}</h3>
                </div>

                <div className="space-y-2.5">
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.progress_pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500">
                    <span>{item.progress_pct}% complete</span>
                    <span>{formatDuration(item.position)} / {formatDuration(item.duration)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── RECENT ACTIVITY ── */}
      {(stats?.recentActivity?.length ?? 0) > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 px-1 tracking-tight">
            <BarChart3 size={18} className="text-indigo-600" /> Recent Activity
          </h2>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {stats?.recentActivity?.map((item: any) => (
                <Link
                  key={item.lesson_id}
                  href={`/course/${item.course_id}/lesson/${item.lesson_id}`}
                  className="flex items-center gap-4 p-4 sm:px-6 hover:bg-gray-50/80 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-100 group-hover:bg-indigo-50 flex items-center justify-center shrink-0 transition-colors">
                    <Play size={14} className="text-gray-500 group-hover:text-indigo-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-gray-900 truncate">
                      {item.lesson_title}
                    </div>
                    <div className="text-[12px] font-medium text-gray-500 truncate">
                      {item.course_title}
                    </div>
                  </div>

                  <div className="text-[11px] font-semibold text-gray-400 shrink-0 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                    {timeAgo(item.last_watched)}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── EMPTY STATE ── */}
      {stats?.totalCourses === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white border border-gray-100 rounded-3xl border-dashed">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-4xl mb-6 shadow-sm border border-gray-100">
            🎓
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">Your learning journey starts here</h3>
          <p className="text-sm text-gray-500 max-w-md mb-8 leading-relaxed">
            Import a local folder to begin organizing your learning content. Everything runs locally, no uploads required.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/import"
              className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-xl transition-all shadow-md"
            >
              Import Folder
            </Link>
            <Link
              href="/library"
              className="w-full sm:w-auto px-6 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-all"
            >
              Browse Library
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}