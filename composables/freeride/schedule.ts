import type { EventSnapshot, FreerideEvent } from './types';
import type { BuildResult } from './liveheats';

export const FAST_MS = 30 * 60_000;
export const SLOW_MS = 6 * 3_600_000;
export const RETRY_MS = 30 * 60_000;
export const TICK_MS = 5 * 60_000;

const DAY_MS = 86_400_000;

/** FAST_MS when an event is about to start, running, or just ended; otherwise SLOW_MS. */
export function crawlInterval(events: Pick<FreerideEvent, 'start' | 'end'>[], now: number): number {
  const d = new Date(now);
  const today = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const live = events.some((e) => {
    const start = Date.parse(e.start);
    const end = Date.parse(e.end);
    return start - DAY_MS <= today && today <= end + 2 * DAY_MS;
  });
  return live ? FAST_MS : SLOW_MS;
}

export function isDue(args: {
  lastFetchedAt: string | null;
  lastFailedAt: number | null;
  events: Pick<FreerideEvent, 'start' | 'end'>[];
  now: number;
}): boolean {
  const { lastFetchedAt, lastFailedAt, events, now } = args;
  if (lastFailedAt !== null && now - lastFailedAt < RETRY_MS) return false;
  if (!lastFetchedAt) return true;
  return now - Date.parse(lastFetchedAt) >= crawlInterval(events, now);
}

export interface SyncerDeps {
  loadLatest(): Promise<{ fetchedAt: string; events: FreerideEvent[] } | null>;
  crawl(): Promise<BuildResult>;
  save(s: EventSnapshot): Promise<void>;
  now(): number;
  log: { info(m: string): void; warn(m: string): void };
}

export type TickResult = 'busy' | 'skipped' | 'crawled' | 'failed';

export function createSyncer(deps: SyncerDeps) {
  let loaded = false;
  let busy = false;
  let lastFetchedAt: string | null = null;
  let events: FreerideEvent[] = [];
  let lastFailedAt: number | null = null;

  async function tick(): Promise<TickResult> {
    if (busy) return 'busy';
    busy = true;
    try {
      if (!loaded) {
        try {
          const latest = await deps.loadLatest();
          lastFetchedAt = latest?.fetchedAt ?? null;
          events = latest?.events ?? [];
          loaded = true;
        } catch (err) {
          deps.log.warn(`freeride sync: could not load latest snapshot: ${String(err)}`);
          return 'skipped';
        }
      }
      const now = deps.now();
      if (!isDue({ lastFetchedAt, lastFailedAt, events, now })) return 'skipped';
      try {
        const result = await deps.crawl();
        const snap = result.snapshot;
        if (snap.events.length === 0 || (result.dropped['detail-failed'] ?? 0) > 0) {
          lastFailedAt = now;
          deps.log.warn('freeride sync: crawl incomplete, snapshot not saved');
          return 'failed';
        }
        await deps.save(snap);
        lastFetchedAt = snap.fetchedAt;
        events = snap.events;
        lastFailedAt = null;
        deps.log.info(`freeride sync: saved ${snap.events.length} events`);
        return 'crawled';
      } catch (err) {
        lastFailedAt = now;
        deps.log.warn(`freeride sync: failed: ${String(err)}`);
        return 'failed';
      }
    } finally {
      busy = false;
    }
  }

  return { tick };
}
