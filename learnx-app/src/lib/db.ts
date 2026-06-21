/**
 * DEPRECATED — replaced by src/lib/idb.ts (IndexedDB) and src/lib/service.ts.
 * This file is kept as an empty shim so that any stale import does not break.
 * Nothing here is used at runtime.
 */
export function getDb() {
  throw new Error('getDb() is deprecated. Use src/lib/service.ts instead.');
}
