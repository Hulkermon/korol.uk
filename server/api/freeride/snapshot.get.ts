import { latestMeta, latestSnapshotJson } from '~/composables/freeride/snapshotStore';

// Serves the snapshot stored by the freeride-sync plugin. Never calls Liveheats.
// `?since=<fetchedAt>` returns 204 when the client already has the latest snapshot.
let cache: { fetchedAt: string; json: string } | null = null;

export default defineEventHandler(async (event) => {
  const since = getQuery(event).since;

  let db;
  try {
    db = await useDb();
  } catch (e) {
    console.error('[freeride] snapshot store unavailable', e);
    throw createError({ statusCode: 503, statusMessage: 'Snapshot store unavailable' });
  }

  const meta = await latestMeta(db);
  if (!meta) throw createError({ statusCode: 503, statusMessage: 'No snapshot yet' });

  if (since === meta.fetchedAt) {
    setResponseStatus(event, 204);
    return null;
  }

  if (!cache || cache.fetchedAt !== meta.fetchedAt) {
    const row = await latestSnapshotJson(db);
    if (!row) throw createError({ statusCode: 503, statusMessage: 'No snapshot yet' });
    cache = row;
  }

  setHeader(event, 'content-type', 'application/json');
  setHeader(event, 'cache-control', 'public, max-age=60');
  return cache.json;
});
