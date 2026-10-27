import { afterEach, describe, expect, it, vi } from 'vitest';
import { damageEnemy, updateCombat } from '../../composables/firewall/engine/combat';
import { createEnemy } from '../../composables/firewall/engine/waves';
import { getEnemyDef } from '../../composables/firewall/data/enemies';
import type { GameState, Tower, TowerStats } from '../../composables/firewall/engine/types';
import { makeTestState } from './helpers';

afterEach(() => vi.restoreAllMocks());

const baseStats: TowerStats = {
  damage: 10,
  range: 100,
  cooldown: 1,
  projectileSpeed: 0,
  splashRadius: 0,
  slowFactor: 1,
  slowDuration: 0,
  stunDuration: 0,
  dotDps: 0,
  dotDuration: 0,
  chainCount: 0,
  armorPierce: 0,
};

const addTower = (state: GameState, stats: Partial<TowerStats> = {}, x = 0, y = 0): Tower => {
  const t: Tower = {
    id: state.nextId++,
    defId: 'ping',
    cell: { col: 0, row: 0 },
    pos: { x, y },
    purchased: [],
    stats: { ...baseStats, ...stats },
    cooldownLeft: 0,
    angle: 0,
    targetMode: 'first',
    spent: 0,
    kills: 0,
  };
  state.towers.push(t);
  return t;
};

const addEnemy = (state: GameState, defId: string, x: number, y: number, dist = 0) => {
  const e = createEnemy(state, defId, dist);
  e.pos = { x, y };
  e.dist = dist;
  return e;
};

describe('firing', () => {
  it('only fires at enemies in range and respects cooldown', () => {
    const s = makeTestState();
    const t = addTower(s);
    const far = addEnemy(s, 'popup', 500, 0);
    updateCombat(s, 0.1);
    expect(far.hp).toBe(far.maxHp);
    const near = addEnemy(s, 'popup', 50, 0);
    updateCombat(s, 0.1);
    expect(near.hp).toBe(near.maxHp - Math.max(1, 10 - getEnemyDef('popup').armor));
    const hp = near.hp;
    updateCombat(s, 0.5);
    expect(near.hp).toBe(hp);
    expect(t.cooldownLeft).toBeGreaterThan(0);
    updateCombat(s, 0.5);
    expect(near.hp).toBeLessThan(hp);
  });

  it('target modes pick expected enemy', () => {
    const s = makeTestState();
    const t = addTower(s, { damage: 1, range: 200 });
    const a = addEnemy(s, 'popup', 50, 0, 100);
    const b = addEnemy(s, 'popup', 150, 0, 300);
    const c = addEnemy(s, 'popup', 100, 0, 200);
    b.hp = 1e6;
    const pick = (mode: Tower['targetMode']) => {
      t.targetMode = mode;
      t.cooldownLeft = 0;
      const before = [a, b, c].map((e) => e.hp);
      updateCombat(s, 0.01);
      return [a, b, c].findIndex((e, i) => e.hp < before[i]);
    };
    expect(pick('first')).toBe(1);
    expect(pick('last')).toBe(0);
    expect(pick('strongest')).toBe(1);
    expect(pick('closest')).toBe(0);
  });

  it('fireRateMul speeds up firing', () => {
    const s = makeTestState();
    const t = addTower(s);
    addEnemy(s, 'popup', 10, 0);
    s.buffs = { fireRateMul: 2, fireRateMulUntil: 100 };
    updateCombat(s, 0.01);
    expect(t.cooldownLeft).toBeCloseTo(0.5);
  });

  it('chain hits distinct extra enemies', () => {
    const s = makeTestState();
    addTower(s, { damage: 100, chainCount: 2 });
    const e = [10, 50, 90, 130].map((x) => addEnemy(s, 'popup', x, 0));
    e[3].pos.x = 300;
    updateCombat(s, 0.01);
    const dmg = e.map((x) => x.maxHp - x.hp);
    expect(dmg[0]).toBeGreaterThan(0);
    expect(dmg[1]).toBeGreaterThan(0);
    expect(dmg[2]).toBeGreaterThan(0);
    expect(dmg[3]).toBe(0);
    expect(dmg[1]).toBeLessThan(dmg[0]);
    expect(s.fx.filter((f) => f.kind === 'zap')).toHaveLength(2);
  });
});

describe('damage', () => {
  it('armor reduces damage, min 1, pierce ignores part', () => {
    const s = makeTestState();
    const e = addEnemy(s, 'trojan', 0, 0);
    const armor = getEnemyDef('trojan').armor;
    expect(armor).toBeGreaterThan(0);
    const hp = e.hp;
    damageEnemy(s, e, 1);
    expect(hp - e.hp).toBe(1);
    const hp2 = e.hp;
    damageEnemy(s, e, armor + 10);
    expect(hp2 - e.hp).toBe(10);
    const hp3 = e.hp;
    damageEnemy(s, e, armor + 10, 1);
    expect(hp3 - e.hp).toBe(armor + 10);
  });

  it('kill pays bounty once with bonus, counts kills, spawns children', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const s = makeTestState({ credits: 0 });
    s.buildings.push({
      id: 99,
      defId: 'x',
      cell: { col: 0, row: 0 },
      pos: { x: 0, y: 0 },
      purchased: [],
      stats: {
        auraRange: 0,
        fireRateBonus: 0,
        rangeBonus: 0,
        damageBonus: 0,
        incomePerWave: 0,
        healPerWave: 0,
        bountyBonus: 0.5,
      },
      spent: 0,
    });
    const t = addTower(s);
    const e = addEnemy(s, 'hydra', 0, 0, 200);
    const def = getEnemyDef('hydra');
    expect(def.spawnsOnDeath).toBeTruthy();
    damageEnemy(s, e, 1e9, 0, t.id);
    damageEnemy(s, e, 1e9, 0, t.id);
    expect(s.credits).toBe(Math.round(def.bounty * 1.5));
    expect(s.stats.kills).toBe(1);
    expect(t.kills).toBe(1);
    expect(s.enemies).toHaveLength(def.spawnsOnDeath!.count);
    expect(s.enemies[0].dist).toBeCloseTo(200);
    expect(s.enemies[0].defId).toBe(def.spawnsOnDeath!.enemyId);
  });
});

describe('projectiles and status', () => {
  it('splash damages everything in radius', () => {
    const s = makeTestState();
    addTower(s, { damage: 100, projectileSpeed: 1000, splashRadius: 40 });
    const a = addEnemy(s, 'popup', 50, 0);
    const b = addEnemy(s, 'popup', 70, 0);
    const c = addEnemy(s, 'popup', 90, 0);
    const far = addEnemy(s, 'popup', 90, 90);
    a.hp = b.hp = c.hp = far.hp = 1000;
    for (let i = 0; i < 8; i++) updateCombat(s, 0.02);
    expect(a.hp).toBeLessThan(1000);
    expect(b.hp).toBeLessThan(1000);
    expect(c.hp).toBeLessThan(1000);
    expect(far.hp).toBe(1000);
    expect(s.fx.some((f) => f.kind === 'ring')).toBe(true);
  });

  it('target killed mid-flight does not throw', () => {
    const s = makeTestState();
    addTower(s, { damage: 5, projectileSpeed: 100, splashRadius: 30, cooldown: 100 });
    const e = addEnemy(s, 'popup', 80, 0);
    updateCombat(s, 0.01);
    expect(s.projectiles).toHaveLength(1);
    damageEnemy(s, e, 1e9);
    for (let i = 0; i < 30; i++) updateCombat(s, 0.05);
    expect(s.projectiles).toHaveLength(0);
  });

  it('slow, stun and DoT apply and expire', () => {
    const s = makeTestState();
    addTower(s, {
      damage: 1,
      slowFactor: 0.5,
      slowDuration: 2,
      stunDuration: 1,
      dotDps: 5,
      dotDuration: 2,
      cooldown: 100,
    });
    const e = addEnemy(s, 'trojan', 10, 0);
    e.hp = e.maxHp = 1000;
    updateCombat(s, 0.01);
    expect(e.slowFactor).toBe(0.5);
    expect(e.slowUntil).toBeCloseTo(2);
    expect(e.stunUntil).toBeCloseTo(1);
    const hp = e.hp;
    s.time = 0.5;
    updateCombat(s, 1);
    expect(hp - e.hp).toBeCloseTo(5);
    const hp2 = e.hp;
    s.time = 3;
    updateCombat(s, 1);
    expect(e.hp).toBe(hp2);
    expect(s.time < e.slowUntil).toBe(false);
  });

  it('DoT can kill and ages fx out', () => {
    const s = makeTestState({ credits: 0 });
    const e = addEnemy(s, 'popup', 10, 0);
    e.hp = 1;
    e.dotDps = 10;
    e.dotUntil = 5;
    updateCombat(s, 0.5);
    expect(s.enemies).toHaveLength(0);
    expect(s.stats.kills).toBe(1);
    for (let i = 0; i < 30; i++) updateCombat(s, 0.1);
    expect(s.fx).toHaveLength(0);
  });
});
