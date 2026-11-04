import { describe, it, expect } from 'vitest';
import {
  saveSnapshot,
  latestMeta,
  latestSnapshotJson,
  type DbLike,
} from '../../composables/freeride/snapshotStore';
import type { EventSnapshot } from '../../composables/freeride/types';

function fakeDb(rows: any[] = []) {
  const calls: { kind: string; sql: string; params?: unknown[] }[] = [];
  const db: DbLike = {
    async execute(sql, params) {
      calls.push({ kind: 'execute', sql, params });
      return [{}, undefined];
    },
    async query(sql, params) {
      calls.push({ kind: 'query', sql, params });
      return [rows, undefined];
    },
  };
  return { db, calls };
}

const snap = {
  fetchedAt: '2026-01-01T00:00:00.000Z',
  season: '2026',
  source: 'test',
  events: [{ id: 'a' }, { id: 'b' }],
} as unknown as EventSnapshot;

describe('saveSnapshot', () => {
  it('inserts then prunes to keep', async () => {
    const { db, calls } = fakeDb();
    await saveSnapshot(db, snap);
    expect(calls[0].kind).toBe('execute');
    expect(calls[0].sql).toContain('INSERT INTO freeride_snapshots');
    expect(calls[0].params).toEqual([snap.fetchedAt, 2, JSON.stringify(snap)]);
    expect(calls[1].kind).toBe('query');
    expect(calls[1].sql).toContain('DELETE FROM freeride_snapshots');
    expect(calls[1].sql).toContain('LIMIT 3');
  });

  it('rejects non-positive-integer keep without touching the db', async () => {
    for (const bad of [0, -1, 1.5, NaN]) {
      const { db, calls } = fakeDb();
      await expect(saveSnapshot(db, snap, bad)).rejects.toThrow();
      expect(calls).toHaveLength(0);
    }
  });
});

describe('latestMeta / latestSnapshotJson', () => {
  it('return null when empty', async () => {
    const { db } = fakeDb([]);
    expect(await latestMeta(db)).toBeNull();
    expect(await latestSnapshotJson(db)).toBeNull();
  });

  it('return the newest row', async () => {
    const { db, calls } = fakeDb([{ fetched_at: 'T', data: '{"x":1}' }]);
    expect(await latestMeta(db)).toEqual({ fetchedAt: 'T' });
    expect(await latestSnapshotJson(db)).toEqual({ fetchedAt: 'T', json: '{"x":1}' });
    expect(calls[0].sql).not.toContain('data');
  });
});
