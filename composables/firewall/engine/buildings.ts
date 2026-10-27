import type { GameState, Tower, TowerStats } from './types';
import { pushNews } from './types';
import { getLevel } from './stats';

export const getAuraBonus = (state: GameState, tower: Tower) => {
  const bonus = { fireRate: 0, range: 0, damage: 0 };
  for (const b of state.buildings) {
    const s = b.stats;
    if (s.auraRange <= 0) continue;
    if (Math.hypot(b.pos.x - tower.pos.x, b.pos.y - tower.pos.y) > s.auraRange) continue;
    bonus.fireRate += s.fireRateBonus;
    bonus.range += s.rangeBonus;
    bonus.damage += s.damageBonus;
  }
  return bonus;
};

export const effectiveTowerStats = (state: GameState, tower: Tower): TowerStats => {
  const bonus = getAuraBonus(state, tower);
  const stats = { ...tower.stats };
  stats.cooldown /= 1 + bonus.fireRate;
  stats.range *= 1 + bonus.range;
  stats.damage *= 1 + bonus.damage;
  return stats;
};

export const getBountyBonus = (state: GameState): number => {
  let sum = 0;
  for (const b of state.buildings) sum += b.stats.bountyBonus;
  return sum;
};

export const getBuildingLevel = (state: GameState, defId: string): number => {
  let level = 0;
  for (const b of state.buildings) {
    if (b.defId === defId) level = Math.max(level, getLevel(b.purchased));
  }
  return level;
};

export const applyWaveEndPassives = (state: GameState): void => {
  let income = 0;
  let healed = 0;
  for (const b of state.buildings) {
    const gain = b.stats.incomePerWave;
    const before = state.integrity;
    state.credits += gain;
    state.integrity = Math.min(state.maxIntegrity, state.integrity + b.stats.healPerWave);
    const heal = state.integrity - before;
    income += gain;
    healed += heal;
    const parts: string[] = [];
    if (gain > 0) parts.push(`+${gain}$`);
    if (heal > 0) parts.push(`+${heal} INT`);
    if (parts.length) {
      state.fx.push({
        kind: 'text',
        from: { x: b.pos.x, y: b.pos.y - 14 },
        color: '#7dff3a',
        age: 0,
        ttl: 1.4,
        text: parts.join(' '),
      });
    }
  }
  if (income > 0 || healed > 0) {
    const parts: string[] = [];
    if (income > 0) parts.push(`+${income} credits`);
    if (healed > 0) parts.push(`+${healed} integrity`);
    pushNews(state, `Passive systems report: ${parts.join(', ')}.`);
  }
};
