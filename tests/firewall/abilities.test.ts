import { describe, expect, it } from 'vitest';
import {
  abilityPower,
  isAbilityUnlocked,
  updateAbilities,
  useAbility,
} from '../../composables/firewall/engine/abilities';
import { createEnemy } from '../../composables/firewall/engine/waves';
import { makeTestState } from './helpers';

const addBuilding = (state: ReturnType<typeof makeTestState>, defId: string, level: number) => {
  state.buildings.push({
    id: state.nextId++,
    defId,
    cell: { col: 0, row: 0 },
    pos: { x: 0, y: 0 },
    purchased: Array.from({ length: level - 1 }, (_, i) => `n${i}`),
    stats: {} as any,
    spent: 0,
  });
};

describe('abilities', () => {
  it('is locked until the building reaches the level', () => {
    const s = makeTestState();
    expect(isAbilityUnlocked(s, 'restore')).toBe(false);
    expect(useAbility(s, 'restore').ok).toBe(false);
    addBuilding(s, 'backup', 1);
    expect(isAbilityUnlocked(s, 'restore')).toBe(true);
    expect(useAbility(s, 'restore').ok).toBe(true);
  });

  it('sets cooldown and blocks reuse until it ticks down', () => {
    const s = makeTestState({ integrity: 50 });
    addBuilding(s, 'backup', 1);
    useAbility(s, 'restore');
    expect(s.abilityCooldowns.restore).toBe(60);
    expect(useAbility(s, 'restore').ok).toBe(false);
    updateAbilities(s, 61);
    expect(s.abilityCooldowns.restore).toBe(0);
    expect(useAbility(s, 'restore').ok).toBe(true);
  });

  it('fails outside build/wave phases', () => {
    const s = makeTestState({ phase: 'lost' });
    addBuilding(s, 'backup', 1);
    expect(useAbility(s, 'restore').ok).toBe(false);
  });

  it('restore caps at maxIntegrity and scales with level', () => {
    const s = makeTestState({ integrity: 95 });
    addBuilding(s, 'backup', 1);
    useAbility(s, 'restore');
    expect(s.integrity).toBe(100);
    const t = makeTestState({ integrity: 10 });
    addBuilding(t, 'backup', 2);
    expect(abilityPower(t, 'restore')).toBe(1.25);
    useAbility(t, 'restore');
    expect(t.integrity).toBeCloseTo(10 + 15 * 1.25);
  });

  it('auction adds credits', () => {
    const s = makeTestState({ credits: 0, wave: 3 });
    addBuilding(s, 'farm', 2);
    expect(useAbility(s, 'auction').ok).toBe(true);
    expect(s.credits).toBe(90);
  });

  it('surge sets then expires the buff', () => {
    const s = makeTestState({ time: 10 });
    addBuilding(s, 'rack', 2);
    useAbility(s, 'surge');
    expect(s.buffs.fireRateMul).toBe(2);
    expect(s.buffs.fireRateMulUntil).toBe(18);
    updateAbilities(s, 1);
    expect(s.buffs.fireRateMul).toBe(2);
    s.time = 18.5;
    updateAbilities(s, 0.1);
    expect(s.buffs.fireRateMul).toBe(1);
  });

  it('ion needs a point and only hits enemies in radius', () => {
    const s = makeTestState();
    addBuilding(s, 'antenna', 2);
    const near = createEnemy(s, 'popup');
    const far = createEnemy(s, 'popup');
    near.pos = { x: 100, y: 100 };
    far.pos = { x: 300, y: 300 };
    near.hp = near.maxHp = far.maxHp = far.hp = 1000;
    expect(useAbility(s, 'ion').ok).toBe(false);
    expect(s.abilityCooldowns.ion ?? 0).toBe(0);
    expect(useAbility(s, 'ion', { x: 120, y: 100 }).ok).toBe(true);
    expect(near.hp).toBeLessThan(1000);
    expect(far.hp).toBe(1000);
  });

  it('ctrlaltdel stuns every enemy', () => {
    const s = makeTestState({ time: 5 });
    addBuilding(s, 'backup', 3);
    const a = createEnemy(s, 'popup');
    const b = createEnemy(s, 'popup');
    expect(useAbility(s, 'ctrlaltdel').ok).toBe(true);
    expect(a.stunUntil).toBeCloseTo(5 + 4 * 1);
    expect(b.stunUntil).toBeCloseTo(9);
  });
});
