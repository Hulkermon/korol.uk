import { ref, shallowRef } from 'vue';
import type { Ref } from 'vue';
import type { EventSnapshot } from './types';
import { safeLocalStorage } from './usePlannerState';

export const SNAPSHOT_KEY = 'freeride-snapshot:v2';
const OLD_SNAPSHOT_KEY = 'freeride-snapshot:v1';
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
    Array.isArray(e.divisions) &&
    e.divisions.every((d) => isObj(d) && Array.isArray(d.results))
  );
}

export function isSnapshot(v: unknown): v is EventSnapshot {
  return (
    isObj(v) &&
    typeof v.fetchedAt === 'string' &&
    !Number.isNaN(Date.parse(v.fetchedAt)) &&
    isObj(v.athletes) &&
    Array.isArray(v.events) &&
    v.events.every(isEvent)
  );
}

export function timeAgo(iso: string, now: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const mins = Math.floor(Math.max(0, now - t) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
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

export type SyncResult = 'updated' | 'unchanged' | 'failed';

export function useSnapshot(
  bundled: EventSnapshot,
  storage: Storage | null = safeLocalStorage(),
  fetchFn?: typeof fetch,
) {
  try {
    storage?.removeItem(OLD_SNAPSHOT_KEY);
  } catch {
    // ignore
  }
  const stored = loadStored(storage);
  const snapshot: Ref<EventSnapshot> = shallowRef(
    stored && newer(stored, bundled) ? stored : bundled,
  );
  const syncing = ref(false);
  const error = ref<string | null>(null);
  const lastSyncAt = ref<number | null>(null);
  let inFlight: Promise<SyncResult> | null = null;

  async function run(): Promise<SyncResult> {
    syncing.value = true;
    error.value = null;
    try {
      const url = `${SNAPSHOT_ENDPOINT}?since=${encodeURIComponent(snapshot.value.fetchedAt)}`;
      const res = await (fetchFn ?? globalThis.fetch)(url);
      if (res.status === 204) return 'unchanged';
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json();
      if (!isSnapshot(data)) throw new Error('Unexpected data from server');
      if (!newer(data, snapshot.value)) return 'unchanged';
      snapshot.value = data;
      try {
        storage?.setItem(SNAPSHOT_KEY, JSON.stringify(data));
      } catch {
        // quota or disabled storage: keep the new data in memory only
      }
      return 'updated';
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      return 'failed';
    } finally {
      syncing.value = false;
      lastSyncAt.value = Date.now();
    }
  }

  // On failure the current data is kept.
  function sync(): Promise<SyncResult> {
    if (inFlight) return inFlight;
    inFlight = run().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  return { snapshot, syncing, error, lastSyncAt, sync };
}
