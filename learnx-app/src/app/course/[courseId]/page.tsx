'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Course, Module } from '@/types';
import { formatDuration } from '@/lib/utils';
import { ChevronLeft, Play, Settings, Plus, FileText, CheckCircle2, Circle, BookOpen } from 'lucide-react';
import { getCourse } from '@/lib/service';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course & { modules: Module[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCourse(params.courseId as string).then(data => {
      if (!data) router.push('/library');
      else setCourse(data as any);
      setLoading(false);
    });
  }, [params.courseId, router]);

  if (loading || !course) return (
    <div className="max-w-[1000px] mx-auto w-full p-6 space-y-6 animate-pulse">
      <div className="h-[260px] bg-gray-100 rounded-[2rem] w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        <div className="space-y-4">
          <div className="h-10 bg-gray-100 rounded-xl w-1/3" />
          <div className="h-24 bg-gray-100 rounded-2xl w-full" />
          <div className="h-24 bg-gray-100 rounded-2xl w-full" />
        </div>
        <div className="space-y-4">
          <div className="h-48 bg-gray-100 rounded-2xl w-full" />
        </div>
      </div>
    </div>
  );

  const totalLessons = (course as any).modules.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0);
  const completedLessons = (course as any).modules.reduce((acc: number, m: any) => acc + (m.lessons?.filter((l: any) => l.completed)?.length || 0), 0);
  const progress = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const firstLesson = (course as any).modules.flatMap((m: any) => m.lessons || [])[0];

  // Derive color for UI elements based on course.color or default to indigo
  const themeColor = (course as any).color || '#4f46e5';

  return (
    <div className="max-w-[1000px] mx-auto w-full p-6 md:p-8 font-sans animate-in fade-in duration-500">

      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-6 group focus:outline-none"
      >
        <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
        Back to Library
      </Link>

      {/* ── HEADER SECTION ── */}
      <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden mb-10 shadow-sm">
        {/* Cover Banner */}
        <div
          className="h-40 w-full opacity-20"
          style={{ backgroundColor: themeColor }}
        />

        {/* Header Content */}
        <div className="px-6 pb-8 md:px-10 flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-12">

          {/* Icon Box */}
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center border-4 border-white shadow-lg shrink-0"
            style={{ backgroundColor: themeColor }}
          >
            <BookOpen size={36} className="text-white" />
          </div>

          <div className="flex-1 pb-1 w-full">
            <div className="flex flex-wrap gap-2 mb-3">
              {(course as any).categoryName && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700">
                  {(course as any).categoryName}
                </span>
              )}
              {progress === 100 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700">
                  Completed
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight mb-2">
              {course.title}
            </h1>
            <p className="text-[14px] text-gray-500 font-medium max-w-2xl leading-relaxed">
              {course.description || 'No description provided for this course.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 pb-1 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-[13px] font-semibold rounded-xl transition-all shadow-sm">
              <Settings size={15} /> Edit
            </button>
            {firstLesson && (
              <button
                onClick={() => router.push(`/course/${course.id}/lesson/${firstLesson.id}`)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-white text-[13px] font-semibold rounded-xl transition-all shadow-md active:scale-95"
                style={{ backgroundColor: themeColor }}
              >
                <Play size={15} fill="currentColor" /> Resume
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">

        {/* ── LEFT COLUMN: MODULES ── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Course Content</h2>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100">
              <Plus size={14} /> Add Module
            </button>
          </div>

          <div className="space-y-4">
            {(course as any).modules.length === 0 ? (
              <div className="py-16 text-center border border-gray-200 border-dashed rounded-2xl bg-gray-50/50">
                <p className="text-[14px] font-medium text-gray-500">No modules yet. Import a folder to get started.</p>
              </div>
            ) : (
              (course as any).modules.map((mod: any) => (
                <div key={mod.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">

                  {/* Module Header */}
                  <div className="px-5 py-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-[15px] font-bold text-gray-900 tracking-tight">{mod.title}</h3>
                    <span className="text-[12px] font-semibold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-100">
                      {mod.lessons?.length || 0} lessons
                    </span>
                  </div>

                  {/* Lessons List */}
                  <div className="divide-y divide-gray-50">
                    {(!mod.lessons || mod.lessons.length === 0) ? (
                      <div className="p-6 text-center text-[13px] font-medium text-gray-400">Empty module</div>
                    ) : (
                      mod.lessons.map((lesson: any) => (
                        <Link
                          key={lesson.id}
                          href={`/course/${course.id}/lesson/${lesson.id}`}
                          className="flex items-start sm:items-center gap-4 px-5 py-3.5 hover:bg-gray-50/80 transition-colors group focus:outline-none focus:bg-gray-50"
                        >
                          <div className="mt-0.5 sm:mt-0 shrink-0">
                            {lesson.completed ? (
                              <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-50" />
                            ) : (
                              <Circle size={18} className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-[14px] font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                              {lesson.title}
                            </div>

                            <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-gray-500">
                              <span className="flex items-center gap-1 uppercase tracking-wider">
                                {lesson.type === 'video' ? <Play size={10} className="fill-current" /> : <FileText size={10} />}
                                {lesson.type}
                              </span>
                              {lesson.duration > 0 && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                                  <span>{formatDuration(lesson.duration)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: SIDEBAR ── */}
        <div className="space-y-6">

          {/* Progress Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-4">Course Progress</h3>

            <div className="text-4xl font-extrabold text-gray-900 tracking-tight leading-none mb-3">
              {progress}%
            </div>

            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%`, backgroundColor: themeColor }}
              />
            </div>

            <div className="text-[13px] font-semibold text-gray-500">
              {completedLessons} of {totalLessons} lessons completed
            </div>
          </div>

          {/* Tags Card */}
          {course.tags && course.tags.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-4">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {course.tags.map((t: string) => (
                  <span
                    key={t}
                    className="inline-flex items-center px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[11px] font-semibold text-gray-600 uppercase tracking-wide"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}