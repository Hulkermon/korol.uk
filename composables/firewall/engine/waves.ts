import { getEnemyDef } from '../data/enemies';
import { WAVES, hpScaleForWave } from '../data/waves';
import { getPathLength, posAtDist } from './path';
import { nextId, pushNews, type Enemy, type GameState } from './types';

export const createEnemy = (state: GameState, defId: string, dist = 0): Enemy => {
  const def = getEnemyDef(defId);
  const maxHp = def.hp * hpScaleForWave(state.wave);
  const enemy: Enemy = {
    id: nextId(state),
    defId,
    hp: maxHp,
    maxHp,
    dist,
    pos: posAtDist(dist),
    slowFactor: 1,
    slowUntil: 0,
    stunUntil: 0,
    dotDps: 0,
    dotUntil: 0,
  };
  state.enemies.push(enemy);
  return enemy;
};

export const startWave = (state: GameState): void => {
  if (state.phase !== 'build' || state.wave >= WAVES.length) return;
  const wave = WAVES[state.wave];
  state.phase = 'wave';
  state.waveTime = 0;
  state.spawnQueue = [];
  for (const group of wave.groups) {
    for (let i = 0; i < group.count; i++) {
      state.spawnQueue.push({ at: group.delay + i * group.interval, enemyId: group.enemyId });
    }
  }
  state.spawnQueue.sort((a, b) => a.at - b.at);
  pushNews(state, `Incoming: ${wave.name}`);
};

export const updateWaves = (state: GameState, dt: number): void => {
  state.waveTime += dt;
  while (state.spawnQueue.length > 0 && state.spawnQueue[0].at <= state.waveTime) {
    const item = state.spawnQueue.shift()!;
    createEnemy(state, item.enemyId);
  }

  const length = getPathLength();
  const remaining: Enemy[] = [];
  for (const enemy of state.enemies) {
    const def = getEnemyDef(enemy.defId);
    if (state.time >= enemy.stunUntil) {
      const slow = state.time < enemy.slowUntil ? enemy.slowFactor : 1;
      enemy.dist += def.speed * slow * dt;
    }
    if (enemy.dist >= length) {
      state.integrity = Math.max(0, state.integrity - def.leak);
      state.stats.leaks++;
      const exit = posAtDist(length);
      state.fx.push({ kind: 'burst', from: exit, color: '#ff2a2a', age: 0, ttl: 0.5, radius: 30 });
      pushNews(state, `${def.name} breached the firewall! -${def.leak} integrity`);
      continue;
    }
    enemy.pos = posAtDist(enemy.dist);
    remaining.push(enemy);
  }
  state.enemies = remaining;
};

export const isWaveCleared = (state: GameState): boolean =>
  state.spawnQueue.length === 0 && state.enemies.length === 0;
