/**
 * LearnX IndexedDB layer — replaces better-sqlite3 entirely.
 * All data is stored locally in the browser; nothing leaves the device.
 */

const DB_NAME = 'learnx';
const DB_VERSION = 1;

// ──────────────────────────────────────────────
// Store names
// ──────────────────────────────────────────────
export const STORES = {
  categories: 'categories',
  courses: 'courses',
  modules: 'modules',
  lessons: 'lessons',
  progress: 'progress',
  notes: 'notes',
  bookmarks: 'bookmarks',
  activityLog: 'activity_log',
  settings: 'settings',
  /** Stores FileSystemFileHandle objects keyed by lesson id */
  fileHandles: 'file_handles',
} as const;

// ──────────────────────────────────────────────
// Open / init
// ──────────────────────────────────────────────
let _db: IDBDatabase | null = null;

export async function openDb(): Promise<IDBDatabase> {
  if (_db) return _db;

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      const createStore = (name: string, keyPath: string, indexes: [string, string, IDBIndexParameters?][] = []) => {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath });
          indexes.forEach(([idxName, field, opts]) => store.createIndex(idxName, field, opts));
        }
      };

      createStore(STORES.categories, 'id');
      createStore(STORES.courses, 'id', [['by_updated', 'updated_at']]);
      createStore(STORES.modules, 'id', [['by_course', 'course_id'], ['by_order', 'order_index']]);
      createStore(STORES.lessons, 'id', [
        ['by_course', 'course_id'],
        ['by_module', 'module_id'],
        ['by_order', 'order_index'],
      ]);
      createStore(STORES.progress, 'lesson_id'); // keyed by lesson_id for easy upsert
      createStore(STORES.notes, 'id', [['by_lesson', 'lesson_id'], ['by_course', 'course_id']]);
      createStore(STORES.bookmarks, 'id', [['by_lesson', 'lesson_id']]);
      createStore(STORES.activityLog, 'id', [['by_date', 'date']]);
      createStore(STORES.settings, 'key');
      createStore(STORES.fileHandles, 'lesson_id');
    };

    req.onsuccess = async (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      await seedDefaults(_db!);
      resolve(_db!);
    };

    req.onerror = () => reject(req.error);
  });
}

// ──────────────────────────────────────────────
// Generic CRUD helpers
// ──────────────────────────────────────────────
export async function dbGet<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetAll<T>(store: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetByIndex<T>(store: string, indexName: string, value: IDBValidKey): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).index(indexName).getAll(value);
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function dbPut<T>(store: string, value: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbDelete(store: string, key: IDBValidKey): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Delete all records whose index field matches value */
export async function dbDeleteByIndex(store: string, indexName: string, value: IDBValidKey): Promise<void> {
  const items = await dbGetByIndex<{ id?: string; lesson_id?: string }>(store, indexName, value);
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    items.forEach((item) => {
      const key = item.id ?? item.lesson_id;
      if (key) os.delete(key);
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbCount(store: string): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ──────────────────────────────────────────────
// Seed default categories
// ──────────────────────────────────────────────
async function seedDefaults(db: IDBDatabase) {
  const count = await dbCount(STORES.categories);
  if (count > 0) return;

  const categories = [
    { id: 'cat-webdev', name: 'Web Development', icon: '🌐', color: '#7c6ef7' },
    { id: 'cat-dsa', name: 'Data Structures & Algorithms', icon: '🧮', color: '#f97316' },
    { id: 'cat-design', name: 'UI/UX Design', icon: '🎨', color: '#ec4899' },
    { id: 'cat-ml', name: 'Machine Learning', icon: '🤖', color: '#22c55e' },
    { id: 'cat-devops', name: 'DevOps & Cloud', icon: '☁️', color: '#06b6d4' },
    { id: 'cat-mobile', name: 'Mobile Development', icon: '📱', color: '#a855f7' },
    { id: 'cat-other', name: 'Other', icon: '📖', color: '#6b7280' },
  ];

  await Promise.all(categories.map((c) => dbPut(STORES.categories, c)));
}
