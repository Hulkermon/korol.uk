import { afterEach, describe, expect, it, vi } from 'vitest';
import { WAVES } from '../../composables/firewall/data/waves';
import { ABILITY_DEFS } from '../../composables/firewall/data/abilities';
import { placeTower } from '../../composables/firewall/engine/economy';
import { beginRun, createGame, restartGame, update } from '../../composables/firewall/engine/game';
import { startWave } from '../../composables/firewall/engine/waves';
import type { GameState } from '../../composables/firewall/engine/types';

afterEach(() => vi.restoreAllMocks());

const run = (state: GameState, seconds: number, dt = 1 / 60) => {
  for (let t = 0; t < seconds && (state.phase === 'build' || state.phase === 'wave'); t += dt) {
    update(state, dt);
  }
};

const defended = (speed: 1 | 2 | 3 = 1) => {
  const s = createGame();
  beginRun(s);
  s.speed = speed;
  s.credits = 2000;
  for (const col of [3, 5, 7, 9]) expect(placeTower(s, 'ping', { col, row: 2 }).ok).toBe(true);
  return s;
};

describe('createGame', () => {
  it('has the documented defaults', () => {
    const s = createGame();
    expect(s.phase).toBe('title');
    expect(s.paused).toBe(false);
    expect(s.speed).toBe(1);
    expect(s.credits).toBe(300);
    expect(s.integrity).toBe(100);
    expect(s.nextId).toBe(1);
    expect(Object.keys(s.abilityCooldowns).sort()).toEqual(ABILITY_DEFS.map((d) => d.id).sort());
    expect(s.news.length).toBeGreaterThan(0);
  });
});

describe('update no-ops', () => {
  it.each(['title', 'won', 'lost'] as const)('does nothing in %s', (phase) => {
    const s = createGame();
    s.phase = phase;
    update(s, 0.05);
    expect(s.time).toBe(0);
  });

  it('does nothing while paused', () => {
    const s = createGame();
    beginRun(s);
    s.paused = true;
    update(s, 0.05);
    expect(s.time).toBe(0);
  });

  it('advances time in build', () => {
    const s = createGame();
    beginRun(s);
    update(s, 0.05);
    expect(s.time).toBeCloseTo(0.05);
  });
});

describe('runs', () => {
  it('loses with no defenses', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const s = createGame();
    beginRun(s);
    for (let i = 0; i < 40 && s.phase !== 'lost'; i++) {
      if (s.phase === 'build') startWave(s);
      run(s, 120, 0.05);
    }
    expect(s.stats.leaks).toBeGreaterThan(0);
    expect(s.phase).toBe('lost');
    expect(s.integrity).toBe(0);
  });

  it('clears wave 1 with towers and pays the bonus', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const s = defended();
    const credits = s.credits;
    startWave(s);
    expect(s.phase).toBe('wave');
    run(s, 120);
    expect(s.phase).toBe('build');
    expect(s.wave).toBe(1);
    expect(s.credits).toBeGreaterThanOrEqual(credits + WAVES[0].bonus);
    expect(s.stats.kills).toBeGreaterThan(0);
    expect(s.integrity).toBe(100);
  });

  it('wins after clearing the last wave', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const s = defended();
    s.wave = WAVES.length - 1;
    s.spawnQueue = [];
    s.enemies = [];
    startWave(s);
    s.spawnQueue = [];
    update(s, 0.05);
    expect(s.phase).toBe('won');
    expect(s.wave).toBe(WAVES.length);
  });

  it('3x speed gives about the same outcome as 1x', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const a = defended(1);
    const b = defended(3);
    startWave(a);
    startWave(b);
    run(a, 120);
    run(b, 120);
    expect(b.phase).toBe(a.phase);
    expect(b.wave).toBe(a.wave);
    expect(Math.abs(b.stats.kills - a.stats.kills)).toBeLessThanOrEqual(2);
    expect(b.integrity).toBe(a.integrity);
  });
});

describe('restartGame', () => {
  it('resets in place and begins', () => {
    const s = defended();
    s.credits = 5;
    s.phase = 'lost';
    const ref = s;
    restartGame(s);
    expect(s).toBe(ref);
    expect(s.phase).toBe('build');
    expect(s.towers).toEqual([]);
    expect(s.credits).toBe(300);
  });
});
