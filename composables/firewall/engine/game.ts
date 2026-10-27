import { ABILITY_DEFS } from '../data/abilities';
import { WAVES } from '../data/waves';
import { updateAbilities } from './abilities';
import { applyWaveEndPassives } from './buildings';
import { updateCombat } from './combat';
import { pushNews, type GameState } from './types';
import { isWaveCleared, updateWaves } from './waves';

const MAX_STEP = 0.05;

export const createGame = (): GameState => {
  const abilityCooldowns: Record<string, number> = {};
  for (const def of ABILITY_DEFS) abilityCooldowns[def.id] = 0;
  return {
    phase: 'title',
    paused: false,
    speed: 1,
    wave: 0,
    credits: 300,
    integrity: 100,
    maxIntegrity: 100,
    time: 0,
    waveTime: 0,
    spawnQueue: [],
    towers: [],
    buildings: [],
    enemies: [],
    projectiles: [],
    fx: [],
    abilityCooldowns,
    buffs: { fireRateMul: 1, fireRateMulUntil: 0 },
    news: [
      'Welcome to FIREWALL.EXE v1.0',
      'Loading threat database... OK',
      'Perimeter online. Place defenses to begin.',
    ],
    nextId: 1,
    stats: { kills: 0, leaks: 0 },
  };
};

const step = (state: GameState, dt: number): void => {
  state.time += dt;
  updateAbilities(state, dt);
  if (state.phase === 'wave') updateWaves(state, dt);
  updateCombat(state, dt);

  if (state.integrity <= 0) {
    state.phase = 'lost';
    pushNews(state, 'FIREWALL BREACHED. System compromised.');
    return;
  }
  if (state.phase === 'wave' && isWaveCleared(state)) {
    state.credits += WAVES[state.wave].bonus;
    applyWaveEndPassives(state);
    state.wave++;
    if (state.wave >= WAVES.length) {
      state.phase = 'won';
      pushNews(state, 'All threats neutralized. System secure.');
    } else {
      state.phase = 'build';
      pushNews(state, `Wave ${state.wave} cleared. Prepare for the next one.`);
    }
  }
};

export const update = (state: GameState, realDt: number): void => {
  if (state.paused || (state.phase !== 'build' && state.phase !== 'wave')) return;
  let remaining = Math.min(realDt, MAX_STEP) * state.speed;
  while (remaining > 1e-9) {
    const dt = Math.min(remaining, MAX_STEP);
    remaining -= dt;
    step(state, dt);
    if (state.phase !== 'build' && state.phase !== 'wave') break;
  }
};

export const beginRun = (state: GameState): void => {
  if (state.phase === 'title') state.phase = 'build';
};

export const restartGame = (state: GameState): void => {
  Object.assign(state, createGame());
  beginRun(state);
};
