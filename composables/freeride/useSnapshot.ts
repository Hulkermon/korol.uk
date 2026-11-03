import { ref, shallowRef } from 'vue';
import type { Ref } from 'vue';
import type { EventSnapshot } from './types';
import { safeLocalStorage } from './usePlannerState';

export const SNAPSHOT_KEY = 'freeride-snapshot:v1';
export const SNAPSHOT_ENDPOINT = '/api/freeride/snapshot';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIERS = ['pro', 'challenger', 'qualifier', 'junior'];

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isEvent(e: unknown): boolean {
  if (!isObj(e)) return false;
  return (
    typeof e.id === 'string' &&
    typeof e.name === 'string' &&
    typeof e.tier === 'string' &&
    TIERS.includes(e.tier) &&
    (e.stars === null || [1, 2, 3, 4].includes(e.stars as number)) &&
    typeof e.start === 'string' &&
    DAY_RE.test(e.start) &&
    typeof e.end === 'string' &&
    DAY_RE.test(e.end) &&
    typeof e.lat === 'number' &&
    Number.isFinite(e.lat) &&
    typeof e.lng === 'number' &&
    Number.isFinite(e.lng) &&
    typeof e.url === 'string' &&
    typeof e.registerUrl === 'string' &&
    Array.isArray(e.divisions)
  );
}

export function isSnapshot(v: unknown): v is EventSnapshot {
  return (
    isObj(v) &&
    typeof v.fetchedAt === 'string' &&
    !Number.isNaN(Date.parse(v.fetchedAt)) &&
    Array.isArray(v.events) &&
    v.events.every(isEvent)
  );
}

function loadStored(storage: Storage | null): EventSnapshot | null {
  if (!storage) return null;
  try {
    const text = storage.getItem(SNAPSHOT_KEY);
    if (!text) return null;
    const data = JSON.parse(text);
    return isSnapshot(data) ? data : null;
  } catch {
    return null;
  }
}

const newer = (a: EventSnapshot, b: EventSnapshot) =>
  Date.parse(a.fetchedAt) > Date.parse(b.fetchedAt);

export function useSnapshot(
  bundled: EventSnapshot,
  storage: Storage | null = safeLocalStorage(),
  fetchFn?: typeof fetch,
) {
  const stored = loadStored(storage);
  const snapshot: Ref<EventSnapshot> = shallowRef(
    stored && newer(stored, bundled) ? stored : bundled,
  );
  const refreshing = ref(false);
  const error = ref<string | null>(null);

  // Returns true when new data was loaded; on failure the current data is kept.
  async function refresh(): Promise<boolean> {
    if (refreshing.value) return false;
    refreshing.value = true;
    error.value = null;
    try {
      const res = await (fetchFn ?? globalThis.fetch)(SNAPSHOT_ENDPOINT);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json();
      if (!isSnapshot(data)) throw new Error('Unexpected data from server');
      snapshot.value = data;
      try {
        storage?.setItem(SNAPSHOT_KEY, JSON.stringify(data));
      } catch {
        // quota or disabled storage: keep the refreshed data in memory only
      }
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      return false;
    } finally {
      refreshing.value = false;
    }
  }

  return { snapshot, refreshing, error, refresh };
}
