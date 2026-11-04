import { buildSnapshot } from '~/composables/freeride/liveheats';
import { createSyncer, TICK_MS } from '~/composables/freeride/schedule';
import { latestSnapshotJson, saveSnapshot } from '~/composables/freeride/snapshotStore';

// Crawls Liveheats on the adaptive schedule and stores the result in MySQL.
// Set FREERIDE_SYNC=off to disable (e.g. in dev).
export default defineNitroPlugin((nitroApp) => {
  if (process.env.FREERIDE_SYNC === 'off') return;

  const quietLog = {
    info: () => {},
    warn: (m: string) => console.warn(`[freeride] ${m}`),
  };

  const syncer = createSyncer({
    loadLatest: async () => {
      const row = await latestSnapshotJson(await useDb());
      if (!row) return null;
      const parsed = JSON.parse(row.json);
      return { fetchedAt: row.fetchedAt, events: parsed.events };
    },
    crawl: () => buildSnapshot(fetch, quietLog),
    save: async (s) => saveSnapshot(await useDb(), s),
    now: Date.now,
    log: {
      info: (m) => console.log(`[freeride] ${m}`),
      warn: (m) => console.warn(`[freeride] ${m}`),
    },
  });

  const run = () => {
    syncer.tick().catch((e) => console.warn('[freeride] sync tick error', e));
  };

  const first = setTimeout(run, 15_000);
  const interval = setInterval(run, TICK_MS);
  first.unref?.();
  interval.unref?.();

  nitroApp.hooks.hook('close', () => {
    clearTimeout(first);
    clearInterval(interval);
  });
});
