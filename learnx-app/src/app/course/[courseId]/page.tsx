'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BookOpen, CheckCircle2, ChevronLeft, Clock3, FileText, Play, PlayCircle, Trash2, PlaySquare } from 'lucide-react';
import type { Course, Module } from '@/types';
import { formatDuration } from '@/lib/utils';
import { deleteCourse, getCourse } from '@/lib/service';
import { AddYouTubeLessonModal } from '@/components/course/AddYouTubeLessonModal';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<(Course & { modules: Module[]; categoryName?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showAddYT, setShowAddYT] = useState(false);

  const handleDelete = async () => {
    if (!course) return;
    if (!window.confirm(`Delete "${course.title}"?\n\nThis will permanently remove the course and all its lesson progress. This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteCourse(course.id);
      router.push('/library');
    } catch {
      setDeleting(false);
    }
  };

  useEffect(() => {
    let active = true;
    getCourse(params.courseId as string)
      .then(data => {
        if (!active) return;
        if (!data) router.push('/library');
        else setCourse(data as any);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [params.courseId, router]);

  if (loading || !course) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-[236px] rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
          <div className="skeleton h-[420px] rounded-xl" />
          <div className="skeleton h-[240px] rounded-xl" />
        </div>
      </div>
    );
  }

  const modules = course.modules as any[];
  const totalLessons = modules.reduce((total, module) => total + (module.lessons?.length || 0), 0);
  const completedLessons = modules.reduce(
    (total, module) => total + (module.lessons?.filter((lesson: any) => lesson.completed).length || 0),
    0,
  );
  const progress = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const firstLesson = modules.flatMap(module => module.lessons || [])[0];
  const themeColor = course.color || '#2563a6';

  return (
    <div className="space-y-6">
      <Link href="/library" className="ui-btn ui-btn-ghost -ml-2 min-h-8 px-2 text-[12px]">
        <ChevronLeft size={16} /> Back to library
      </Link>

      {/* Hero card */}
      <section className="ui-card overflow-hidden">
        <div className="h-2" style={{ backgroundColor: themeColor }} />
        <div className="flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <span
              className="flex size-12 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: themeColor }}
            >
              <BookOpen size={23} />
            </span>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-2">
                {course.categoryName && (
                  <span className="rounded-full bg-[#f1f3f6] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.06em] text-[#667085]">
                    {course.categoryName}
                  </span>
                )}
                {progress === 100 && (
                  <span className="rounded-full bg-[#edf7f1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.06em] text-[#167a55]">
                    Completed
                  </span>
                )}
              </div>
              <h1 className="ui-page-title break-words">{course.title}</h1>
              <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#667085]">
                {course.description || 'No description provided for this course.'}
              </p>
            </div>
          </div>
          {firstLesson && (
            <button
              type="button"
              onClick={() => router.push(`/course/${course.id}/lesson/${firstLesson.id}`)}
              className="ui-btn ui-btn-primary shrink-0"
            >
              <Play size={16} fill="currentColor" />
              {progress > 0 ? 'Resume course' : 'Start course'}
            </button>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
        {/* Lessons list */}
        <section className="ui-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <div>
              <p className="ui-kicker">Course content</p>
              <h2 className="mt-1 ui-section-title">
                {totalLessons} lesson{totalLessons === 1 ? '' : 's'} across {modules.length} module{modules.length === 1 ? '' : 's'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAddYT(true)}
              className="flex items-center gap-1.5 rounded-[9px] border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-[12px] font-semibold text-[#dc2626] transition-colors hover:bg-[#fee2e2]"
            >
              <PlaySquare size={14} /> Add YT lesson
            </button>
          </div>

          {modules.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <BookOpen size={24} className="mx-auto mb-3 text-[#98a2b3]" />
              <p className="text-[13px] text-[#667085]">This course does not have any lessons yet.</p>
              <Link href="/import" className="ui-btn ui-btn-secondary mt-5">Import content</Link>
            </div>
          ) : (
            <div className="divide-y divide-[#e7e9ee]">
              {modules.map(module => (
                <div key={module.id}>
                  <div className="flex items-center justify-between bg-[#fafbfc] px-5 py-3 sm:px-6">
                    <h3 className="text-[13px] font-bold text-[#344054]">{module.title}</h3>
                    <span className="text-[11px] font-medium text-[#98a2b3]">
                      {module.lessons?.length || 0} lessons
                    </span>
                  </div>
                  {module.lessons?.length ? (
                    <div className="divide-y divide-[#edf0f3]">
                      {module.lessons.map((lesson: any) => (
                        <Link
                          key={lesson.id}
                          href={`/course/${course.id}/lesson/${lesson.id}`}
                          className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#fafbfc] sm:px-6"
                        >
                          <span
                            className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                              lesson.completed
                                ? 'bg-[#edf7f1] text-[#167a55]'
                                : 'bg-[#f1f3f6] text-[#667085]'
                            }`}
                          >
                            {lesson.completed ? (
                              <CheckCircle2 size={16} />
                            ) : lesson.type === 'youtube' ? (
                              <PlaySquare size={14} className="text-[#ef4444]" />
                            ) : lesson.type === 'video' ? (
                              <Play size={14} fill="currentColor" />
                            ) : (
                              <FileText size={14} />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-semibold text-[#344054] group-hover:text-[#1d4f86]">
                              {lesson.title}
                            </span>
                            <span className="mt-0.5 flex items-center gap-2 text-[11px] text-[#98a2b3]">
                              <span className="capitalize">{lesson.type}</span>
                              {lesson.duration > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{formatDuration(lesson.duration)}</span>
                                </>
                              )}
                            </span>
                          </span>
                          <PlayCircle size={16} className="shrink-0 text-[#c5ccd6] group-hover:text-[#2563a6]" />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="px-5 py-4 text-[12px] text-[#98a2b3] sm:px-6">No lessons in this module.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          <section className="ui-card p-5">
            <p className="ui-kicker">Progress</p>
            <div className="mt-4 flex items-end justify-between">
              <p className="text-[36px] font-bold tracking-[-.045em] text-[#182230]">{progress}%</p>
              <span className="text-[12px] text-[#667085]">{completedLessons} of {totalLessons}</span>
            </div>
            <div className="mt-3 ui-progress">
              <span style={{ width: `${progress}%`, backgroundColor: themeColor }} />
            </div>
            <p className="mt-3 text-[12px] leading-5 text-[#667085]">
              Complete lessons at your own pace; LearnX will keep your place.
            </p>
          </section>

          {course.tags?.length > 0 && (
            <section className="ui-card p-5">
              <p className="ui-kicker">Tags</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {course.tags.map(tag => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#e1e6ed] bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.05em] text-[#667085]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="ui-card p-5">
            <div className="flex gap-3">
              <Clock3 size={17} className="mt-0.5 shrink-0 text-[#667085]" />
              <p className="text-[12px] leading-5 text-[#667085]">
                Lesson duration is detected while watching supported media. Imported PDFs can be read from the same course flow.
              </p>
            </div>
          </section>

          {/* Delete course */}
          <section className="ui-card overflow-hidden">
            <div className="px-5 py-4">
              <p className="text-[12px] leading-5 text-[#667085]">
                Permanently remove this course and all its lesson progress from your device.
              </p>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[9px] border border-[#fecdca] bg-[#fff1f2] px-3 py-2.5 text-[13px] font-semibold text-[#b42318] transition-colors hover:bg-[#ffe4e6] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting
                  ? <span className="size-4 animate-spin rounded-full border-2 border-[#b42318] border-t-transparent" />
                  : <Trash2 size={15} />
                }
                {deleting ? 'Deleting…' : 'Delete course'}
              </button>
            </div>
          </section>
        </aside>
      </div>

      {showAddYT && (
        <AddYouTubeLessonModal
          courseId={course.id}
          onClose={() => setShowAddYT(false)}
          onCreated={(lessonId) => {
            setShowAddYT(false);
            router.push(`/course/${course.id}/lesson/${lessonId}`);
          }}
        />
      )}
    </div>
  );
}
