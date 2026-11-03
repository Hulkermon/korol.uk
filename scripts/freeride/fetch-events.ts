// One-off snapshot of 2026/27 FWT/FWQ/Junior European events from the Liveheats public API.
// Run: pnpm exec jiti scripts/freeride/fetch-events.ts
// Writes composables/freeride/data/events.json
import { mkdir, writeFile } from 'node:fs/promises';
import { buildSnapshot } from '../../composables/freeride/liveheats';

const OUT_DIR = new URL('../../composables/freeride/data/', import.meta.url);
const OUT_FILE = new URL('events.json', OUT_DIR);

async function main() {
  const { snapshot, dropped } = await buildSnapshot(fetch, {
    info: (msg) => console.log(msg),
    warn: (msg) => console.warn(msg),
  });
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n');

  const perTier: Record<string, number> = {};
  for (const e of snapshot.events) perTier[e.tier] = (perTier[e.tier] ?? 0) + 1;
  console.log(`\nWrote ${snapshot.events.length} events`);
  console.log('Per tier:', perTier);
  console.log('Dropped:', dropped);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
