import { vi } from 'vitest';
import { useAbility } from '../../composables/firewall/engine/abilities';
import { buyUpgrade, placeBuilding, placeTower } from '../../composables/firewall/engine/economy';
import { beginRun, createGame, update } from '../../composables/firewall/engine/game';
import { getPathLength, isPathCell, posAtDist } from '../../composables/firewall/engine/path';
import { startWave } from '../../composables/firewall/engine/waves';
import { getTowerDef } from '../../composables/firewall/data/towers';
import { getBuildingDef } from '../../composables/firewall/data/buildings';
import { availableUpgrades, getLevel } from '../../composables/firewall/engine/stats';
import { COLS, ROWS, type Cell, type GameState } from '../../composables/firewall/engine/types';

export type Branch = 'A' | 'B';

export interface Strategy {
  /** tower defs cycled through when placing new towers */
  towers: string[];
  /** fork per def id (default A) */
  branch?: Partial<Record<string, Branch>>;
  /** support buildings, built in this order once `supportAfter` towers stand */
  support?: string[];
  supportAfter?: number;
  maxTowers?: number;
  abilities?: boolean;
  /** never lose: play all waves with huge integrity and report the total leaked */
  immortal?: boolean;
  /** stop after this many cleared waves */
  untilWave?: number;
}

export interface WaveLog {
  wave: number;
  integrityBefore: number;
  integrityAfter: number;
  creditsBefore: number;
  wealth: number;
  towers: number;
}

export interface SimResult {
  won: boolean;
  lost: boolean;
  waveReached: number;
  integrity: number;
  minIntegrity: number;
  kills: number;
  /** total integrity lost over the run (net of healing) */
  leak: number;
  log: WaveLog[];
}

export const seeded = (seed: number) => {
  let s = seed >>> 0;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  });
};

const PATH_SAMPLES: { x: number; y: number }[] = [];
for (let d = 0; d < getPathLength(); d += 8) PATH_SAMPLES.push(posAtDist(d));

const cellPos = (c: Cell) => ({ x: c.col * 40 + 20, y: c.row * 40 + 20 });

/** how much path (in samples) a turret of this range would see from the cell */
export const coverage = (c: Cell, range: number): number => {
  const p = cellPos(c);
  let n = 0;
  for (const s of PATH_SAMPLES) if (Math.hypot(s.x - p.x, s.y - p.y) <= range) n++;
  return n;
};

export const freeCells = (state: GameState): Cell[] => {
  const out: Cell[] = [];
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const cell = { col, row };
      if (isPathCell(cell)) continue;
      if (state.towers.some((t) => t.cell.col === col && t.cell.row === row)) continue;
      if (state.buildings.some((t) => t.cell.col === col && t.cell.row === row)) continue;
      out.push(cell);
    }
  }
  return out;
};

const bestTowerCell = (state: GameState, range: number): Cell | null => {
  let best: Cell | null = null;
  let score = -1;
  for (const c of freeCells(state)) {
    const s = coverage(c, range);
    if (s > score) {
      score = s;
      best = c;
    }
  }
  return best;
};

/** support building: as many towers as possible inside its aura, else out of the way */
const bestBuildingCell = (state: GameState, aura: number): Cell | null => {
  let best: Cell | null = null;
  let score = -1;
  for (const c of freeCells(state)) {
    const p = cellPos(c);
    let s = 0;
    if (aura > 0) {
      for (const t of state.towers) if (Math.hypot(t.pos.x - p.x, t.pos.y - p.y) <= aura) s += 10;
      s += coverage(c, 60) * 0.01;
    } else {
      s = 1 - coverage(c, 100) / 1000; // low-traffic corner
    }
    if (s > score) {
      score = s;
      best = c;
    }
  }
  return best;
};

const useAbilities = (state: GameState) => {
  if (state.enemies.length === 0) return;
  if (state.integrity < state.maxIntegrity - 20) useAbility(state, 'restore');
  useAbility(state, 'auction');
  if (state.enemies.length >= 6) {
    useAbility(state, 'surge');
    useAbility(state, 'ctrlaltdel');
  }
  let lead = state.enemies[0];
  for (const e of state.enemies) if (e.dist > lead.dist) lead = e;
  useAbility(state, 'ion', { ...lead.pos });
};

interface Candidate {
  level: number;
  order: number;
  cost: number;
  buy: () => boolean;
}

/** Buys the lowest-level thing first and saves up for it (no cherry-picking cheap items). */
const shop = (state: GameState, s: Strategy) => {
  const cap = s.maxTowers ?? 8;
  for (;;) {
    const cands: Candidate[] = [];
    let order = 0;
    const branchOf = (def: string) => s.branch?.[def] ?? 'A';

    if (state.towers.length < cap) {
      const def = getTowerDef(s.towers[state.towers.length % s.towers.length]);
      cands.push({
        // the nth tower queues behind upgrades so the bot grows wide and tall together
        level: 0.4 + 0.6 * state.towers.length,
        order: order++,
        cost: def.cost,
        buy: () => {
          const cell = bestTowerCell(state, def.base.range);
          return !!cell && placeTower(state, def.id, cell).ok;
        },
      });
    } else order++;

    for (const t of state.towers) {
      const def = getTowerDef(t.defId);
      const opts = availableUpgrades(def.tree, t.purchased);
      const node = opts.length > 1 ? opts.find((n) => n.branch === branchOf(def.id)) : opts[0];
      if (!node) continue;
      cands.push({
        level: getLevel(t.purchased),
        order: order++,
        cost: node.cost,
        buy: () => buyUpgrade(state, 'tower', t.id, node.id).ok,
      });
    }

    const wantSupport = (s.support ?? []).filter(
      (id) => !state.buildings.some((b) => b.defId === id),
    );
    if (wantSupport.length && state.towers.length >= (s.supportAfter ?? 3)) {
      const def = getBuildingDef(wantSupport[0]);
      cands.push({
        level: 1,
        order: order++,
        cost: def.cost,
        buy: () => {
          const cell = bestBuildingCell(state, def.base.auraRange);
          return !!cell && placeBuilding(state, def.id, cell).ok;
        },
      });
    }
    for (const b of state.buildings) {
      const def = getBuildingDef(b.defId);
      const opts = availableUpgrades(def.tree, b.purchased);
      const node = opts.length > 1 ? opts.find((n) => n.branch === branchOf(def.id)) : opts[0];
      if (!node) continue;
      cands.push({
        level: getLevel(b.purchased),
        order: order++,
        cost: node.cost,
        buy: () => buyUpgrade(state, 'building', b.id, node.id).ok,
      });
    }

    if (!cands.length) return;
    cands.sort((a, b) => a.level - b.level || a.order - b.order);
    const pick = cands[0];
    if (state.credits < pick.cost) return;
    if (!pick.buy()) return;
  }
};

const STEP = 1 / 20;
const MAX_STEPS_PER_WAVE = 20 * 300;

export const simulate = (s: Strategy, seed = 1337): SimResult => {
  seeded(seed);
  const state = createGame();
  beginRun(state);
  if (s.immortal) state.integrity = state.maxIntegrity = 100000;
  const startIntegrity = state.integrity;
  const limit = s.untilWave ?? 20;
  const log: WaveLog[] = [];
  let min = state.integrity;
  while (state.phase === 'build' && state.wave < limit) {
    shop(state, s);
    const entry: WaveLog = {
      wave: state.wave + 1,
      integrityBefore: state.integrity,
      integrityAfter: 0,
      creditsBefore: state.credits,
      wealth:
        state.credits + [...state.towers, ...state.buildings].reduce((n, e) => n + e.spent, 0),
      towers: state.towers.length,
    };
    startWave(state);
    for (let i = 0; i < MAX_STEPS_PER_WAVE && state.phase === 'wave'; i++) {
      if (s.abilities !== false && i % 10 === 0) useAbilities(state);
      update(state, STEP);
      min = Math.min(min, state.integrity);
    }
    entry.integrityAfter = state.integrity;
    log.push(entry);
  }
  return {
    won: state.phase === 'won',
    lost: state.phase === 'lost',
    waveReached: state.wave + (state.phase === 'lost' ? 1 : 0),
    integrity: state.integrity,
    minIntegrity: min,
    kills: state.stats.kills,
    leak: startIntegrity - state.integrity,
    log,
  };
};

/** Total credits to buy `def` and take it to `level` along `branch`. */
export const costToLevel = (defId: string, level: number, branch: Branch): number => {
  const def = getTowerDef(defId);
  let cost = def.cost;
  let purchased: string[] = [];
  for (let l = 2; l <= level; l++) {
    const opts = availableUpgrades(def.tree, purchased);
    const node = opts.length > 1 ? opts.find((n) => n.branch === branch)! : opts[0];
    cost += node.cost;
    purchased = [...purchased, node.id];
  }
  return cost;
};

export interface HoldResult {
  leaked: number;
  count: number;
}

/**
 * Isolated wave: `count` copies of one tower at `level`, no support, no abilities, fresh state at
 * wave index `waveIndex`. Returns integrity lost.
 */
export const holdWave = (
  defId: string,
  branch: Branch,
  level: number,
  budget: number,
  waveIndex: number,
  extra: { defId: string; branch: Branch; level: number; count: number }[] = [],
): HoldResult => {
  seeded(7);
  const state = createGame();
  beginRun(state);
  state.wave = waveIndex;
  state.credits = 1e9;
  state.integrity = state.maxIntegrity = 10000;
  const each = costToLevel(defId, level, branch);
  const count = Math.max(0, Math.floor(budget / each));
  const buildOne = (id: string, br: Branch, lv: number) => {
    const def = getTowerDef(id);
    const cell = bestTowerCell(state, def.base.range);
    if (!cell) return false;
    const before = state.nextId;
    if (!placeTower(state, id, cell).ok) return false;
    for (let l = 2; l <= lv; l++) {
      const t = state.towers.find((x) => x.id === before)!;
      const opts = availableUpgrades(def.tree, t.purchased);
      const node = opts.length > 1 ? opts.find((n) => n.branch === br)! : opts[0];
      buyUpgrade(state, 'tower', t.id, node.id);
    }
    return true;
  };
  for (const e of extra) for (let i = 0; i < e.count; i++) buildOne(e.defId, e.branch, e.level);
  for (let i = 0; i < count; i++) buildOne(defId, branch, level);
  state.phase = 'build';
  startWave(state);
  for (let i = 0; i < MAX_STEPS_PER_WAVE && state.phase === 'wave'; i++) update(state, STEP);
  return { leaked: 10000 - state.integrity, count: state.towers.length };
};
