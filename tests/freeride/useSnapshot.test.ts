import { describe, it, expect, vi } from 'vitest';
import {
  SNAPSHOT_ENDPOINT,
  SNAPSHOT_KEY,
  isSnapshot,
  timeAgo,
  useSnapshot,
} from '@/composables/freeride/useSnapshot';
import type { EventSnapshot, FreerideEvent } from '@/composables/freeride/types';

function ev(id: string): FreerideEvent {
  return {
    id,
    name: `Event ${id}`,
    tier: 'qualifier',
    stars: 2,
    start: '2027-02-22',
    end: '2027-02-24',
    place: 'Nendaz, Switzerland',
    countryCode: 'CH',
    lat: 46.18,
    lng: 7.29,
    status: 'upcoming',
    registrationMode: 'waitlist',
    price: { amountCents: 12400, currency: 'EUR' },
    url: `https://liveheats.com/events/${id}`,
    registerUrl: `https://liveheats.com/events/${id}/registration`,
    divisions: [{ id: 'd', name: 'Ski Men', results: [] } as never],
  };
}

function snap(fetchedAt: string, ids: string[]): EventSnapshot {
  return { fetchedAt, season: '2026/27', source: 'test', athletes: {}, events: ids.map(ev) };
}

const bundled = snap('2026-11-03T10:00:00.000Z', ['1', '2']);

function memStorage(initial?: unknown, opts: { throwOnSet?: boolean } = {}) {
  const data = new Map<string, string>();
  if (initial !== undefined)
    data.set(SNAPSHOT_KEY, typeof initial === 'string' ? initial : JSON.stringify(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (opts.throwOnSet) throw new Error('QuotaExceededError');
      data.set(k, v);
    },
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage & { data: Map<string, string> };
}

function okFetch(body: unknown) {
  return vi.fn(async () => ({ ok: true, status: 200, json: async () => body }) as Response);
}

describe('isSnapshot', () => {
  it('accepts a valid snapshot and rejects broken ones', () => {
    expect(isSnapshot(bundled)).toBe(true);
    expect(isSnapshot(null)).toBe(false);
    expect(isSnapshot({ fetchedAt: 'nope', events: [] })).toBe(false);
    expect(isSnapshot({ ...bundled, events: [{ ...ev('1'), lat: 'x' }] })).toBe(false);
    expect(isSnapshot({ ...bundled, events: [{ ...ev('1'), tier: 'elite' }] })).toBe(false);
  });

  it('requires athletes and division results', () => {
    const { athletes: _a, ...noAthletes } = bundled;
    expect(isSnapshot(noAthletes)).toBe(false);
    const noResults = { ...ev('1'), divisions: [{ id: 'd', name: 'x' }] };
    expect(isSnapshot({ ...bundled, events: [noResults] })).toBe(false);
  });
});

describe('useSnapshot', () => {
  it('uses the bundled snapshot when storage is empty', () => {
    expect(useSnapshot(bundled, memStorage()).snapshot.value).toBe(bundled);
  });

  it('uses the bundled snapshot when the stored one is older or corrupt', () => {
    const older = snap('2026-10-01T00:00:00.000Z', ['9']);
    expect(useSnapshot(bundled, memStorage(older)).snapshot.value).toBe(bundled);
    expect(useSnapshot(bundled, memStorage('{not json')).snapshot.value).toBe(bundled);
    expect(useSnapshot(bundled, null).snapshot.value).toBe(bundled);
  });

  it('uses the stored snapshot when it is newer', () => {
    const newer = snap('2026-12-01T00:00:00.000Z', ['1', '2', '3']);
    expect(useSnapshot(bundled, memStorage(newer)).snapshot.value.events).toHaveLength(3);
  });

  it('uses the v2 key and removes the v1 key', () => {
    expect(SNAPSHOT_KEY).toBe('freeride-snapshot:v2');
    const storage = memStorage();
    storage.data.set('freeride-snapshot:v1', '{}');
    useSnapshot(bundled, storage);
    expect(storage.data.has('freeride-snapshot:v1')).toBe(false);
  });

  it('sync sends since, then loads, stores and exposes newer data', async () => {
    const fresh = snap('2026-12-24T08:00:00.000Z', ['1', '2', '3', '4']);
    const storage = memStorage();
    const fetchFn = okFetch(fresh);
    const s = useSnapshot(bundled, storage, fetchFn);
    const p = s.sync();
    expect(s.syncing.value).toBe(true);
    await expect(p).resolves.toBe('updated');
    expect(fetchFn).toHaveBeenCalledWith(
      `${SNAPSHOT_ENDPOINT}?since=${encodeURIComponent(bundled.fetchedAt)}`,
    );
    expect(s.syncing.value).toBe(false);
    expect(s.error.value).toBeNull();
    expect(s.lastSyncAt.value).not.toBeNull();
    expect(s.snapshot.value.events).toHaveLength(4);
    expect(JSON.parse(storage.data.get(SNAPSHOT_KEY)!).fetchedAt).toBe(fresh.fetchedAt);
  });

  it('204 means unchanged', async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, status: 204 }) as Response);
    const s = useSnapshot(bundled, memStorage(), fetchFn);
    await expect(s.sync()).resolves.toBe('unchanged');
    expect(s.snapshot.value).toBe(bundled);
    expect(s.error.value).toBeNull();
  });

  it('200 with an older snapshot means unchanged', async () => {
    const storage = memStorage();
    const s = useSnapshot(bundled, storage, okFetch(snap('2026-10-01T00:00:00.000Z', ['9'])));
    await expect(s.sync()).resolves.toBe('unchanged');
    expect(s.snapshot.value).toBe(bundled);
    expect(storage.data.has(SNAPSHOT_KEY)).toBe(false);
  });

  it('concurrent syncs share the in-flight call', async () => {
    const fetchFn = okFetch(snap('2026-12-24T08:00:00.000Z', ['1']));
    const s = useSnapshot(bundled, memStorage(), fetchFn);
    const [a, b] = await Promise.all([s.sync(), s.sync()]);
    expect([a, b]).toEqual(['updated', 'updated']);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('keeps old data and sets error on an HTTP failure', async () => {
    const fetchFn = vi.fn(
      async () => ({ ok: false, status: 502, json: async () => ({}) }) as Response,
    );
    const s = useSnapshot(bundled, memStorage(), fetchFn);
    await expect(s.sync()).resolves.toBe('failed');
    expect(s.error.value).toBe('HTTP 502');
    expect(s.snapshot.value).toBe(bundled);
    expect(s.syncing.value).toBe(false);
    expect(s.lastSyncAt.value).not.toBeNull();
  });

  it('rejects an invalid payload', async () => {
    const storage = memStorage();
    const s = useSnapshot(bundled, storage, okFetch({ hello: 'world' }));
    await expect(s.sync()).resolves.toBe('failed');
    expect(s.error.value).toMatch(/Unexpected/);
    expect(s.snapshot.value).toBe(bundled);
    expect(storage.data.has(SNAPSHOT_KEY)).toBe(false);
  });

  it('still updates in memory when storage throws', async () => {
    const fresh = snap('2026-12-24T08:00:00.000Z', ['7']);
    const s = useSnapshot(bundled, memStorage(undefined, { throwOnSet: true }), okFetch(fresh));
    await expect(s.sync()).resolves.toBe('updated');
    expect(s.snapshot.value.events.map((e) => e.id)).toEqual(['7']);
  });

  it('keeps old data when fetch rejects', async () => {
    const s = useSnapshot(
      bundled,
      memStorage(),
      vi.fn(async () => Promise.reject(new Error('offline'))),
    );
    await expect(s.sync()).resolves.toBe('failed');
    expect(s.error.value).toBe('offline');
    expect(s.snapshot.value).toBe(bundled);
  });
});

describe('timeAgo', () => {
  const now = Date.parse('2026-11-04T12:00:00.000Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();
  it('buckets', () => {
    expect(timeAgo(ago(30_000), now)).toBe('just now');
    expect(timeAgo(ago(5 * 60_000), now)).toBe('5 min ago');
    expect(timeAgo(ago(3 * 3600_000), now)).toBe('3 h ago');
    expect(timeAgo(ago(2 * 86400_000), now)).toBe('2 d ago');
    expect(timeAgo('garbage', now)).toBe('garbage');
  });
});
