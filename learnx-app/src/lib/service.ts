/**
 * LearnX client-side data service — replaces all /api/* Next.js routes.
 * Runs entirely in the browser; reads/writes IndexedDB.
 * Never uploads anything to a server.
 */

import {
  openDb,
  dbGet, dbGetAll, dbGetByIndex,
  dbPut, dbDelete, dbDeleteByIndex, dbCount,
  STORES,
} from './idb';
import { generateId } from './utils';
import type {
  Category, Course, Module, Lesson, Progress,
  Note, Bookmark, DashboardStats,
} from '@/types';

// ────────────────────────────────────────────────
// CATEGORIES
// ────────────────────────────────────────────────
export async function getCategories(): Promise<Category[]> {
  await openDb();
  const cats = await dbGetAll<Category>(STORES.categories);
  return cats.sort((a, b) => a.name.localeCompare(b.name));
}

// ────────────────────────────────────────────────
// COURSES
// ────────────────────────────────────────────────
export async function getCourses(): Promise<(Course & { totalLessons: number; completedLessons: number; progress: number; categoryName?: string })[]> {
  await openDb();
  const [courses, categories, lessons, progressList] = await Promise.all([
    dbGetAll<Course>(STORES.courses),
    dbGetAll<Category>(STORES.categories),
    dbGetAll<Lesson>(STORES.lessons),
    dbGetAll<Progress>(STORES.progress),
  ]);

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
  const completedSet = new Set(progressList.filter(p => p.completed).map(p => p.lesson_id));

  return courses
    .sort((a, b) => b.updated_at - a.updated_at)
    .map(course => {
      const cLessons = lessons.filter(l => l.course_id === course.id);
      const completed = cLessons.filter(l => completedSet.has(l.id)).length;
      return {
        ...course,
        tags: Array.isArray(course.tags) ? course.tags : JSON.parse((course.tags as any) || '[]'),
        totalLessons: cLessons.length,
        completedLessons: completed,
        progress: cLessons.length > 0 ? Math.round((completed / cLessons.length) * 100) : 0,
        categoryName: catMap[course.category_id]?.name,
      };
    });
}

export async function getCourse(courseId: string): Promise<(Course & { modules: (Module & { lessons: (Lesson & { completed: boolean; position: number; watch_time: number })[] })[] }) | null> {
  await openDb();
  const [course, categories] = await Promise.all([
    dbGet<Course>(STORES.courses, courseId),
    dbGetAll<Category>(STORES.categories),
  ]);
  if (!course) return null;

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
  const modules = (await dbGetByIndex<Module>(STORES.modules, 'by_course', courseId))
    .sort((a, b) => a.order_index - b.order_index);

  const modulesWithLessons = await Promise.all(
    modules.map(async mod => {
      const lessons = (await dbGetByIndex<Lesson>(STORES.lessons, 'by_module', mod.id))
        .sort((a, b) => a.order_index - b.order_index);
      const withProgress = await Promise.all(
        lessons.map(async l => {
          const p = await dbGet<Progress>(STORES.progress, l.id);
          return {
            ...l,
            completed: !!(p?.completed),
            position: p?.position ?? 0,
            watch_time: p?.watch_time ?? 0,
          };
        })
      );
      return { ...mod, lessons: withProgress };
    })
  );

  return {
    ...course,
    tags: Array.isArray(course.tags) ? course.tags : JSON.parse((course.tags as any) || '[]'),
    categoryName: catMap[course.category_id]?.name,
    modules: modulesWithLessons,
  };
}

export async function createCourse(body: Partial<Course>): Promise<Course> {
  await openDb();
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);
  const course: Course = {
    id,
    title: body.title || 'Untitled Course',
    description: body.description || '',
    category_id: body.category_id || 'cat-other',
    thumbnail: '',
    color: body.color || '#2563a6',
    tags: body.tags || [],
    created_at: now,
    updated_at: now,
  };
  await dbPut(STORES.courses, course);

  // Default module
  const modId = generateId();
  await dbPut(STORES.modules, {
    id: modId, course_id: id,
    title: 'Module 1', order_index: 0, created_at: now,
  });

  return course;
}

export async function updateCourse(courseId: string, body: Partial<Course>): Promise<void> {
  const existing = await dbGet<Course>(STORES.courses, courseId);
  if (!existing) return;
  await dbPut(STORES.courses, {
    ...existing,
    ...body,
    tags: body.tags ?? existing.tags,
    updated_at: Math.floor(Date.now() / 1000),
  });
}

export async function deleteCourse(courseId: string): Promise<void> {
  const modules = await dbGetByIndex<Module>(STORES.modules, 'by_course', courseId);
  for (const mod of modules) {
    const lessons = await dbGetByIndex<Lesson>(STORES.lessons, 'by_module', mod.id);
    for (const l of lessons) {
      await dbDelete(STORES.progress, l.id);
      await dbDeleteByIndex(STORES.notes, 'by_lesson', l.id);
      await dbDeleteByIndex(STORES.bookmarks, 'by_lesson', l.id);
      await dbDelete(STORES.fileHandles, l.id);
      await dbDelete(STORES.lessons, l.id);
    }
    await dbDelete(STORES.modules, mod.id);
  }
  await dbDelete(STORES.courses, courseId);
}

// ────────────────────────────────────────────────
// MODULES
// ────────────────────────────────────────────────
export async function getModules(courseId: string): Promise<Module[]> {
  await openDb();
  const mods = await dbGetByIndex<Module>(STORES.modules, 'by_course', courseId);
  return mods.sort((a, b) => a.order_index - b.order_index);
}

export async function createModule(body: Partial<Module>): Promise<Module> {
  await openDb();
  const existing = await getModules(body.course_id!);
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);
  const mod: Module = {
    id,
    course_id: body.course_id!,
    title: body.title || 'New Module',
    order_index: existing.length,
    created_at: now,
  };
  await dbPut(STORES.modules, mod);
  return mod;
}

// ────────────────────────────────────────────────
// LESSONS
// ────────────────────────────────────────────────
export async function getLesson(lessonId: string): Promise<(Lesson & { completed: boolean; position: number; watch_time: number; last_watched: number }) | null> {
  await openDb();
  const lesson = await dbGet<Lesson>(STORES.lessons, lessonId);
  if (!lesson) return null;
  const p = await dbGet<Progress>(STORES.progress, lessonId);
  return {
    ...lesson,
    completed: !!(p?.completed),
    position: p?.position ?? 0,
    watch_time: p?.watch_time ?? 0,
    last_watched: p?.last_watched ?? 0,
  };
}

export async function getLessons(moduleId: string): Promise<(Lesson & { completed: boolean; position: number })[]> {
  await openDb();
  const lessons = (await dbGetByIndex<Lesson>(STORES.lessons, 'by_module', moduleId))
    .sort((a, b) => a.order_index - b.order_index);
  return Promise.all(lessons.map(async l => {
    const p = await dbGet<Progress>(STORES.progress, l.id);
    return { ...l, completed: !!(p?.completed), position: p?.position ?? 0 };
  }));
}

export async function createLesson(body: Partial<Lesson>): Promise<Lesson> {
  await openDb();
  const existing = await getLessons(body.module_id!);
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);
  const lesson: Lesson = {
    id,
    module_id: body.module_id!,
    course_id: body.course_id!,
    title: body.title || 'New Lesson',
    type: body.type || 'video',
    file_path: body.file_path || '',
    duration: body.duration || 0,
    order_index: existing.length,
    created_at: now,
  };
  await dbPut(STORES.lessons, lesson);
  return lesson;
}

// ────────────────────────────────────────────────
// PROGRESS
// ────────────────────────────────────────────────
export async function getProgress(lessonId: string): Promise<Progress> {
  await openDb();
  const p = await dbGet<Progress>(STORES.progress, lessonId);
  return p ?? { id: generateId(), lesson_id: lessonId, user_id: 'local', position: 0, completed: 0, last_watched: 0, watch_time: 0 };
}

export async function saveProgress(body: {
  lesson_id: string;
  position?: number;
  completed?: boolean;
  watch_time?: number;
}): Promise<void> {
  await openDb();
  const now = Math.floor(Date.now() / 1000);
  const existing = await dbGet<Progress>(STORES.progress, body.lesson_id);
  const next: Progress = {
    id: existing?.id ?? generateId(),
    lesson_id: body.lesson_id,
    user_id: 'local',
    position: body.position ?? existing?.position ?? 0,
    completed: body.completed !== undefined ? (body.completed ? 1 : 0) : (existing?.completed ?? 0),
    last_watched: now,
    watch_time: body.watch_time !== undefined
      ? (existing?.watch_time ?? 0) + body.watch_time
      : (existing?.watch_time ?? 0),
  };
  await dbPut(STORES.progress, next);

  // Activity log
  if (body.watch_time && body.watch_time > 0) {
    const today = new Date().toISOString().split('T')[0];
    const allLogs = await dbGetAll<{ id: string; date: string; lesson_id: string; duration: number; type: string }>(STORES.activityLog);
    const todayLog = allLogs.find(l => l.date === today && l.lesson_id === body.lesson_id);
    if (todayLog) {
      await dbPut(STORES.activityLog, { ...todayLog, duration: todayLog.duration + body.watch_time });
    } else {
      await dbPut(STORES.activityLog, {
        id: generateId(), date: today, lesson_id: body.lesson_id,
        duration: body.watch_time, type: 'watch',
      });
    }
  }
}

// ────────────────────────────────────────────────
// NOTES
// ────────────────────────────────────────────────
export async function getNotes(opts: { lessonId?: string; courseId?: string }): Promise<Note[]> {
  await openDb();
  let notes: Note[];
  if (opts.lessonId) {
    notes = await dbGetByIndex<Note>(STORES.notes, 'by_lesson', opts.lessonId);
  } else if (opts.courseId) {
    const all = await dbGetByIndex<Note>(STORES.notes, 'by_course', opts.courseId);
    notes = all.filter(n => !n.lesson_id);
  } else {
    notes = await dbGetAll<Note>(STORES.notes);
  }
  return notes
    .map(n => ({ ...n, tags: Array.isArray(n.tags) ? n.tags : JSON.parse((n.tags as any) || '[]') }))
    .sort((a, b) => b.updated_at - a.updated_at);
}

export async function createNote(body: Partial<Note>): Promise<Note> {
  await openDb();
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);
  const note: Note = {
    id, lesson_id: body.lesson_id ?? null,
    course_id: body.course_id ?? null,
    content: body.content || '',
    timestamp_ref: body.timestamp_ref ?? null,
    tags: body.tags || [],
    created_at: now, updated_at: now,
  };
  await dbPut(STORES.notes, note);
  return note;
}

export async function updateNote(body: { id: string; content: string; tags?: string[] }): Promise<void> {
  const existing = await dbGet<Note>(STORES.notes, body.id);
  if (!existing) return;
  await dbPut(STORES.notes, {
    ...existing,
    content: body.content,
    tags: body.tags ?? existing.tags,
    updated_at: Math.floor(Date.now() / 1000),
  });
}

export async function deleteNote(id: string): Promise<void> {
  await dbDelete(STORES.notes, id);
}

// ────────────────────────────────────────────────
// BOOKMARKS
// ────────────────────────────────────────────────
export async function getBookmarks(lessonId: string): Promise<Bookmark[]> {
  await openDb();
  const bks = await dbGetByIndex<Bookmark>(STORES.bookmarks, 'by_lesson', lessonId);
  return bks.sort((a, b) => a.timestamp - b.timestamp);
}

export async function createBookmark(body: Partial<Bookmark>): Promise<Bookmark> {
  await openDb();
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);
  const bk: Bookmark = {
    id, lesson_id: body.lesson_id!,
    timestamp: body.timestamp!, label: body.label || '',
    created_at: now,
  };
  await dbPut(STORES.bookmarks, bk);
  return bk;
}

export async function deleteBookmark(id: string): Promise<void> {
  await dbDelete(STORES.bookmarks, id);
}

// ────────────────────────────────────────────────
// SEARCH
// ────────────────────────────────────────────────
export async function search(q: string) {
  if (!q.trim()) return [];
  await openDb();
  const lq = q.toLowerCase();

  const [courses, lessons, notes, allCourses] = await Promise.all([
    dbGetAll<Course>(STORES.courses),
    dbGetAll<Lesson>(STORES.lessons),
    dbGetAll<Note>(STORES.notes),
    dbGetAll<Course>(STORES.courses),
  ]);

  const courseMap = Object.fromEntries(allCourses.map(c => [c.id, c]));

  const matchCourses = courses
    .filter(c => c.title.toLowerCase().includes(lq) || (c.description || '').toLowerCase().includes(lq))
    .slice(0, 5)
    .map(c => ({ type: 'course', id: c.id, title: c.title, subtitle: c.description, course_id: c.id }));

  const matchLessons = lessons
    .filter(l => l.title.toLowerCase().includes(lq))
    .slice(0, 10)
    .map(l => ({ type: 'lesson', id: l.id, title: l.title, subtitle: courseMap[l.course_id]?.title || '', course_id: l.course_id, lesson_id: l.id }));

  const matchNotes = notes
    .filter(n => n.content.toLowerCase().includes(lq))
    .slice(0, 5)
    .map(n => ({
      type: 'note', id: n.id,
      title: n.content.slice(0, 60),
      subtitle: n.lesson_id ? 'Lesson Note' : 'Course Note',
      course_id: n.course_id, lesson_id: n.lesson_id,
    }));

  return [...matchCourses, ...matchLessons, ...matchNotes];
}

// ────────────────────────────────────────────────
// STATS (dashboard)
// ────────────────────────────────────────────────
export async function getStats(): Promise<DashboardStats> {
  await openDb();
  const [courses, lessons, progressList, activityLogs] = await Promise.all([
    dbGetAll<Course>(STORES.courses),
    dbGetAll<Lesson>(STORES.lessons),
    dbGetAll<Progress>(STORES.progress),
    dbGetAll<{ id: string; date: string; lesson_id: string; duration: number }>(STORES.activityLog),
  ]);

  const totalCourses = courses.length;
  const totalLessons = lessons.length;
  const completedLessons = progressList.filter(p => p.completed).length;
  const totalWatchTime = progressList.reduce((s, p) => s + (p.watch_time || 0), 0);

  const today = new Date().toISOString().split('T')[0];
  const todaySeconds = activityLogs
    .filter(l => l.date === today)
    .reduce((s, l) => s + l.duration, 0);

  // Streak
  const uniqueDates = [...new Set(activityLogs.map(l => l.date))].sort().reverse();
  let streak = 0;
  const checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);
  for (const d of uniqueDates) {
    const expected = new Date(checkDate);
    expected.setDate(expected.getDate() - streak);
    expected.setHours(0, 0, 0, 0);
    if (new Date(d).toDateString() === expected.toDateString()) streak++;
    else break;
  }

  // Continue watching
  const courseMap = Object.fromEntries(courses.map(c => [c.id, c]));
  const lessonMap = Object.fromEntries(lessons.map(l => [l.id, l]));

  const continueWatching = progressList
    .filter(p => !p.completed && p.position > 30)
    .sort((a, b) => b.last_watched - a.last_watched)
    .slice(0, 5)
    .map(p => {
      const l = lessonMap[p.lesson_id];
      const c = l ? courseMap[l.course_id] : null;
      if (!l || !c) return null;
      return {
        lesson_id: l.id, lesson_title: l.title,
        course_id: c.id, course_title: c.title, color: c.color,
        position: p.position, duration: l.duration,
        progress_pct: l.duration > 0 ? Math.round((p.position / l.duration) * 100) : 0,
      };
    })
    .filter(Boolean);

  const recentActivity = progressList
    .sort((a, b) => b.last_watched - a.last_watched)
    .slice(0, 8)
    .map(p => {
      const l = lessonMap[p.lesson_id];
      const c = l ? courseMap[l.course_id] : null;
      if (!l || !c) return null;
      return {
        lesson_id: l.id, lesson_title: l.title,
        course_id: c.id, course_title: c.title,
        position: p.position, duration: l.duration,
        last_watched: p.last_watched,
      };
    })
    .filter(Boolean);

  return {
    totalCourses, totalLessons, completedLessons,
    totalHoursLearned: Math.round((totalWatchTime / 3600) * 10) / 10,
    streak,
    todayMinutes: Math.floor(todaySeconds / 60),
    continueWatching: continueWatching as any,
    recentActivity: recentActivity as any,
  };
}

// ────────────────────────────────────────────────
// FILE HANDLES (FSAA — File System Access API)
// ────────────────────────────────────────────────

/** Save a FileSystemFileHandle associated with a lesson. */
export async function saveFileHandle(lessonId: string, handle: FileSystemFileHandle): Promise<void> {
  await dbPut(STORES.fileHandles, { lesson_id: lessonId, handle });
}

/** Get a stored FileSystemFileHandle for a lesson. */
export async function getFileHandle(lessonId: string): Promise<FileSystemFileHandle | null> {
  const rec = await dbGet<{ lesson_id: string; handle: FileSystemFileHandle }>(STORES.fileHandles, lessonId);
  return rec?.handle ?? null;
}

/**
 * Request read permission on a stored handle.
 * Returns true if permission was granted.
 */
export async function verifyPermission(handle: FileSystemFileHandle): Promise<boolean> {
  const opts: FileSystemHandlePermissionDescriptor = { mode: 'read' };
  if ((await (handle as any).queryPermission(opts)) === 'granted') return true;
  if ((await (handle as any).requestPermission(opts)) === 'granted') return true;
  return false;
}

/**
 * Get a blob URL for a lesson's file.
 * Stores the objectURL so the caller can revoke it when done.
 */
export async function getMediaUrl(lessonId: string): Promise<{ url: string; revoke: () => void } | null> {
  const handle = await getFileHandle(lessonId);
  if (!handle) return null;
  const ok = await verifyPermission(handle);
  if (!ok) return null;
  const file = await handle.getFile();
  const url = URL.createObjectURL(file);
  return { url, revoke: () => URL.revokeObjectURL(url) };
}

// ────────────────────────────────────────────────
// FOLDER IMPORT (File System Access API)
// ────────────────────────────────────────────────

const SUPPORTED = ['mp4', 'mkv', 'webm', 'avi', 'mov', 'ts', 'pdf'];

function isSupportedMedia(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return SUPPORTED.includes(ext);
}

function cleanTitle(filename: string): string {
  let t = filename.replace(/\.[^/.]+$/, '');   // remove ext
  t = t.replace(/^[\d\s._-]+/, '');            // remove leading numbers
  return t || filename;
}

/**
 * Recursively collect all supported media files under `dirHandle`,
 * preserving a stable sort order at each directory level.
 * Returns flat array of { name, handle } in depth-first, alpha-sorted order.
 */
async function collectMediaFiles(
  dirHandle: FileSystemDirectoryHandle
): Promise<{ name: string; handle: FileSystemFileHandle }[]> {
  const entries: { name: string; kind: string; handle: FileSystemHandle }[] = [];
  for await (const [name, handle] of (dirHandle as any).entries()) {
    entries.push({ name, kind: handle.kind, handle });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));

  const results: { name: string; handle: FileSystemFileHandle }[] = [];
  for (const entry of entries) {
    if (entry.kind === 'file' && isSupportedMedia(entry.name)) {
      results.push({ name: entry.name, handle: entry.handle as FileSystemFileHandle });
    } else if (entry.kind === 'directory' && !entry.name.startsWith('.')) {
      // Recurse into sub-directories at any depth
      const nested = await collectMediaFiles(entry.handle as FileSystemDirectoryHandle);
      results.push(...nested);
    }
  }
  return results;
}

export async function importFolder(): Promise<{
  course: Course;
  stats: { modules: number; lessons: number };
} | null> {
  // Ask user to pick a directory
  let dirHandle: FileSystemDirectoryHandle;
  try {
    dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
  } catch {
    return null; // user cancelled
  }

  const courseName = dirHandle.name;
  const courseId = generateId();
  const now = Math.floor(Date.now() / 1000);

  const course: Course = {
    id: courseId,
    title: courseName,
    description: `Imported from local folder "${courseName}"`,
    category_id: 'cat-other',
    thumbnail: '',
    color: '#2563a6',
    tags: [],
    created_at: now,
    updated_at: now,
  };
  await dbPut(STORES.courses, course);

  let moduleCount = 0;
  let lessonCount = 0;

  // Collect top-level entries
  const entries: { name: string; kind: string; handle: FileSystemHandle }[] = [];
  for await (const [name, handle] of (dirHandle as any).entries()) {
    entries.push({ name, kind: handle.kind, handle });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));

  // Loose files in root → "General" module
  const looseFiles = entries.filter(
    e => e.kind === 'file' && isSupportedMedia(e.name)
  );

  if (looseFiles.length > 0) {
    const modId = generateId();
    await dbPut(STORES.modules, {
      id: modId, course_id: courseId,
      title: 'General', order_index: moduleCount++, created_at: now,
    });
    for (let i = 0; i < looseFiles.length; i++) {
      const { name, handle } = looseFiles[i];
      const lessonId = generateId();
      const ext = name.split('.').pop()?.toLowerCase() ?? '';
      const type = ext === 'pdf' ? 'pdf' : 'video';
      await dbPut(STORES.lessons, {
        id: lessonId, module_id: modId, course_id: courseId,
        title: cleanTitle(name), type, file_path: name,
        duration: 0, order_index: i, created_at: now,
      });
      await saveFileHandle(lessonId, handle as FileSystemFileHandle);
      lessonCount++;
    }
  }

  // Sub-folders → modules; each folder is walked recursively so that
  // Course/Module/Week1/lesson.mp4 is found just as well as Course/Module/lesson.mp4
  const subFolders = entries.filter(
    e => e.kind === 'directory' && !e.name.startsWith('.')
  );

  for (const folder of subFolders) {
    const modId = generateId();
    await dbPut(STORES.modules, {
      id: modId, course_id: courseId,
      title: folder.name, order_index: moduleCount++, created_at: now,
    });

    // Recursively collect all media files anywhere inside this subfolder
    const mediaFiles = await collectMediaFiles(folder.handle as FileSystemDirectoryHandle);
    for (let i = 0; i < mediaFiles.length; i++) {
      const { name, handle } = mediaFiles[i];
      const lessonId = generateId();
      const ext = name.split('.').pop()?.toLowerCase() ?? '';
      const type = ext === 'pdf' ? 'pdf' : 'video';
      await dbPut(STORES.lessons, {
        id: lessonId, module_id: modId, course_id: courseId,
        title: cleanTitle(name), type, file_path: name,
        duration: 0, order_index: i, created_at: now,
      });
      await saveFileHandle(lessonId, handle);
      lessonCount++;
    }
  }

  return { course, stats: { modules: moduleCount, lessons: lessonCount } };
}
