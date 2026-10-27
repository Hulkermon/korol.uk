import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { buyUpgrade, placeBuilding, placeTower } from '../../composables/firewall/engine/economy';
import { useAbility } from '../../composables/firewall/engine/abilities';
import { beginRun, createGame, update } from '../../composables/firewall/engine/game';
import { computeScore } from '../../composables/firewall/engine/score';
import { startWave } from '../../composables/firewall/engine/waves';
import type { GameState } from '../../composables/firewall/engine/types';

afterEach(() => vi.restoreAllMocks());

type Branch = 'A' | 'B';

type Step =
  | { k: 'tower' | 'building'; def: string; col: number; row: number; key: string }
  | { k: 'upgrade'; key: string; node: string };

interface BotOptions {
  /** fork taken by every tower / building upgrade chain */
  branch?: Branch;
  /** per-key override of the fork */
  branches?: Record<string, Branch>;
  upgrades?: boolean;
  support?: boolean;
  defense?: boolean;
  /** stop playing after this many cleared waves */
  untilWave?: number;
}

interface Outcome {
  phase: string;
  wave: number;
  integrity: number;
  credits: number;
  kills: number;
  minIntegrity: number;
  score: number;
  creditsAt: Record<number, number>;
  /** credits plus everything spent on towers and buildings, at the start of each build phase */
  wealthAt: Record<number, number>;
  integrityAt: Record<number, number>;
}

/** Upgrade steps for levels `from`..`to` of one entity (level 2 = the shared root node). */
const chain = (key: string, to: number, branch: Branch, from = 2): Step[] => {
  const steps: Step[] = [];
  for (let level = from; level <= to; level++) {
    const node = level === 2 ? 'n2' : `n${level}${branch.toLowerCase()}`;
    steps.push({ k: 'upgrade', key, node });
  }
  return steps;
};

const tower = (def: string, col: number, row: number, key: string): Step => ({
  k: 'tower',
  def,
  col,
  row,
  key,
});
const building = (def: string, col: number, row: number, key: string): Step => ({
  k: 'building',
  def,
  col,
  row,
  key,
});

/**
 * Fixed purchase priority list. The bot buys the first unfinished step as soon as it can afford
 * it, and saves up while it can't. Towers hug the two corridors between the bus rows.
 */
const buildPlan = (opts: BotOptions): Step[] => {
  const b = (key: string): Branch => opts.branches?.[key] ?? opts.branch ?? 'A';
  const plan: Step[] = [
    tower('ping', 6, 3, 'ping1'),
    tower('ping', 10, 3, 'ping2'),
    building('farm', 4, 2, 'farm'),
    tower('ice', 8, 2, 'ice1'),
    tower('arc', 8, 5, 'arc1'),
    building('rack', 8, 3, 'rack'),
    ...chain('farm', 2, b('farm')),
    tower('bomb', 5, 5, 'bomb1'),
    building('antenna', 7, 6, 'antenna'),
    ...chain('antenna', 2, b('antenna')),
    ...chain('rack', 3, b('rack')),
    ...chain('ping1', 3, b('ping1')),
    ...chain('arc1', 3, b('arc1')),
    tower('scanner', 11, 5, 'scan1'),
    ...chain('ice1', 3, b('ice1')),
    ...chain('bomb1', 3, b('bomb1')),
    ...chain('ping2', 3, b('ping2')),
    tower('arc', 11, 3, 'arc2'),
    ...chain('scan1', 3, b('scan1')),
    tower('bomb', 12, 6, 'bomb2'),
    ...chain('farm', 4, b('farm'), 3),
    ...chain('rack', 5, b('rack'), 4),
    ...chain('arc2', 3, b('arc2')),
    ...chain('bomb2', 3, b('bomb2')),
    ...chain('ping1', 5, b('ping1'), 4),
    ...chain('arc1', 5, b('arc1'), 4),
    ...chain('bomb1', 5, b('bomb1'), 4),
    ...chain('scan1', 5, b('scan1'), 4),
    ...chain('ice1', 5, b('ice1'), 4),
    ...chain('ping2', 5, b('ping2'), 4),
    ...chain('antenna', 5, b('antenna'), 3),
    ...chain('arc2', 5, b('arc2'), 4),
    ...chain('bomb2', 5, b('bomb2'), 4),
  ];
  return plan.filter((s) => {
    if (opts.upgrades === false && s.k === 'upgrade') return false;
    if (opts.support === false) {
      const key = s.key;
      if (key === 'farm' || key === 'rack') return false;
    }
    return true;
  });
};

const seeded = (seed: number) => {
  let s = seed >>> 0;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  });
};

const STEP = 1 / 20;
const LOOKAHEAD = 3;
const MAX_STEPS_PER_WAVE = 20 * 240;

const useAbilities = (state: GameState) => {
  if (state.enemies.length === 0) return;
  if (state.integrity < 80) useAbility(state, 'restore');
  useAbility(state, 'auction');
  if (state.enemies.length >= 6) {
    useAbility(state, 'surge');
    useAbility(state, 'ctrlaltdel');
  }
  // strike the front-most enemy
  let lead = state.enemies[0];
  for (const e of state.enemies) if (e.dist > lead.dist) lead = e;
  useAbility(state, 'ion', { ...lead.pos });
};

const playBot = (opts: BotOptions = {}): Outcome => {
  seeded(1337);
  const state = createGame();
  beginRun(state);
  const plan = opts.defense === false ? [] : buildPlan(opts);
  const ids: Record<string, { kind: 'tower' | 'building'; id: number }> = {};
  const done = new Set<number>();
  const outcome: Outcome = {
    phase: '',
    wave: 0,
    integrity: 0,
    credits: 0,
    kills: 0,
    minIntegrity: 100,
    score: 0,
    creditsAt: {},
    wealthAt: {},
    integrityAt: {},
  };
  const limit = opts.untilWave ?? 20;

  while (state.phase === 'build' && state.wave < limit) {
    outcome.creditsAt[state.wave] = state.credits;
    outcome.wealthAt[state.wave] =
      state.credits + [...state.towers, ...state.buildings].reduce((n, e) => n + e.spent, 0);
    outcome.integrityAt[state.wave] = state.integrity;
    // spend in priority order, looking a few steps ahead when the head is too expensive
    for (let bought = true; bought;) {
      bought = false;
      const pending = plan.filter((_, i) => !done.has(i));
      const window = pending.slice(0, LOOKAHEAD);
      for (const step of window) {
        // an upgrade can't jump the queue ahead of its own earlier steps
        const index = plan.indexOf(step);
        if (plan.some((s, i) => i < index && s.key === step.key && !done.has(i))) continue;
        let ok = false;
        if (step.k === 'upgrade') {
          const ref = ids[step.key];
          ok = buyUpgrade(state, ref.kind, ref.id, step.node).ok;
        } else {
          const place = step.k === 'tower' ? placeTower : placeBuilding;
          const before = state.nextId;
          ok = place(state, step.def, { col: step.col, row: step.row }).ok;
          if (ok) ids[step.key] = { kind: step.k, id: before };
        }
        if (ok) {
          done.add(index);
          bought = true;
          break;
        }
      }
    }
    startWave(state);
    for (let i = 0; i < MAX_STEPS_PER_WAVE && state.phase === 'wave'; i++) {
      if (i % 10 === 0) useAbilities(state);
      update(state, STEP);
      outcome.minIntegrity = Math.min(outcome.minIntegrity, state.integrity);
    }
  }

  outcome.phase = state.phase;
  outcome.wave = state.wave;
  outcome.integrity = state.integrity;
  outcome.credits = state.credits;
  outcome.kills = state.stats.kills;
  outcome.score = computeScore({
    wave: state.wave,
    kills: state.stats.kills,
    integrity: state.integrity,
    credits: state.credits,
    won: state.phase === 'won',
  });
  return outcome;
};

describe('bot balance', () => {
  let none: Outcome;
  let good: Outcome;
  let plain: Outcome;
  let noSupport: Outcome;
  let forkB: Outcome;

  beforeAll(() => {
    none = playBot({ defense: false });
    good = playBot({ branch: 'A' });
    forkB = playBot({ branch: 'B' });
    plain = playBot({ upgrades: false });
    noSupport = playBot({ support: false, untilWave: 10 });
  });

  it('loses an undefended run within the first 6 waves', () => {
    expect(none.phase).toBe('lost');
    expect(none.wave).toBeLessThan(6);
  });

  it('survives waves 1-10 with a good build and clears the Y2K Bug', () => {
    expect(good.integrityAt[9]).toBeGreaterThan(40);
    // integrityAt[10] only exists once wave 10 (the Y2K Bug) has been cleared
    expect(good.integrityAt[10]).toBeGreaterThan(40);
  });

  it('does worse without any upgrades', () => {
    expect(plain.score).toBeLessThan(good.score);
    expect(plain.wave).toBeLessThan(good.wave);
  });

  it('has no strictly dominant upgrade fork', () => {
    expect(good.wave).toBeGreaterThanOrEqual(10);
    expect(forkB.wave).toBeGreaterThanOrEqual(10);
    const diff = Math.abs(good.score - forkB.score) / Math.max(good.score, forkB.score);
    expect(diff).toBeLessThan(0.35);
  });

  it('is poorer at wave 10 without the Farm and Rack', () => {
    expect(noSupport.creditsAt[9]).toBeLessThan(good.creditsAt[9]);
    expect(noSupport.wealthAt[9]).toBeLessThan(good.wealthAt[9]);
  });

  it('can win, but not trivially', () => {
    for (const run of [good, forkB]) {
      expect(run.phase).toBe('won');
      expect(run.integrity).toBeLessThan(100);
    }
  });
});
