import { describe, expect, it } from 'vitest';
import {
  buyUpgrade,
  canPlace,
  placeBuilding,
  placeTower,
  sellEntity,
  sellValue,
  setTargetMode,
} from '../../composables/firewall/engine/economy';
import { getBuildingDef } from '../../composables/firewall/data/buildings';
import { getTowerDef } from '../../composables/firewall/data/towers';
import { makeTestState } from './helpers';

// (col 5, row 1) is on the path; (col 5, row 2) is free
const FREE = { col: 5, row: 2 };

describe('canPlace', () => {
  it('refuses path, occupied and out-of-grid cells', () => {
    const state = makeTestState();
    expect(canPlace(state, { col: 5, row: 1 }).ok).toBe(false);
    expect(canPlace(state, { col: -1, row: 2 }).ok).toBe(false);
    expect(canPlace(state, { col: 18, row: 2 }).ok).toBe(false);
    expect(canPlace(state, { col: 0, row: 11 }).ok).toBe(false);
    expect(canPlace(state, FREE).ok).toBe(true);
    placeTower(state, 'ping', FREE);
    expect(canPlace(state, FREE).ok).toBe(false);
  });

  it('refuses outside build and wave phases', () => {
    expect(canPlace(makeTestState({ phase: 'lost' }), FREE).ok).toBe(false);
  });
});

describe('placing', () => {
  it('deducts cost and creates the tower', () => {
    const state = makeTestState({ credits: 500 });
    const def = getTowerDef('ping');
    expect(placeTower(state, 'ping', FREE)).toEqual({ ok: true });
    expect(state.credits).toBe(500 - def.cost);
    expect(state.towers[0]).toMatchObject({
      defId: 'ping',
      spent: def.cost,
      targetMode: 'first',
      pos: { x: 220, y: 100 },
    });
  });

  it('fails and leaves state unchanged when broke', () => {
    const state = makeTestState({ credits: 10 });
    const res = placeTower(state, 'ping', FREE);
    expect(res.ok).toBe(false);
    expect(state.credits).toBe(10);
    expect(state.towers).toEqual([]);
    expect(state.nextId).toBe(1);
  });

  it('places buildings', () => {
    const state = makeTestState();
    expect(placeBuilding(state, 'farm', FREE).ok).toBe(true);
    expect(state.credits).toBe(1000 - getBuildingDef('farm').cost);
    expect(state.buildings).toHaveLength(1);
  });
});

describe('buyUpgrade', () => {
  it('buys, deducts, and recomputes stats', () => {
    const state = makeTestState();
    placeTower(state, 'ping', FREE);
    const before = state.credits;
    expect(buyUpgrade(state, 'tower', state.towers[0].id, 'n2').ok).toBe(true);
    expect(state.credits).toBe(before - 60);
    expect(state.towers[0].purchased).toEqual(['n2']);
    expect(state.towers[0].stats.damage).toBeCloseTo(8 * 1.4);
  });

  it('refuses a locked sibling', () => {
    const state = makeTestState();
    placeTower(state, 'ping', FREE);
    const id = state.towers[0].id;
    buyUpgrade(state, 'tower', id, 'n2');
    buyUpgrade(state, 'tower', id, 'n3a');
    const credits = state.credits;
    expect(buyUpgrade(state, 'tower', id, 'n3b').ok).toBe(false);
    expect(state.credits).toBe(credits);
  });

  it('refuses an unaffordable node', () => {
    const state = makeTestState({ credits: 100 });
    placeTower(state, 'ping', FREE);
    const res = buyUpgrade(state, 'tower', state.towers[0].id, 'n2');
    expect(res.ok).toBe(false);
    expect(state.towers[0].purchased).toEqual([]);
    expect(state.credits).toBe(0);
  });

  it('upgrades buildings', () => {
    const state = makeTestState();
    placeBuilding(state, 'farm', FREE);
    expect(buyUpgrade(state, 'building', state.buildings[0].id, 'n2').ok).toBe(true);
    expect(state.buildings[0].stats.incomePerWave).toBe(65);
  });
});

describe('sellEntity', () => {
  it('refunds floor(spent * 0.7) and removes the entity', () => {
    const state = makeTestState();
    placeTower(state, 'ping', FREE);
    const tower = state.towers[0];
    buyUpgrade(state, 'tower', tower.id, 'n2');
    expect(tower.spent).toBe(160);
    const before = state.credits;
    expect(sellValue(tower)).toBe(112);
    expect(sellEntity(state, 'tower', tower.id).ok).toBe(true);
    expect(state.credits).toBe(before + 112);
    expect(state.towers).toEqual([]);
    expect(state.fx.at(-1)?.text).toBe('+112');
  });

  it('fails for unknown ids', () => {
    expect(sellEntity(makeTestState(), 'building', 99).ok).toBe(false);
  });
});

describe('setTargetMode', () => {
  it('sets the mode', () => {
    const state = makeTestState();
    placeTower(state, 'ping', FREE);
    setTargetMode(state, state.towers[0].id, 'strongest');
    expect(state.towers[0].targetMode).toBe('strongest');
  });
});
