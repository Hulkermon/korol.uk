import { getAbilityDef } from '../data/abilities';
import { getBuildingLevel } from './buildings';
import { damageEnemy } from './combat';
import { H, W, pushNews, type GameState, type Vec } from './types';
import type { Result } from './economy';

export const isAbilityUnlocked = (state: GameState, id: string): boolean => {
  const def = getAbilityDef(id);
  return getBuildingLevel(state, def.unlock.building) >= def.unlock.level;
};

export const abilityPower = (state: GameState, id: string): number => {
  const def = getAbilityDef(id);
  const level = getBuildingLevel(state, def.unlock.building);
  return 1 + 0.25 * Math.max(0, level - def.unlock.level);
};

export const useAbility = (state: GameState, id: string, point?: Vec): Result => {
  const def = getAbilityDef(id);
  if (state.phase !== 'build' && state.phase !== 'wave') {
    return { ok: false, reason: 'Not available right now' };
  }
  if (!isAbilityUnlocked(state, id)) return { ok: false, reason: 'Ability locked' };
  if ((state.abilityCooldowns[id] ?? 0) > 0) return { ok: false, reason: 'On cooldown' };
  if (def.targeting === 'point' && !point) return { ok: false, reason: 'Pick a target point' };

  const p = abilityPower(state, id);
  const center = { x: W / 2, y: H / 2 };
  state.abilityCooldowns[id] = def.cooldown;

  if (id === 'restore') {
    state.integrity = Math.min(state.maxIntegrity, state.integrity + 15 * p);
    state.fx.push({ kind: 'ring', from: center, color: def.color, age: 0, ttl: 0.8, radius: 200 });
    pushNews(state, 'SYSTEM RESTORE: integrity partially recovered');
  } else if (id === 'auction') {
    const gain = Math.round(60 * p + 10 * state.wave);
    state.credits += gain;
    state.fx.push({
      kind: 'text',
      from: { x: center.x, y: center.y - 20 },
      color: def.color,
      age: 0,
      ttl: 1.2,
      text: `+${gain}`,
    });
    pushNews(state, `eBay auction closed: +${gain} credits`);
  } else if (id === 'surge') {
    state.buffs.fireRateMul = 2;
    state.buffs.fireRateMulUntil = state.time + 8 * p;
    pushNews(state, 'OVERCLOCK SURGE: towers firing at double rate');
  } else if (id === 'ion' && point) {
    const radius = 90 * p;
    const damage = 250 * p;
    for (const enemy of [...state.enemies]) {
      if (Math.hypot(enemy.pos.x - point.x, enemy.pos.y - point.y) <= radius) {
        damageEnemy(state, enemy, damage, 0.5);
      }
    }
    state.fx.push({ kind: 'ring', from: { ...point }, color: def.color, age: 0, ttl: 0.7, radius });
    state.fx.push({ kind: 'burst', from: { ...point }, color: def.color, age: 0, ttl: 0.7, radius });
    pushNews(state, 'ION CANNON: orbital strike delivered');
  } else if (id === 'ctrlaltdel') {
    for (const enemy of state.enemies) {
      enemy.stunUntil = Math.max(enemy.stunUntil, state.time + 4 * p);
    }
    state.fx.push({
      kind: 'ring',
      from: center,
      color: def.color,
      age: 0,
      ttl: 1,
      radius: Math.hypot(W, H) / 2,
    });
    pushNews(state, 'CTRL+ALT+DEL: all processes frozen');
  }
  return { ok: true };
};

export const updateAbilities = (state: GameState, dt: number): void => {
  for (const id of Object.keys(state.abilityCooldowns)) {
    state.abilityCooldowns[id] = Math.max(0, state.abilityCooldowns[id] - dt);
  }
  if (state.buffs.fireRateMul !== 1 && state.time >= state.buffs.fireRateMulUntil) {
    state.buffs.fireRateMul = 1;
  }
};
