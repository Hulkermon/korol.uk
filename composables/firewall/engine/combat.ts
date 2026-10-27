import { getEnemyDef } from '../data/enemies';
import { getTowerDef } from '../data/towers';
import { getBountyBonus, effectiveTowerStats } from './buildings';
import { createEnemy } from './waves';
import { nextId, rand, type Enemy, type GameState, type Projectile, type Tower } from './types';
import type { TowerStats, Vec } from './types';

const CHAIN_RANGE = 80;
const CHAIN_FALLOFF = 0.8;
const HIT_RADIUS = 4;
/** An enemy can't be stunned again until this long after its last stun ended (no stun-lock). */
const STUN_RECOVERY = 0.6;
/** Bosses only get this share of a stun's duration. */
const BOSS_STUN_SHARE = 0.5;

/** Most recent position of each projectile's target while it was alive. */
const lastSeen = new WeakMap<Projectile, Vec>();

interface HitStatus {
  slowFactor: number;
  slowDuration: number;
  stunDuration: number;
  dotDps: number;
  dotDuration: number;
}

const applyStatus = (state: GameState, enemy: Enemy, s: HitStatus) => {
  if (s.slowDuration > 0 && s.slowFactor < 1) {
    const active = state.time < enemy.slowUntil ? enemy.slowFactor : 1;
    enemy.slowFactor = Math.min(active, s.slowFactor);
    enemy.slowUntil = Math.max(enemy.slowUntil, state.time + s.slowDuration);
  }
  if (s.stunDuration > 0 && (enemy.stunUntil <= 0 || state.time >= enemy.stunUntil + STUN_RECOVERY)) {
    const share = getEnemyDef(enemy.defId).boss ? BOSS_STUN_SHARE : 1;
    enemy.stunUntil = state.time + s.stunDuration * share;
  }
  if (s.dotDps > 0 && s.dotDuration > 0) {
    enemy.dotDps = s.dotDps;
    enemy.dotUntil = Math.max(enemy.dotUntil, state.time + s.dotDuration);
  }
};

const killEnemy = (state: GameState, enemy: Enemy, sourceTowerId?: number) => {
  const idx = state.enemies.indexOf(enemy);
  if (idx === -1) return;
  state.enemies.splice(idx, 1);
  const def = getEnemyDef(enemy.defId);
  const bounty = Math.round(def.bounty * (1 + getBountyBonus(state)));
  state.credits += bounty;
  state.stats.kills++;
  if (sourceTowerId !== undefined) {
    const tower = state.towers.find((t) => t.id === sourceTowerId);
    if (tower) tower.kills++;
  }
  state.fx.push({
    kind: 'burst',
    from: { x: enemy.pos.x, y: enemy.pos.y },
    color: def.color,
    age: 0,
    ttl: 0.4,
    radius: def.radius * 2.5,
  });
  state.fx.push({
    kind: 'text',
    from: { x: enemy.pos.x, y: enemy.pos.y - def.radius - 4 },
    color: '#7dff3a',
    age: 0,
    ttl: 0.9,
    text: `+${bounty}`,
  });
  if (def.spawnsOnDeath) {
    const { enemyId, count } = def.spawnsOnDeath;
    for (let i = 0; i < count; i++) {
      createEnemy(state, enemyId, Math.max(0, enemy.dist + (rand() - 0.5) * 24));
    }
  }
};

export const damageEnemy = (
  state: GameState,
  enemy: Enemy,
  amount: number,
  armorPierce = 0,
  sourceTowerId?: number,
): void => {
  if (enemy.hp <= 0) return;
  const armor = getEnemyDef(enemy.defId).armor;
  const dmg = Math.max(1, amount - armor * (1 - armorPierce));
  enemy.hp -= dmg;
  if (enemy.hp <= 0) killEnemy(state, enemy, sourceTowerId);
};

const pickTarget = (state: GameState, tower: Tower, range: number): Enemy | null => {
  let best: Enemy | null = null;
  let bestScore = -Infinity;
  const r2 = range * range;
  for (const e of state.enemies) {
    const dx = e.pos.x - tower.pos.x;
    const dy = e.pos.y - tower.pos.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > r2) continue;
    let score: number;
    switch (tower.targetMode) {
      case 'last':
        score = -e.dist;
        break;
      case 'strongest':
        score = e.hp;
        break;
      case 'closest':
        score = -d2;
        break;
      default:
        score = e.dist;
    }
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
};

const fire = (state: GameState, tower: Tower, target: Enemy, stats: TowerStats, color: string) => {
  tower.angle = Math.atan2(target.pos.y - tower.pos.y, target.pos.x - tower.pos.x);
  if (stats.projectileSpeed > 0) {
    state.projectiles.push({
      id: nextId(state),
      from: { x: tower.pos.x, y: tower.pos.y },
      pos: { x: tower.pos.x, y: tower.pos.y },
      targetId: target.id,
      speed: stats.projectileSpeed,
      damage: stats.damage,
      splashRadius: stats.splashRadius,
      slowFactor: stats.slowFactor,
      slowDuration: stats.slowDuration,
      stunDuration: stats.stunDuration,
      dotDps: stats.dotDps,
      dotDuration: stats.dotDuration,
      armorPierce: stats.armorPierce,
      color,
      sourceTowerId: tower.id,
    });
    return;
  }
  // hitscan
  state.fx.push({
    kind: 'beam',
    from: { x: tower.pos.x, y: tower.pos.y },
    to: { x: target.pos.x, y: target.pos.y },
    color,
    age: 0,
    ttl: 0.12,
  });
  const hit = new Set<Enemy>([target]);
  let prev = target;
  let damage = stats.damage;
  const prevPos = { x: target.pos.x, y: target.pos.y };
  damageEnemy(state, target, damage, stats.armorPierce, tower.id);
  if (target.hp > 0) applyStatus(state, target, stats);
  for (let i = 0; i < stats.chainCount; i++) {
    let next: Enemy | null = null;
    let nextD = CHAIN_RANGE;
    for (const e of state.enemies) {
      if (hit.has(e)) continue;
      const d = Math.hypot(e.pos.x - prevPos.x, e.pos.y - prevPos.y);
      if (d <= nextD) {
        nextD = d;
        next = e;
      }
    }
    if (!next) break;
    damage *= CHAIN_FALLOFF;
    hit.add(next);
    state.fx.push({
      kind: 'zap',
      from: { x: prevPos.x, y: prevPos.y },
      to: { x: next.pos.x, y: next.pos.y },
      color,
      age: 0,
      ttl: 0.18,
    });
    prev = next;
    prevPos.x = prev.pos.x;
    prevPos.y = prev.pos.y;
    damageEnemy(state, next, damage, stats.armorPierce, tower.id);
    if (next.hp > 0) applyStatus(state, next, stats);
  }
};

const detonate = (state: GameState, p: Projectile, at: Vec, target: Enemy | null) => {
  if (p.splashRadius > 0) {
    state.fx.push({
      kind: 'ring',
      from: { x: at.x, y: at.y },
      color: p.color,
      age: 0,
      ttl: 0.3,
      radius: p.splashRadius,
    });
    const snapshot = state.enemies.slice();
    for (const e of snapshot) {
      const d = Math.hypot(e.pos.x - at.x, e.pos.y - at.y);
      if (d > p.splashRadius) continue;
      const falloff = 1 - 0.5 * (d / p.splashRadius);
      damageEnemy(state, e, p.damage * falloff, p.armorPierce, p.sourceTowerId);
      if (e.hp > 0) applyStatus(state, e, p);
    }
  } else if (target) {
    damageEnemy(state, target, p.damage, p.armorPierce, p.sourceTowerId);
    if (target.hp > 0) applyStatus(state, target, p);
  }
};

const updateProjectiles = (state: GameState, dt: number) => {
  const list = state.projectiles;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    let target: Enemy | null = null;
    for (const e of state.enemies) {
      if (e.id === p.targetId) {
        target = e;
        break;
      }
    }
    if (target) lastSeen.set(p, { x: target.pos.x, y: target.pos.y });
    // target died or left: keep flying to where it was last seen
    const aim: Vec = target ? target.pos : (lastSeen.get(p) ?? p.pos);
    const dx = aim.x - p.pos.x;
    const dy = aim.y - p.pos.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= step + HIT_RADIUS) {
      const at = { x: aim.x, y: aim.y };
      list.splice(i, 1);
      detonate(state, p, at, target);
    } else {
      p.pos.x += (dx / d) * step;
      p.pos.y += (dy / d) * step;
    }
  }
};

export const updateCombat = (state: GameState, dt: number): void => {
  // (1) damage over time, ignores armor
  const snapshot = state.enemies.slice();
  for (const e of snapshot) {
    if (state.time < e.dotUntil && e.dotDps > 0) {
      e.hp -= e.dotDps * dt;
      if (e.hp <= 0) killEnemy(state, e);
    }
  }

  // (2)+(3) towers
  const mul = state.time < state.buffs.fireRateMulUntil ? state.buffs.fireRateMul || 1 : 1;
  for (const tower of state.towers) {
    tower.cooldownLeft -= dt;
    if (tower.cooldownLeft > 0) continue;
    const stats = effectiveTowerStats(state, tower);
    const target = pickTarget(state, tower, stats.range);
    if (!target) {
      tower.cooldownLeft = 0;
      continue;
    }
    fire(state, tower, target, stats, getTowerDef(tower.defId).color);
    tower.cooldownLeft = stats.cooldown / mul;
  }

  // (4)+(5) projectiles
  updateProjectiles(state, dt);

  // (6) fx aging
  const fx = state.fx;
  let w = 0;
  for (let i = 0; i < fx.length; i++) {
    const f = fx[i];
    f.age += dt;
    if (f.age < f.ttl) fx[w++] = f;
  }
  fx.length = w;
};

