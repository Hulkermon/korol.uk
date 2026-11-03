import { buildSnapshot } from '~/composables/freeride/liveheats';
import type { EventSnapshot } from '~/composables/freeride/types';

// Proxies a fresh Liveheats crawl for the freeride planner (Liveheats sends no CORS headers,
// so the browser can't call it directly). Results are cached in memory and concurrent
// requests share one crawl, so repeated clicks don't hammer Liveheats.
const CACHE_MS = 10 * 60 * 1000;

let cached: { at: number; snapshot: EventSnapshot } | null = null;
let inFlight: Promise<EventSnapshot> | null = null;

export default defineEventHandler(async () => {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.snapshot;
  if (!inFlight) {
    inFlight = buildSnapshot(fetch)
      .then(({ snapshot }) => {
        cached = { at: Date.now(), snapshot };
        return snapshot;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  try {
    return await inFlight;
  } catch (e) {
    console.error('[freeride] snapshot refresh failed', e);
    throw createError({ statusCode: 502, statusMessage: 'Liveheats refresh failed' });
  }
});
