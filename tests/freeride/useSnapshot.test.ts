import { describe, it, expect, vi } from 'vitest';
import {
  SNAPSHOT_ENDPOINT,
  SNAPSHOT_KEY,
  isSnapshot,
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
    divisions: [],
  };
}

function snap(fetchedAt: string, ids: string[]): EventSnapshot {
  return { fetchedAt, season: '2026/27', source: 'test', events: ids.map(ev) };
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

  it('refresh loads, stores and exposes new data', async () => {
    const fresh = snap('2026-12-24T08:00:00.000Z', ['1', '2', '3', '4']);
    const storage = memStorage();
    const fetchFn = okFetch(fresh);
    const s = useSnapshot(bundled, storage, fetchFn);
    const p = s.refresh();
    expect(s.refreshing.value).toBe(true);
    await expect(p).resolves.toBe(true);
    expect(fetchFn).toHaveBeenCalledWith(SNAPSHOT_ENDPOINT);
    expect(s.refreshing.value).toBe(false);
    expect(s.error.value).toBeNull();
    expect(s.snapshot.value.events).toHaveLength(4);
    expect(JSON.parse(storage.data.get(SNAPSHOT_KEY)!).fetchedAt).toBe(fresh.fetchedAt);
  });

  it('keeps old data and sets error on an HTTP failure', async () => {
    const fetchFn = vi.fn(
      async () => ({ ok: false, status: 502, json: async () => ({}) }) as Response,
    );
    const s = useSnapshot(bundled, memStorage(), fetchFn);
    await expect(s.refresh()).resolves.toBe(false);
    expect(s.error.value).toBe('HTTP 502');
    expect(s.snapshot.value).toBe(bundled);
    expect(s.refreshing.value).toBe(false);
  });

  it('rejects an invalid payload', async () => {
    const storage = memStorage();
    const s = useSnapshot(bundled, storage, okFetch({ hello: 'world' }));
    await expect(s.refresh()).resolves.toBe(false);
    expect(s.error.value).toMatch(/Unexpected/);
    expect(s.snapshot.value).toBe(bundled);
    expect(storage.data.has(SNAPSHOT_KEY)).toBe(false);
  });

  it('still updates in memory when storage throws', async () => {
    const fresh = snap('2026-12-24T08:00:00.000Z', ['7']);
    const s = useSnapshot(bundled, memStorage(undefined, { throwOnSet: true }), okFetch(fresh));
    await expect(s.refresh()).resolves.toBe(true);
    expect(s.snapshot.value.events.map((e) => e.id)).toEqual(['7']);
  });

  it('keeps old data when fetch rejects', async () => {
    const s = useSnapshot(
      bundled,
      memStorage(),
      vi.fn(async () => Promise.reject(new Error('offline'))),
    );
    await expect(s.refresh()).resolves.toBe(false);
    expect(s.error.value).toBe('offline');
    expect(s.snapshot.value).toBe(bundled);
  });
});
