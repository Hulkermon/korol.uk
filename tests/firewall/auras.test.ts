import { describe, expect, it } from 'vitest';
import { makeTestState } from './helpers';
import {
  applyWaveEndPassives,
  effectiveTowerStats,
  getAuraBonus,
  getBountyBonus,
  getBuildingLevel,
} from '../../composables/firewall/engine/buildings';
import { getBuildingDef } from '../../composables/firewall/data/buildings';
import { getTowerDef } from '../../composables/firewall/data/towers';
import type { Building, GameState, Tower } from '../../composables/firewall/engine/types';

let nid = 1;
const addTower = (state: GameState, x: number, y: number): Tower => {
  const t: Tower = {
    id: nid++,
    defId: 'ping',
    cell: { col: 0, row: 0 },
    pos: { x, y },
    purchased: [],
    stats: { ...getTowerDef('ping').base },
    cooldownLeft: 0,
    angle: 0,
    targetMode: 'first',
    spent: 0,
    kills: 0,
  };
  state.towers.push(t);
  return t;
};
const addBuilding = (
  state: GameState,
  defId: string,
  x: number,
  y: number,
  purchased: string[] = [],
): Building => {
  const b: Building = {
    id: nid++,
    defId,
    cell: { col: 0, row: 0 },
    pos: { x, y },
    purchased,
    stats: { ...getBuildingDef(defId).base },
    spent: 0,
  };
  state.buildings.push(b);
  return b;
};

describe('auras', () => {
  it('rack lowers cooldown only inside its radius', () => {
    const s = makeTestState();
    const near = addTower(s, 100, 100);
    const far = addTower(s, 500, 400);
    addBuilding(s, 'rack', 150, 100);
    expect(effectiveTowerStats(s, near).cooldown).toBeCloseTo(near.stats.cooldown / 1.15);
    expect(effectiveTowerStats(s, far).cooldown).toBe(far.stats.cooldown);
  });

  it('overlapping auras add', () => {
    const s = makeTestState();
    const t = addTower(s, 100, 100);
    addBuilding(s, 'rack', 150, 100);
    addBuilding(s, 'rack', 100, 150);
    expect(getAuraBonus(s, t).fireRate).toBeCloseTo(0.3);
  });

  it('antenna raises range and damage bonus raises damage', () => {
    const s = makeTestState();
    const t = addTower(s, 100, 100);
    addBuilding(s, 'antenna', 120, 100);
    const rack = addBuilding(s, 'rack', 130, 100);
    rack.stats.damageBonus = 0.5;
    const e = effectiveTowerStats(s, t);
    expect(e.range).toBeCloseTo(t.stats.range * 1.15);
    expect(e.damage).toBeCloseTo(t.stats.damage * 1.5);
    expect(t.stats.damage).toBe(getTowerDef('ping').base.damage);
  });

  it('getBountyBonus sums', () => {
    const s = makeTestState();
    expect(getBountyBonus(s)).toBe(0);
    addBuilding(s, 'farm', 10, 10).stats.bountyBonus = 0.1;
    addBuilding(s, 'farm', 50, 10).stats.bountyBonus = 0.15;
    expect(getBountyBonus(s)).toBeCloseTo(0.25);
  });

  it('getBuildingLevel returns highest level or 0', () => {
    const s = makeTestState();
    expect(getBuildingLevel(s, 'rack')).toBe(0);
    addBuilding(s, 'rack', 10, 10);
    addBuilding(s, 'rack', 50, 10, ['n2', 'n3a']);
    addBuilding(s, 'farm', 90, 10, ['n2', 'n3a', 'n4a']);
    expect(getBuildingLevel(s, 'rack')).toBe(3);
  });

  it('applyWaveEndPassives adds income and heals without exceeding max', () => {
    const s = makeTestState({ credits: 0, integrity: 98 });
    addBuilding(s, 'farm', 10, 10);
    addBuilding(s, 'backup', 50, 10);
    applyWaveEndPassives(s);
    expect(s.credits).toBe(40);
    expect(s.integrity).toBe(100);
    expect(s.news.length).toBe(1);
    expect(s.fx.length).toBe(2);
  });
});
