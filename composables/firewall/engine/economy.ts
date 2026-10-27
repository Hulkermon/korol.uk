import { getBuildingDef } from '../data/buildings';
import { getTowerDef } from '../data/towers';
import { cellCenter, isPathCell } from './path';
import { availableUpgrades, computeStats } from './stats';
import {
  COLS,
  ROWS,
  nextId,
  type Building,
  type Cell,
  type GameState,
  type TargetMode,
  type Tower,
} from './types';

export type Result = { ok: true } | { ok: false; reason: string };

const fail = (reason: string): Result => ({ ok: false, reason });

export const canPlace = (state: GameState, cell: Cell): Result => {
  if (state.phase !== 'build' && state.phase !== 'wave') return fail('Not now');
  if (cell.col < 0 || cell.col >= COLS || cell.row < 0 || cell.row >= ROWS) {
    return fail('Out of bounds');
  }
  if (isPathCell(cell)) return fail("Can't build on the data bus");
  const taken = (e: { cell: Cell }) => e.cell.col === cell.col && e.cell.row === cell.row;
  if (state.towers.some(taken) || state.buildings.some(taken)) return fail('Cell is occupied');
  return { ok: true };
};

export const placeTower = (state: GameState, defId: string, cell: Cell): Result => {
  const def = getTowerDef(defId);
  const check = canPlace(state, cell);
  if (!check.ok) return check;
  if (state.credits < def.cost) return fail('Not enough credits');
  state.credits -= def.cost;
  const tower: Tower = {
    id: nextId(state),
    defId,
    cell: { ...cell },
    pos: cellCenter(cell),
    purchased: [],
    stats: { ...def.base },
    cooldownLeft: 0,
    angle: 0,
    targetMode: 'first',
    spent: def.cost,
    kills: 0,
  };
  state.towers.push(tower);
  return { ok: true };
};

export const placeBuilding = (state: GameState, defId: string, cell: Cell): Result => {
  const def = getBuildingDef(defId);
  const check = canPlace(state, cell);
  if (!check.ok) return check;
  if (state.credits < def.cost) return fail('Not enough credits');
  state.credits -= def.cost;
  const building: Building = {
    id: nextId(state),
    defId,
    cell: { ...cell },
    pos: cellCenter(cell),
    purchased: [],
    stats: { ...def.base },
    spent: def.cost,
  };
  state.buildings.push(building);
  return { ok: true };
};

export const buyUpgrade = (
  state: GameState,
  kind: 'tower' | 'building',
  id: number,
  nodeId: string,
): Result => {
  if (kind === 'tower') {
    const tower = state.towers.find((t) => t.id === id);
    if (!tower) return fail('Not found');
    const def = getTowerDef(tower.defId);
    const node = availableUpgrades(def.tree, tower.purchased).find((n) => n.id === nodeId);
    if (!node) return fail('Upgrade not available');
    if (state.credits < node.cost) return fail('Not enough credits');
    state.credits -= node.cost;
    tower.purchased.push(nodeId);
    tower.spent += node.cost;
    tower.stats = computeStats(def.base, def.tree, tower.purchased);
    return { ok: true };
  }
  const building = state.buildings.find((b) => b.id === id);
  if (!building) return fail('Not found');
  const def = getBuildingDef(building.defId);
  const node = availableUpgrades(def.tree, building.purchased).find((n) => n.id === nodeId);
  if (!node) return fail('Upgrade not available');
  if (state.credits < node.cost) return fail('Not enough credits');
  state.credits -= node.cost;
  building.purchased.push(nodeId);
  building.spent += node.cost;
  building.stats = computeStats(def.base, def.tree, building.purchased);
  return { ok: true };
};

export const sellValue = (entity: Tower | Building): number => Math.floor(entity.spent * 0.7);

export const sellEntity = (state: GameState, kind: 'tower' | 'building', id: number): Result => {
  const list: (Tower | Building)[] = kind === 'tower' ? state.towers : state.buildings;
  const index = list.findIndex((e) => e.id === id);
  if (index < 0) return fail('Not found');
  const entity = list[index];
  const value = sellValue(entity);
  list.splice(index, 1);
  state.credits += value;
  state.fx.push({
    kind: 'text',
    from: { ...entity.pos },
    color: '#ffe14a',
    age: 0,
    ttl: 1,
    text: `+${value}`,
  });
  return { ok: true };
};

export const setTargetMode = (state: GameState, towerId: number, mode: TargetMode): void => {
  const tower = state.towers.find((t) => t.id === towerId);
  if (tower) tower.targetMode = mode;
};
