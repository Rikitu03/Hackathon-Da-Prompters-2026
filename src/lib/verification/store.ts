import { PROFILE_IDS, documentRecordSchema, type DocumentRecord, type RecordMap } from "./contract";

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const storageKeyFor = (cycleId: string) => `gabayiskolar:verification:v1:${cycleId}`;

function parseStored(raw: string | null): RecordMap {
  if (!raw) return {};
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const map: RecordMap = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!(PROFILE_IDS as readonly string[]).includes(key)) continue;
    const parsed = documentRecordSchema.safeParse(entry);
    if (parsed.success && parsed.data.profileId === key) map[parsed.data.profileId] = parsed.data;
  }
  return map;
}

/**
 * Checked documents, kept per cycle in sessionStorage so they clear when the tab closes.
 * An in-memory copy is the source of truth for the visit, so private windows, blocked storage
 * and full quotas never stop a check from working: they only stop it surviving a reload.
 */
export function createRecordStore(getStorage: () => StorageLike | null) {
  const current = new Map<string, RecordMap>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const storage = () => {
    try {
      return getStorage();
    } catch {
      return null;
    }
  };

  function read(cycleId: string): RecordMap {
    const known = current.get(cycleId);
    if (known) return known;
    let raw: string | null = null;
    try {
      raw = storage()?.getItem(storageKeyFor(cycleId)) ?? null;
    } catch {
      raw = null;
    }
    const map = parseStored(raw);
    current.set(cycleId, map);
    return map;
  }

  return {
    read,
    /** Returns false when the record could not be kept for a reload. It is still available this visit. */
    save(cycleId: string, record: DocumentRecord): boolean {
      const next: RecordMap = { ...read(cycleId), [record.profileId]: record };
      current.set(cycleId, next);
      let persisted = false;
      try {
        const target = storage();
        if (target) {
          target.setItem(storageKeyFor(cycleId), JSON.stringify(next));
          persisted = true;
        }
      } catch {
        persisted = false;
      }
      notify();
      return persisted;
    },
    clear(cycleId: string): void {
      current.set(cycleId, {});
      try {
        storage()?.removeItem(storageKeyFor(cycleId));
      } catch {
        // Nothing stored that we could remove; the in-memory copy is already empty.
      }
      notify();
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export const recordStore = createRecordStore(browserStorage);
