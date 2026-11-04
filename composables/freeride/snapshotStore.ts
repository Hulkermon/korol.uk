import type { EventSnapshot } from './types';

export interface DbLike {
  execute(sql: string, params?: unknown[]): Promise<[any, any]>;
  query(sql: string, params?: unknown[]): Promise<[any, any]>;
}

export async function saveSnapshot(db: DbLike, snap: EventSnapshot, keep = 3): Promise<void> {
  if (!Number.isInteger(keep) || keep < 1) {
    throw new Error('keep must be a positive integer');
  }
  await db.execute(
    'INSERT INTO freeride_snapshots (fetched_at, event_count, data) VALUES (?, ?, ?)',
    [snap.fetchedAt, snap.events.length, JSON.stringify(snap)],
  );
  await db.query(
    `DELETE FROM freeride_snapshots WHERE id NOT IN (SELECT id FROM (SELECT id FROM freeride_snapshots ORDER BY fetched_at DESC, id DESC LIMIT ${keep}) t)`,
  );
}

export async function latestMeta(db: DbLike): Promise<{ fetchedAt: string } | null> {
  const [rows] = await db.query(
    'SELECT fetched_at FROM freeride_snapshots ORDER BY fetched_at DESC, id DESC LIMIT 1',
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return { fetchedAt: String(rows[0].fetched_at) };
}

export async function latestSnapshotJson(
  db: DbLike,
): Promise<{ fetchedAt: string; json: string } | null> {
  const [rows] = await db.query(
    'SELECT fetched_at, data FROM freeride_snapshots ORDER BY fetched_at DESC, id DESC LIMIT 1',
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return { fetchedAt: String(rows[0].fetched_at), json: String(rows[0].data) };
}
