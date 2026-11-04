import { describe, it, expect } from 'vitest';
import {
  FAST_MS,
  SLOW_MS,
  RETRY_MS,
  crawlInterval,
  isDue,
  createSyncer,
} from '../../composables/freeride/schedule';
import type { EventSnapshot, FreerideEvent } from '../../composables/freeride/types';

const ev = [{ start: '2026-03-10', end: '2026-03-12' }];
const at = (iso: string) => Date.parse(iso);

describe('crawlInterval', () => {
  it('is fast from start-1 through end+2 and slow outside', () => {
    expect(crawlInterval(ev, at('2026-03-08T23:59:00Z'))).toBe(SLOW_MS);
    expect(crawlInterval(ev, at('2026-03-09T00:00:00Z'))).toBe(FAST_MS);
    expect(crawlInterval(ev, at('2026-03-14T23:59:00Z'))).toBe(FAST_MS);
    expect(crawlInterval(ev, at('2026-03-15T00:00:00Z'))).toBe(SLOW_MS);
  });
  it('is slow without events', () => {
    expect(crawlInterval([], at('2026-03-10T00:00:00Z'))).toBe(SLOW_MS);
  });
});

describe('isDue', () => {
  const now = at('2026-03-10T12:00:00Z');
  it('is due with no snapshot', () => {
    expect(isDue({ lastFetchedAt: null, lastFailedAt: null, events: [], now })).toBe(true);
  });
  it('is not due when fresh', () => {
    const f = new Date(now - FAST_MS + 1000).toISOString();
    expect(isDue({ lastFetchedAt: f, lastFailedAt: null, events: ev, now })).toBe(false);
  });
  it('is due when stale', () => {
    const f = new Date(now - FAST_MS).toISOString();
    expect(isDue({ lastFetchedAt: f, lastFailedAt: null, events: ev, now })).toBe(true);
  });
  it('is not due after a recent failure', () => {
    expect(isDue({ lastFetchedAt: null, lastFailedAt: now - RETRY_MS + 1, events: ev, now })).toBe(
      false,
    );
    expect(isDue({ lastFetchedAt: null, lastFailedAt: now - RETRY_MS, events: ev, now })).toBe(
      true,
    );
  });
});

describe('createSyncer', () => {
  const event = { id: 'e', start: '2026-03-10', end: '2026-03-12' } as FreerideEvent;
  const snap = (events: FreerideEvent[] = [event]) =>
    ({
      fetchedAt: '2026-03-10T12:00:00.000Z',
      season: '2026',
      source: 's',
      events,
    }) as EventSnapshot;

  function setup(over: Partial<Parameters<typeof createSyncer>[0]> = {}) {
    let now = at('2026-03-10T12:00:00Z');
    const saved: EventSnapshot[] = [];
    const logs: string[] = [];
    const deps = {
      loadLatest: async () => null,
      crawl: async () => ({ snapshot: snap(), dropped: {} }),
      save: async (s: EventSnapshot) => {
        saved.push(s);
      },
      now: () => now,
      log: { info: (m: string) => logs.push(m), warn: (m: string) => logs.push(m) },
      ...over,
    };
    return { syncer: createSyncer(deps), saved, logs, advance: (ms: number) => (now += ms) };
  }

  it('crawls and saves when there is no snapshot, then skips', async () => {
    const { syncer, saved } = setup();
    expect(await syncer.tick()).toBe('crawled');
    expect(saved).toHaveLength(1);
    expect(await syncer.tick()).toBe('skipped');
    expect(saved).toHaveLength(1);
  });

  it('returns busy while a tick is in flight', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const { syncer } = setup({
      crawl: async () => {
        await gate;
        return { snapshot: snap(), dropped: {} };
      },
    });
    const first = syncer.tick();
    expect(await syncer.tick()).toBe('busy');
    release();
    expect(await first).toBe('crawled');
  });

  it('skips when the DB is down and retries loading next tick', async () => {
    let calls = 0;
    const { syncer } = setup({
      loadLatest: async () => {
        if (calls++ === 0) throw new Error('db down');
        return { fetchedAt: new Date(at('2026-03-10T12:00:00Z')).toISOString(), events: [event] };
      },
    });
    expect(await syncer.tick()).toBe('skipped');
    expect(await syncer.tick()).toBe('skipped'); // loaded, fresh
    expect(calls).toBe(2);
  });

  it('fails on empty result without saving', async () => {
    const { syncer, saved } = setup({
      crawl: async () => ({ snapshot: snap([]), dropped: {} }),
    });
    expect(await syncer.tick()).toBe('failed');
    expect(saved).toHaveLength(0);
  });

  it('fails on detail-failed', async () => {
    const { syncer, saved } = setup({
      crawl: async () => ({ snapshot: snap(), dropped: { 'detail-failed': 1 } }),
    });
    expect(await syncer.tick()).toBe('failed');
    expect(saved).toHaveLength(0);
  });

  it('fails on throw in crawl or save', async () => {
    const a = setup({
      crawl: async () => {
        throw new Error('boom');
      },
    });
    expect(await a.syncer.tick()).toBe('failed');
    const b = setup({
      save: async () => {
        throw new Error('boom');
      },
    });
    expect(await b.syncer.tick()).toBe('failed');
  });

  it('backs off after failure then retries', async () => {
    let fail = true;
    const { syncer, saved, advance } = setup({
      crawl: async () => {
        if (fail) throw new Error('x');
        return { snapshot: snap(), dropped: {} };
      },
    });
    expect(await syncer.tick()).toBe('failed');
    fail = false;
    advance(RETRY_MS - 1);
    expect(await syncer.tick()).toBe('skipped');
    advance(1);
    expect(await syncer.tick()).toBe('crawled');
    expect(saved).toHaveLength(1);
  });
});
