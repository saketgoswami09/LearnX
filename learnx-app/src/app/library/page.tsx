'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Course, Category } from '@/types';
import { BookOpen, FolderInput, Plus, SearchX } from 'lucide-react';
import { CreateCourseModal } from '@/components/course/CreateCourseModal';
import { getCourses, getCategories } from '@/lib/service';

export default function LibraryPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    try {
      const [c, cats] = await Promise.all([getCourses(), getCategories()]);
      setCourses(c as any);
      setCategories(cats);
    } catch (error) {
      console.error("Failed to load library data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = filter ? courses.filter(c => c.category_id === filter) : courses;

  return (
    <>
      {/* ── AURORA MESH BACKGROUND LAYER ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-[#F8F9FC]">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-300/40 mix-blend-multiply filter blur-[120px] opacity-70" />
        <div className="absolute top-[10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-indigo-300/40 mix-blend-multiply filter blur-[120px] opacity-70" />
        <div className="absolute bottom-[-10%] left-[20%] w-[700px] h-[700px] rounded-full bg-cyan-200/40 mix-blend-multiply filter blur-[120px] opacity-60" />
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="relative z-10 max-w-[1400px] mx-auto w-full p-6 md:p-8 space-y-8 font-sans animate-in fade-in duration-500">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Course Library</h1>
            <p className="text-[14px] text-gray-600 font-medium">Manage, organize, and track your local learning content.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowCreate(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900/90 backdrop-blur-md hover:bg-black text-white text-[13.5px] font-semibold rounded-xl transition-all shadow-lg shadow-gray-900/10 active:scale-[0.98]"
            >
              <Plus size={16} /> New Course
            </button>
          </div>
        </div>

        {/* ── CATEGORY FILTERS (Segmented Pills) ── */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 -mx-2 px-2 sm:mx-0 sm:px-0">
          <button
            onClick={() => setFilter('')}
            className={`shrink-0 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all border ${filter === ''
                ? 'bg-gray-900 border-gray-900 text-white shadow-sm'
                : 'bg-white/60 backdrop-blur-md border-gray-200/60 text-gray-700 hover:bg-white/90 hover:text-gray-900'
              }`}
          >
            All Courses
          </button>

          {categories.map(c => {
            const isActive = filter === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all border ${isActive
                    ? 'bg-gray-900 border-gray-900 text-white shadow-sm'
                    : 'bg-white/60 backdrop-blur-md border-gray-200/60 text-gray-700 hover:bg-white/90 hover:text-gray-900'
                  }`}
              >
                <span className={isActive ? 'opacity-100' : 'opacity-70'}>{c.icon}</span>
                {c.name}
              </button>
            );
          })}
        </div>

        {/* ── MAIN CONTENT GRID ── */}
        {loading ? (
          // Premium Skeleton Structure with Glassmorphism
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl overflow-hidden shadow-sm flex flex-col h-full">
                <div className="h-40 bg-gray-200/50 animate-pulse" />
                <div className="p-5 space-y-4 flex-1 flex flex-col">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200/60 rounded-full w-3/4 animate-pulse" />
                    <div className="h-4 bg-gray-200/60 rounded-full w-1/2 animate-pulse" />
                  </div>
                  <div className="mt-auto pt-4 space-y-2">
                    <div className="h-1.5 bg-gray-200/60 rounded-full w-full animate-pulse" />
                    <div className="h-3 bg-gray-200/60 rounded-full w-1/4 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          // Refined Empty State
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white/50 backdrop-blur-xl border border-white/60 rounded-[2rem] shadow-sm">
            <div className="w-16 h-16 bg-white/80 rounded-2xl flex items-center justify-center mb-5 border border-gray-100 shadow-sm backdrop-blur-md">
              {filter ? <SearchX size={28} className="text-gray-400" /> : <BookOpen size={28} className="text-gray-400" />}
            </div>
            <h3 className="text-[17px] font-bold text-gray-900 mb-1.5 tracking-tight">
              {filter ? 'No courses in this category' : 'Your library is empty'}
            </h3>
            <p className="text-[13.5px] text-gray-600 max-w-sm mx-auto mb-8 leading-relaxed">
              {filter
                ? 'Try selecting a different category or clear the filter to see all your courses.'
                : 'Create a new course manually or import an entire folder to start building your library.'}
            </p>

            {!filter && (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-[13px] font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Create Course
                </button>
                <Link
                  href="/import"
                  className="w-full sm:w-auto px-5 py-2.5 bg-white/80 backdrop-blur-md border border-gray-200/80 hover:bg-white text-gray-700 text-[13px] font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <FolderInput size={16} className="text-gray-500" /> Import Folder
                </Link>
              </div>
            )}
          </div>
        ) : (
          // Course Cards Grid
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((course: any) => (
              <Link
                key={course.id}
                href={`/course/${course.id}`}
                // Using glassmorphic background here
                className="group block bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl overflow-hidden hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300"
              >
                <div className="flex flex-col h-full">

                  {/* Thumbnail Area */}
                  <div className="h-40 relative flex items-center justify-center overflow-hidden bg-gray-100/50 border-b border-white/50">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <BookOpen size={32} className="text-gray-400/80 group-hover:scale-110 transition-transform duration-300" />
                    )}

                    {/* Category Badge overlay */}
                    {course.categoryName && (
                      <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/80 backdrop-blur-md text-[10px] font-bold text-gray-800 uppercase tracking-widest rounded-lg shadow-sm border border-white/60">
                        {course.categoryName}
                      </div>
                    )}
                  </div>

                  {/* Content Area */}
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-[15px] font-bold text-gray-900 leading-snug line-clamp-2 mb-3 group-hover:text-indigo-600 transition-colors">
                      {course.title}
                    </h3>

                    <div className="flex items-center justify-between text-[11.5px] font-semibold text-gray-500 mb-5">
                      <span>{course.totalLessons || 0} lessons</span>
                      {course.totalLessons ? <span>{course.progress || 0}% complete</span> : null}
                    </div>

                    {/* Footer Stats & Progress */}
                    <div className="mt-auto space-y-3.5">
                      <div className="w-full bg-gray-200/60 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${course.progress || 0}%` }}
                        />
                      </div>

                      {course.tags && course.tags.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          {course.tags.slice(0, 3).map((t: string) => (
                            <span
                              key={t}
                              className="inline-flex items-center px-2 py-1 bg-white/60 border border-white/80 rounded-md text-[10px] font-semibold text-gray-600 tracking-wide uppercase shadow-sm"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Modal */}
        {showCreate && (
          <CreateCourseModal
            onClose={() => setShowCreate(false)}
            onCreated={() => load()}
          />
        )}
      </div>
    </>
  );
}