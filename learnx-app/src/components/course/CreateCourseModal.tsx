'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Category } from '@/types';
import { ACCENT_COLORS } from '@/lib/utils';
import { X, Loader2 } from 'lucide-react';
import { getCategories, createCourse } from '@/lib/service';

interface Props {
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateCourseModal({ onClose, onCreated }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    title: '', description: '', category_id: '', color: ACCENT_COLORS[0], tags: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  const submit = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const course = await createCourse({
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
      });
      onClose();
      onCreated?.();
      router.push(`/course/${course.id}`);
    } catch (error) {
      console.error("Failed to create course", error);
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[500px] bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* ── MODAL HEADER ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-[16px] font-bold text-gray-900 tracking-tight">Create New Course</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-200/50 rounded-lg transition-colors focus:outline-none"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── MODAL BODY (FORM) ── */}
        <div className="p-6 space-y-5">

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">Course Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. React Mastery Course"
              autoFocus
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
            />
          </div>

          {/* Description Input */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What will you learn?"
              rows={3}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Category Select */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">Category</label>
              <select
                value={form.category_id}
                onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium appearance-none cursor-pointer"
              >
                <option value="">Select category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            {/* Tags Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">Tags <span className="text-gray-400 normal-case tracking-normal font-medium">(comma-separated)</span></label>
              <input
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="react, hooks, state"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2.5 pt-1">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">Theme Color</label>
            <div className="flex flex-wrap gap-3">
              {ACCENT_COLORS.map(c => {
                const isActive = form.color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-full transition-all focus:outline-none ${isActive ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110 shadow-sm'
                      }`}
                    style={{ backgroundColor: c }}
                  />
                );
              })}
            </div>
          </div>

        </div>

        {/* ── MODAL FOOTER (ACTIONS) ── */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-[13.5px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200/50 rounded-xl transition-colors focus:outline-none"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading || !form.title.trim()}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-[13.5px] font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin text-white/70" /> Creating...</>
            ) : (
              'Create Course'
            )}
          </button>
        </div>

      </div>
    </div>
  );
}