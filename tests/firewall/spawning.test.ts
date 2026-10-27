import { describe, expect, it } from 'vitest';
import { WAVES, hpScaleForWave } from '../../composables/firewall/data/waves';
import { getEnemyDef } from '../../composables/firewall/data/enemies';
import { getPathLength } from '../../composables/firewall/engine/path';
import {
  createEnemy,
  isWaveCleared,
  startWave,
  updateWaves,
} from '../../composables/firewall/engine/waves';
import { makeTestState } from './helpers';

describe('startWave', () => {
  it('only works in build and builds a sorted queue', () => {
    const s = makeTestState({ phase: 'wave' });
    startWave(s);
    expect(s.spawnQueue).toHaveLength(0);
    const b = makeTestState();
    startWave(b);
    expect(b.phase).toBe('wave');
    const count = WAVES[0].groups.reduce((n, g) => n + g.count, 0);
    expect(b.spawnQueue).toHaveLength(count);
    const ats = b.spawnQueue.map((q) => q.at);
    expect(ats).toEqual([...ats].sort((x, y) => x - y));
    expect(b.news.length).toBe(1);
  });
});

describe('updateWaves', () => {
  it('spawns on schedule', () => {
    const s = makeTestState({ phase: 'wave' });
    s.spawnQueue = [
      { at: 0, enemyId: WAVES[0].groups[0].enemyId },
      { at: 5, enemyId: WAVES[0].groups[0].enemyId },
    ];
    updateWaves(s, 1);
    expect(s.enemies).toHaveLength(1);
    expect(s.spawnQueue).toHaveLength(1);
    updateWaves(s, 5);
    expect(s.enemies).toHaveLength(2);
  });

  it('moves, slows and stuns', () => {
    const s = makeTestState({ phase: 'wave' });
    const id = WAVES[0].groups[0].enemyId;
    const speed = getEnemyDef(id).speed;
    const a = createEnemy(s, id);
    const b = createEnemy(s, id);
    const c = createEnemy(s, id);
    b.slowFactor = 0.5;
    b.slowUntil = 10;
    c.stunUntil = 10;
    updateWaves(s, 1);
    expect(a.dist).toBeCloseTo(speed);
    expect(b.dist).toBeCloseTo(speed * 0.5);
    expect(c.dist).toBe(0);
  });

  it('leaks reduce integrity, clamped at 0', () => {
    const id = WAVES[0].groups[0].enemyId;
    const leak = getEnemyDef(id).leak;
    const s = makeTestState({ phase: 'wave' });
    createEnemy(s, id, getPathLength());
    updateWaves(s, 0.1);
    expect(s.enemies).toHaveLength(0);
    expect(s.integrity).toBe(100 - leak);
    expect(s.stats.leaks).toBe(1);
    const t = makeTestState({ phase: 'wave', integrity: 0 });
    createEnemy(t, id, getPathLength());
    updateWaves(t, 0.1);
    expect(t.integrity).toBe(0);
  });
});

describe('isWaveCleared / createEnemy', () => {
  it('is cleared only when queue and enemies are empty', () => {
    const s = makeTestState({ phase: 'wave' });
    expect(isWaveCleared(s)).toBe(true);
    s.spawnQueue = [{ at: 1, enemyId: WAVES[0].groups[0].enemyId }];
    expect(isWaveCleared(s)).toBe(false);
    s.spawnQueue = [];
    createEnemy(s, WAVES[0].groups[0].enemyId);
    expect(isWaveCleared(s)).toBe(false);
  });

  it('scales hp by wave', () => {
    const id = WAVES[0].groups[0].enemyId;
    const s = makeTestState({ wave: 5 });
    const e = createEnemy(s, id);
    expect(e.maxHp).toBeCloseTo(getEnemyDef(id).hp * hpScaleForWave(5));
    expect(e.hp).toBe(e.maxHp);
  });
});
