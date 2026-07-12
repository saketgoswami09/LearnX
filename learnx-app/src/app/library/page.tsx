'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronRight, FolderInput, Play, Plus, SearchX, Trash2 } from 'lucide-react';
import type { Category, Course } from '@/types';
import { CreateCourseModal } from '@/components/course/CreateCourseModal';
import { deleteCourse, getCategories, getCourses } from '@/lib/service';

export default function LibraryPage() {
  const [courses,    setCourses]    = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter,     setFilter]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting,   setDeleting]   = useState<string | null>(null);

  const handleDelete = async (course: any, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!window.confirm(`Delete "${course.title}"?\n\nThis will permanently remove the course and all its lesson progress. This cannot be undone.`)) return;
    setDeleting(course.id);
    try {
      await deleteCourse(course.id);
      await load();
    } finally {
      setDeleting(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [courseData, categoryData] = await Promise.all([getCourses(), getCategories()]);
      setCourses(courseData as Course[]);
      setCategories(categoryData);
    } catch { setCourses([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const filtered = filter ? courses.filter(c => c.category_id === filter) : courses;

  return (
    <>
      <div className="space-y-7">
        {/* Header */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="ui-kicker">Your collection</p>
            <h1 className="mt-2 ui-page-title">Course library</h1>
            <p className="mt-2 text-[14px] text-[#667085]">Browse and continue the learning content saved on this device.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/import" className="ui-btn ui-btn-secondary"><FolderInput size={16} /> Import</Link>
            <button type="button" onClick={() => setShowCreate(true)} className="ui-btn ui-btn-primary"><Plus size={16} /> New course</button>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar" aria-label="Course category filters">
          <button
            type="button"
            onClick={() => setFilter('')}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-colors ${
              filter === '' ? 'border-[#182230] bg-[#182230] text-white' : 'border-[#d9dee7] bg-white text-[#667085] hover:border-[#bfc7d3] hover:text-[#344054]'
            }`}
          >
            All courses <span className="ml-1 text-white/70">{courses.length}</span>
          </button>
          {categories.map(cat => (
            <button
              type="button"
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-colors ${
                filter === cat.id ? 'border-[#2563a6] bg-[#eaf2fb] text-[#1d4f86]' : 'border-[#d9dee7] bg-white text-[#667085] hover:border-[#bfc7d3] hover:text-[#344054]'
              }`}
            >
              <span className="mr-1.5" aria-hidden>{cat.icon}</span>{cat.name}
            </button>
          ))}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="ui-card overflow-hidden">
                <div className="skeleton h-28" />
                <div className="space-y-3 p-5">
                  <div className="skeleton h-4 w-4/5 rounded" />
                  <div className="skeleton h-3 w-2/5 rounded" />
                  <div className="skeleton h-2 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <section className="ui-card flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-[#f1f3f6] text-[#667085]">
              {filter ? <SearchX size={21} /> : <BookOpen size={21} />}
            </span>
            <h2 className="mt-4 text-[17px] font-bold tracking-[-.02em] text-[#182230]">
              {filter ? 'No matching courses' : 'Your library is ready for its first course'}
            </h2>
            <p className="mt-2 max-w-md text-[13px] leading-6 text-[#667085]">
              {filter ? 'Try another category or return to all courses.' : 'Create a course from scratch, or import a folder of videos and PDFs.'}
            </p>
            {!filter && (
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => setShowCreate(true)} className="ui-btn ui-btn-primary"><Plus size={16} /> Create course</button>
                <Link href="/import" className="ui-btn ui-btn-secondary"><FolderInput size={16} /> Import a folder</Link>
              </div>
            )}
          </section>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(filtered as any[]).map(course => {
              const pct       = course.progress ?? 0;
              const color     = course.color || '#2563a6';
              const started   = (course.completedLessons ?? 0) > 0;
              const done      = pct === 100;
              const btnLabel  = done ? 'Review' : started ? 'Continue' : 'Start';

              return (
                <div key={course.id} className="ui-card ui-card-interactive group relative flex flex-col overflow-hidden">
                    {/* Delete button */}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(course, e)}
                        disabled={deleting === course.id}
                        className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-lg text-[#98a2b3] opacity-0 transition-all hover:bg-[#fff1f2] hover:text-[#b42318] group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Delete course"
                        aria-label={`Delete ${course.title}`}
                      >
                        {deleting === course.id
                          ? <span className="size-3.5 animate-spin rounded-full border-2 border-[#b42318] border-t-transparent" />
                          : <Trash2 size={14} />}
                      </button>
                  {/* colour accent bar */}
                  <div className="h-[3px] w-full shrink-0" style={{ backgroundColor: color }} />

                  <div className="flex flex-1 flex-col p-5">
                    {/* Top row — icon + category */}
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex size-10 items-center justify-center rounded-lg bg-[#f1f3f6] text-[#475467]">
                        {course.thumbnail
                          ? <img src={course.thumbnail} alt="" className="size-full rounded-lg object-cover" />
                          : <BookOpen size={19} />
                        }
                      </span>
                      {course.categoryName && (
                        <span className="rounded-full border border-[#e1e6ed] bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.05em] text-[#667085]">
                          {course.categoryName}
                        </span>
                      )}
                    </div>

                    {/* Title + description */}
                    <div className="mt-4 min-w-0 flex-1">
                      <h2 className="line-clamp-2 text-[16px] font-bold tracking-[-.02em] text-[#182230] group-hover:text-[#1d4f86]">
                        {course.title}
                      </h2>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[#667085]">
                        {course.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Progress section */}
                    <div className="mt-5">
                      {/* counts + % */}
                      <div className="mb-2 flex items-center justify-between text-[11px]">
                        <span className="font-medium text-[#667085]">
                          {course.completedLessons ?? 0} / {course.totalLessons ?? 0} lessons
                        </span>
                        <span className={`font-bold ${done ? 'text-[#167a55]' : 'text-[#344054]'}`}>
                          {done ? '✓ Complete' : `${pct}%`}
                        </span>
                      </div>

                      {/* bar */}
                      <div className="ui-progress">
                        <span style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>

                      {/* CTA row */}
                      <div className="mt-4 flex items-center justify-between">
                        <Link
                          href={`/course/${course.id}`}
                          className="text-[11px] font-semibold text-[#98a2b3] hover:text-[#344054] transition-colors"
                        >
                          View details
                        </Link>
                        <Link
                          href={`/course/${course.id}`}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold text-white transition-all hover:opacity-90 active:scale-[.97]"
                          style={{ backgroundColor: color }}
                          onClick={e => e.stopPropagation()}
                        >
                          {done
                            ? <><CheckCircle2 size={13} /> {btnLabel}</>
                            : <><Play size={11} fill="currentColor" /> {btnLabel}</>
                          }
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && <CreateCourseModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </>
  );
}
