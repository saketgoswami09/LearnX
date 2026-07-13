'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight, BookOpen, CheckCircle2, Clock3,
  Flame, Play, Sparkles, Target, TrendingUp, Search
} from 'lucide-react';
import type { Course, DashboardStats } from '@/types';
import { formatDuration, timeAgo } from '@/lib/utils';
import { getCourses, getStats } from '@/lib/service';
import { motion } from 'framer-motion';

/* ─── Skeleton ────────────────────────────────────────────── */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-[200px] rounded-2xl" />
      <div className="skeleton h-[160px] rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="ui-card skeleton h-[120px]" />)}
      </div>
    </div>
  );
}

/* ─── SVG Progress Ring ───────────────────────────────────── */
function ProgressRing({ pct, size = 72, stroke = 6, color = '#2563a6' }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e9edf2" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 600ms ease' }} />
    </svg>
  );
}

/* ─── Course progress card ────────────────────────────────── */
function CourseProgressCard({ course, continueItem, isActive }: {
  course: Course & { totalLessons: number; completedLessons: number; progress: number; categoryName?: string; categoryIcon?: string };
  continueItem?: { lesson_id: string } | null;
  isActive?: boolean;
}) {
  const pct       = course.progress ?? 0;
  const color     = course.color || '#2563a6';
  const started   = course.completedLessons > 0;
  const done      = pct === 100;
  const btnLabel  = done ? 'Review' : started ? 'Resume' : 'Start';
  const lessonHref = continueItem
    ? `/course/${course.id}/lesson/${continueItem.lesson_id}`
    : `/course/${course.id}`;
    
  // Estimate time left based on remaining lessons (avg 8 min)
  const remaining = course.totalLessons - course.completedLessons;
  const estTime   = remaining > 0 ? formatDuration(remaining * 8 * 60) : '';

  return (
    <div className="ui-card group flex flex-col gap-4 overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgb(16_24_40/8%)]">
      {/* thin colour accent top */}
      <div className="absolute top-0 inset-x-0 h-[3px] rounded-t-[14px]" style={{ backgroundColor: color }} />
      
      {/* Active badge */}
      {isActive && (
        <span className="absolute right-3 top-3 rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#059669]">
          Currently Learning
        </span>
      )}

      {/* Header: Icon + Title + Category */}
      <div className="flex items-start gap-3 mt-1">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f1f3f6] text-[18px]">
          {course.categoryIcon || '📚'}
        </span>
        <div className="min-w-0 flex-1 pr-12">
          <p className="truncate text-[15px] font-bold tracking-[-.02em] text-[#182230] group-hover:text-[#1d4f86] transition-colors">{course.title}</p>
          <p className="mt-0.5 text-[12px] font-medium text-[#98a2b3]">{course.categoryName || 'General'}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-2 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold text-[#667085]">
            {course.completedLessons} / {course.totalLessons} lessons
          </p>
          {remaining > 0 && (
            <p className="mt-0.5 text-[11px] text-[#98a2b3]">≈ {estTime} remaining</p>
          )}
        </div>
        <span className={`text-[20px] font-bold tabular-nums tracking-tight ${done ? 'text-[#167a55]' : 'text-[#344054]'}`}>
          {done ? '✓' : started ? `${pct}%` : <span className="text-[14px] text-[#98a2b3]">Not Started</span>}
        </span>
      </div>

      {/* progress bar */}
      <div className="ui-progress">
        <span className="transition-all duration-700 ease-out group-hover:brightness-110" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>

      {/* footer */}
      <div className="mt-1 flex items-center justify-between">
        <Link
          href={`/course/${course.id}`}
          className="text-[12px] font-semibold text-[#98a2b3] hover:text-[#344054] transition-colors"
        >
          View details
        </Link>
        <Link
          href={lessonHref}
          className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-bold text-white transition-all duration-300 hover:opacity-90 active:scale-[.98] group-hover:translate-x-[-2px] group-hover:shadow-md"
          style={{ backgroundColor: color }}
        >
          {done ? <CheckCircle2 size={14} /> : <Play size={13} fill="currentColor" />}
          {btnLabel}
        </Link>
      </div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────── */
export default function DashboardPage() {
  const [stats,   setStats]   = useState<DashboardStats | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed' | 'not-started'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getStats(), getCourses()])
      .then(([s, c]) => { if (active) { setStats(s); setCourses(c); } })
      .catch(() => { if (active) setStats(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  if (loading) return <DashboardSkeleton />;

  const hasCourses    = (stats?.totalCourses ?? 0) > 0;
  const totalLessons  = stats?.totalLessons ?? 0;
  const completed     = stats?.completedLessons ?? 0;
  const overallPct    = totalLessons ? Math.round((completed / totalLessons) * 100) : 0;
  const topCourse     = stats?.continueWatching?.[0] ?? null;

  // Map continueWatching by course_id for quick lookup
  const cwMap = Object.fromEntries(
    (stats?.continueWatching ?? []).map(cw => [cw.course_id, cw])
  );

  // Estimate remaining time (avg ~8 min per lesson)
  const remainingLessons = totalLessons - completed;
  const estRemainSec     = remainingLessons * 8 * 60;

  // Filtered courses
  const filteredCourses = courses.filter(c => {
    if (searchQuery && !c.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    const pct = c.progress ?? 0;
    if (filter === 'in-progress') return pct > 0 && pct < 100;
    if (filter === 'completed') return pct === 100;
    if (filter === 'not-started') return pct === 0;
    return true;
  });

  const statCards = [
    { label: 'Active Courses',  value: stats?.totalCourses ?? 0,          sub: `${totalLessons} lessons`,   icon: BookOpen, tone: 'bg-[#eaf2fb] text-[#2563a6]' },
    { label: 'Learning Time',   value: `${stats?.totalHoursLearned ?? 0}h`, sub: 'Total focused time',       icon: Clock3,   tone: 'bg-[#ecfdf5] text-[#059669]' },
    { label: 'Current Streak',  value: stats?.streak ?? 0,                 sub: (stats?.streak ?? 0) === 1 ? 'day in a row' : 'days in a row', icon: Flame, tone: 'bg-[#fff7ed] text-[#ea580c]' },
    { label: 'Today',           value: `${stats?.todayMinutes ?? 0}m`,      sub: 'Minutes invested',          icon: Target,   tone: 'bg-[#fefce8] text-[#ca8a04]' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } }
  };

  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      animate="show" 
      className="space-y-6"
    >

      {/* ── Hero card ─────────────────────────────────────── */}
      <motion.section variants={itemVariants} className="dash-hero ui-card relative overflow-hidden px-6 py-6 sm:px-8 sm:py-7">
        <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-[#2563a6]" />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-8">
          <div className="flex-1 min-w-0">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#eaf2fb] px-2.5 py-1 text-[11px] font-semibold text-[#1d4f86]">
              <Sparkles size={13} /> Your personal learning space
            </p>
            <h1 className="ui-page-title">{greeting()}, keep building momentum.</h1>

            {/* Motivational stats strip */}
            {hasCourses && (
              <div className="mt-5 flex flex-wrap items-center gap-5">
                {/* overall progress ring */}
                <div className="relative flex items-center gap-3">
                  <ProgressRing pct={overallPct} size={64} stroke={6} />
                  <span className="absolute left-0 top-0 flex size-16 items-center justify-center text-[13px] font-bold text-[#182230]">
                    {overallPct}%
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-[#182230]">Overall progress</p>
                    <p className="text-[11px] text-[#98a2b3]">{completed} / {totalLessons} lessons</p>
                  </div>
                </div>

                <div className="hidden h-10 w-px bg-[#e7e9ee] sm:block" />

                {/* time remaining */}
                <div>
                  <p className="text-[13px] font-semibold text-[#182230]">Est. time left</p>
                  <p className="text-[11px] text-[#98a2b3]">{formatDuration(estRemainSec)}</p>
                </div>

                {/* current course */}
                {topCourse && (
                  <>
                    <div className="hidden h-10 w-px bg-[#e7e9ee] sm:block" />
                    <div>
                      <p className="text-[13px] font-semibold text-[#182230]">Current course</p>
                      <p className="max-w-[160px] truncate text-[11px] text-[#98a2b3]">{topCourse.course_title}</p>
                    </div>
                  </>
                )}

                <div className="hidden h-10 w-px bg-[#e7e9ee] sm:block" />
                <div className="flex items-center gap-1.5">
                  <Flame size={15} className="text-[#ea580c]" />
                  <div>
                    <p className="text-[13px] font-semibold text-[#182230]">{stats?.streak ?? 0}-day streak</p>
                    <p className="text-[11px] text-[#98a2b3]">Keep it going!</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CTA buttons */}
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:items-stretch">
            {topCourse && (
              <Link href={`/course/${topCourse.course_id}/lesson/${topCourse.lesson_id}`} className="ui-btn ui-btn-accent">
                <Play size={15} fill="currentColor" /> Continue learning
              </Link>
            )}
            <Link href="/import" className="ui-btn ui-btn-secondary"><BookOpen size={15} /> Import content</Link>
            <Link href={hasCourses ? '/library' : '/import'} className="ui-btn ui-btn-primary">
              {hasCourses ? 'Open library' : 'Get started'} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </motion.section>

      {hasCourses ? (
        <div className="space-y-10">
          
          {/* ── Continue learning ───────────────────────────── */}
          <motion.section variants={itemVariants} className="ui-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-6">
              <div>
                <p className="ui-kicker">In progress</p>
                <h2 className="mt-1 ui-section-title">Continue learning</h2>
              </div>
              <Link href="/library" className="ui-btn ui-btn-ghost min-h-8 px-2 text-[12px]">
                View library <ArrowRight size={14} />
              </Link>
            </div>

            {(stats?.continueWatching?.length ?? 0) > 0 ? (
              <div className="divide-y divide-[#edf0f3]">
                {stats?.continueWatching?.map(item => {
                  const remainSec = Math.max(0, item.duration - item.position);
                  return (
                    <Link
                      key={item.lesson_id}
                      href={`/course/${item.course_id}/lesson/${item.lesson_id}`}
                      className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#fafbfc] sm:px-6"
                    >
                      <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#eaf2fb] text-[#2563a6] transition-transform group-hover:scale-[1.04]">
                        <Play size={20} fill="currentColor" />
                        <span className="absolute bottom-0 left-0 h-1 rounded-b-xl bg-[#2563a6]" style={{ width: `${item.progress_pct}%` }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[10px] font-bold uppercase tracking-[.08em] text-[#98a2b3]">{item.course_title}</span>
                        <span className="mt-0.5 block truncate text-[14px] font-semibold text-[#344054] group-hover:text-[#1d4f86]">{item.lesson_title}</span>
                        <span className="mt-2 block ui-progress"><span style={{ width: `${item.progress_pct}%` }} /></span>
                      </span>
                      <span className="hidden shrink-0 text-right sm:block">
                        <span className="block text-[13px] font-bold text-[#344054]">{item.progress_pct}%</span>
                        <span className="mt-0.5 block text-[11px] text-[#98a2b3]">{formatDuration(remainSec)} left</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-[#f1f3f6] text-[#98a2b3]"><Play size={20} /></span>
                <p className="text-[13px] text-[#667085]">Open a lesson from your library to begin tracking progress.</p>
                <Link href="/library" className="ui-btn ui-btn-secondary mt-1 text-[12px]">Browse library</Link>
              </div>
            )}
          </motion.section>

          {/* ── My Courses & Filters ───────────────────────── */}
          <motion.section variants={itemVariants}>
            <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-[16px] font-bold tracking-[-.02em] text-[#182230] font-display">My Courses</h2>
                <p className="mt-0.5 text-[12px] text-[#667085]">Jump back into your active curriculum.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#98a2b3]" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-8 w-[160px] rounded-lg border border-[#d9dee7] bg-white pl-8 pr-3 text-[12px] outline-none transition-colors focus:border-[#2563a6] focus:ring-1 focus:ring-[#2563a6]"
                  />
                </div>
                <select 
                  value={filter}
                  onChange={e => setFilter(e.target.value as any)}
                  className="h-8 rounded-lg border border-[#d9dee7] bg-white px-3 text-[12px] font-medium outline-none transition-colors focus:border-[#2563a6]"
                >
                  <option value="all">All Courses</option>
                  <option value="in-progress">In Progress</option>
                  <option value="not-started">Not Started</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            
            {filteredCourses.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredCourses.slice(0, 6).map(course => (
                  <CourseProgressCard key={course.id} course={course} continueItem={cwMap[course.id]} isActive={topCourse?.course_id === course.id} />
                ))}
              </div>
            ) : (
              <div className="ui-card flex min-h-[160px] flex-col items-center justify-center text-center p-6">
                <p className="text-[13px] font-semibold text-[#182230]">No courses found</p>
                <p className="mt-1 text-[12px] text-[#667085]">Try adjusting your search or filters.</p>
              </div>
            )}
            
            {filteredCourses.length > 6 && (
              <div className="mt-4 text-center">
                <Link href="/library" className="text-[12px] font-bold text-[#2563a6] hover:underline">
                  View all {filteredCourses.length} courses →
                </Link>
              </div>
            )}
          </motion.section>

          {/* ── Stat cards ────────────────────────────────────── */}
          <motion.section variants={itemVariants} aria-label="Learning statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map(({ label, value, sub, icon: Icon, tone }) => (
              <div key={label} className="ui-card dash-stat p-5">
                <div className="flex items-start justify-between">
                  <p className="text-[12px] font-semibold uppercase tracking-[.07em] text-[#98a2b3]">{label}</p>
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                    <Icon size={16} />
                  </span>
                </div>
                <p className="mt-4 text-[32px] font-bold tracking-[-.04em] text-[#182230] leading-none">{value}</p>
                <p className="mt-1.5 text-[12px] text-[#98a2b3]">{sub}</p>
              </div>
            ))}
          </motion.section>

          {/* ── Recent activity ───────────────────────────────── */}
          <motion.section variants={itemVariants} className="ui-card overflow-hidden">
            <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
              <p className="ui-kicker">Latest updates</p>
              <h2 className="mt-1 ui-section-title">Recent activity</h2>
            </div>
            {(stats?.recentActivity?.length ?? 0) > 0 ? (
              <div className="divide-y divide-[#edf0f3]">
                {stats?.recentActivity?.slice(0, 6).map(item => (
                  <Link
                    key={item.lesson_id}
                    href={`/course/${item.course_id}/lesson/${item.lesson_id}`}
                    className="group flex gap-3 px-5 py-3.5 hover:bg-[#fafbfc] sm:px-6"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#edf7f1] text-[#167a55]">
                      <CheckCircle2 size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-[#344054] group-hover:text-[#1d4f86]">{item.lesson_title}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-[#98a2b3]">{item.course_title}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-[#98a2b3] pt-0.5">{timeAgo(item.last_watched)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-[#f1f3f6] text-[#98a2b3]"><TrendingUp size={20} /></span>
                <p className="text-[13px] text-[#667085]">Your recent activity will appear here as you learn.</p>
              </div>
            )}
          </motion.section>
        </div>
      ) : (
        /* Empty state */
        <motion.section variants={itemVariants} className="ui-card mx-auto max-w-3xl px-6 py-14 text-center sm:px-10">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[#eaf2fb] text-[#2563a6]">
            <BookOpen size={23} />
          </span>
          <h2 className="mt-5 text-[21px] font-bold tracking-[-.03em] text-[#182230]">A home for what you want to learn</h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-[#667085]">
            Bring in a folder of videos or PDFs, and LearnX will turn it into a structured course that stays on your device.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/import" className="ui-btn ui-btn-primary"><BookOpen size={16} /> Import a folder</Link>
            <Link href="/library" className="ui-btn ui-btn-secondary">Create a course</Link>
          </div>
        </motion.section>
      )}
    </motion.div>
  );
}
