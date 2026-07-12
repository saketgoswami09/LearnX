'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, X } from 'lucide-react';
import type { Category } from '@/types';
import { ACCENT_COLORS } from '@/lib/utils';
import { createCourse, getCategories } from '@/lib/service';

interface Props { onClose: () => void; onCreated?: () => void; }

export function CreateCourseModal({ onClose, onCreated }: Props) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ title: '', description: '', category_id: '', color: ACCENT_COLORS[0], tags: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
    window.setTimeout(() => titleRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!form.title.trim() || loading) return;
    setLoading(true);
    try {
      const course = await createCourse({ ...form, tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean) });
      onCreated?.(); onClose(); router.push(`/course/${course.id}`);
    } catch { setLoading(false); }
  };

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4" onMouseDown={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="create-course-title" className="w-full max-w-[560px] overflow-hidden rounded-xl border border-[#d9dee7] bg-white shadow-[0_24px_48px_rgb(16_24_40/18%)]" onMouseDown={event => event.stopPropagation()}>
      <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-6"><div><h2 id="create-course-title" className="text-[16px] font-bold tracking-[-.02em] text-[#182230]">Create a course</h2><p className="mt-0.5 text-[12px] text-[#667085]">Add the basics now; lessons can be imported later.</p></div><button type="button" onClick={onClose} aria-label="Close dialog" className="ui-btn ui-btn-ghost min-h-8 px-2"><X size={18} /></button></header>
      <form onSubmit={submit}><div className="space-y-5 p-5 sm:p-6"><div><label htmlFor="course-title" className="mb-1.5 block text-[12px] font-semibold text-[#344054]">Course title <span className="text-[#b42318]">*</span></label><input ref={titleRef} id="course-title" value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder="e.g. React Mastery" className="ui-input px-3 py-2.5" /></div><div><label htmlFor="course-description" className="mb-1.5 block text-[12px] font-semibold text-[#344054]">Description <span className="font-normal text-[#98a2b3]">(optional)</span></label><textarea id="course-description" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="What will you learn?" rows={3} className="ui-input resize-y px-3 py-2.5" /></div><div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="course-category" className="mb-1.5 block text-[12px] font-semibold text-[#344054]">Category</label><select id="course-category" value={form.category_id} onChange={event => setForm(current => ({ ...current, category_id: event.target.value }))} className="ui-input h-10 px-3"><option value="">Select category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.icon} {category.name}</option>)}</select></div><div><label htmlFor="course-tags" className="mb-1.5 block text-[12px] font-semibold text-[#344054]">Tags <span className="font-normal text-[#98a2b3]">(comma-separated)</span></label><input id="course-tags" value={form.tags} onChange={event => setForm(current => ({ ...current, tags: event.target.value }))} placeholder="react, hooks, state" className="ui-input h-10 px-3" /></div></div><fieldset><legend className="mb-2 text-[12px] font-semibold text-[#344054]">Course color</legend><div className="flex flex-wrap gap-2.5">{ACCENT_COLORS.map(color => { const active = form.color === color; return <button key={color} type="button" onClick={() => setForm(current => ({ ...current, color }))} className="flex size-7 items-center justify-center rounded-full ring-offset-2 transition-transform hover:scale-110" style={{ backgroundColor: color, boxShadow: active ? `0 0 0 2px white, 0 0 0 4px ${color}` : undefined }} aria-label={`Use ${color} for this course`} aria-pressed={active}>{active && <Check size={14} className="text-white" strokeWidth={3} />}</button>; })}</div></fieldset></div><footer className="flex justify-end gap-2 border-t border-[var(--line)] bg-[#fafbfc] px-5 py-4 sm:px-6"><button type="button" onClick={onClose} className="ui-btn ui-btn-secondary">Cancel</button><button type="submit" disabled={loading || !form.title.trim()} className="ui-btn ui-btn-primary">{loading ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : 'Create course'}</button></footer></form>
    </section>
  </div>;
}
