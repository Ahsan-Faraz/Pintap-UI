import { createSeedData, type MockDb } from "./seed";

const STORAGE_KEY = "pintap:mock-db:v1";

/**
 * Mutable in-memory mock database. A single instance persists for the browser
 * session (and survives dev Fast Refresh via globalThis). Browser sessions also
 * mirror writes to localStorage so mock workflows survive route reloads.
 */
declare global {
  var __pintapMockDb: MockDb | undefined;
}

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readStoredDb(): MockDb | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MockDb) : null;
  } catch {
    return null;
  }
}

export function saveDb(value: MockDb = db()): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Mock persistence should never break the UI.
  }
}

export function db(): MockDb {
  if (!globalThis.__pintapMockDb) {
    globalThis.__pintapMockDb = readStoredDb() ?? createSeedData();
  }
  return globalThis.__pintapMockDb;
}

/** Restore the seed dataset (used by a "reset demo data" affordance). */
export function resetDb(): MockDb {
  globalThis.__pintapMockDb = createSeedData();
  saveDb(globalThis.__pintapMockDb);
  return globalThis.__pintapMockDb;
}

export type { MockDb };
