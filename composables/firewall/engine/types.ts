export const CELL = 40;
export const COLS = 18;
export const ROWS = 11;
export const W = COLS * CELL;
export const H = ROWS * CELL;

export interface Vec {
  x: number;
  y: number;
}

export interface Cell {
  col: number;
  row: number;
}

export type TargetMode = 'first' | 'last' | 'strongest' | 'closest';

export type Shape = 'diamond' | 'hex' | 'triangle' | 'square' | 'circle';

export interface TowerStats {
  damage: number;
  range: number;
  cooldown: number;
  /** px/s, 0 = hitscan beam */
  projectileSpeed: number;
  splashRadius: number;
  /** 1 = none, 0.6 = 40% slower */
  slowFactor: number;
  slowDuration: number;
  stunDuration: number;
  dotDps: number;
  dotDuration: number;
  /** extra targets after the first */
  chainCount: number;
  /** 0..1 fraction of armor ignored */
  armorPierce: number;
}

export interface BuildingStats {
  auraRange: number;
  fireRateBonus: number;
  rangeBonus: number;
  damageBonus: number;
  incomePerWave: number;
  healPerWave: number;
  bountyBonus: number;
}

export interface StatMod<S> {
  stat: keyof S;
  op: 'add' | 'mul';
  value: number;
}

export interface UpgradeNode<S> {
  id: string;
  name: string;
  cost: number;
  parent: string | null;
  mods: StatMod<S>[];
  branch?: 'A' | 'B';
}

export interface TowerDef {
  id: string;
  name: string;
  blurb: string;
  cost: number;
  /** neon css color */
  color: string;
  shape: Shape;
  hotkey: string;
  base: TowerStats;
  tree: UpgradeNode<TowerStats>[];
}

export interface BuildingDef {
  id: string;
  name: string;
  blurb: string;
  cost: number;
  color: string;
  shape: Shape;
  hotkey: string;
  base: BuildingStats;
  tree: UpgradeNode<BuildingStats>[];
}

export interface AbilityDef {
  id: string;
  name: string;
  blurb: string;
  cooldown: number;
  unlock: { building: string; level: number };
  targeting: 'none' | 'point';
  color: string;
  hotkey: string;
}

export interface EnemyDef {
  id: string;
  name: string;
  blurb: string;
  hp: number;
  speed: number;
  /** flat damage reduction per hit, min 1 damage */
  armor: number;
  bounty: number;
  /** integrity lost when it escapes */
  leak: number;
  radius: number;
  color: string;
  shape: Shape;
  spawnsOnDeath?: { enemyId: string; count: number };
  boss?: boolean;
}

export interface SpawnGroup {
  enemyId: string;
  count: number;
  /** seconds between spawns */
  interval: number;
  /** seconds after wave start */
  delay: number;
}

export interface WaveDef {
  /** shown in the ticker */
  name: string;
  groups: SpawnGroup[];
  /** credits on clear */
  bonus: number;
}

export interface Tower {
  id: number;
  defId: string;
  cell: Cell;
  pos: Vec;
  purchased: string[];
  /** computed from def.base + purchased, without auras */
  stats: TowerStats;
  cooldownLeft: number;
  angle: number;
  targetMode: TargetMode;
  spent: number;
  kills: number;
}

export interface Building {
  id: number;
  defId: string;
  cell: Cell;
  pos: Vec;
  purchased: string[];
  stats: BuildingStats;
  spent: number;
}

export interface Enemy {
  id: number;
  defId: string;
  hp: number;
  maxHp: number;
  dist: number;
  pos: Vec;
  slowFactor: number;
  slowUntil: number;
  stunUntil: number;
  dotDps: number;
  dotUntil: number;
}

export interface Projectile {
  id: number;
  from: Vec;
  pos: Vec;
  targetId: number;
  speed: number;
  damage: number;
  splashRadius: number;
  slowFactor: number;
  slowDuration: number;
  stunDuration: number;
  dotDps: number;
  dotDuration: number;
  armorPierce: number;
  color: string;
  sourceTowerId: number;
}

export interface Fx {
  kind: 'beam' | 'ring' | 'burst' | 'text' | 'zap';
  from: Vec;
  to?: Vec;
  color: string;
  age: number;
  ttl: number;
  radius?: number;
  text?: string;
}

export interface SpawnQueueItem {
  /** wave-relative seconds */
  at: number;
  enemyId: string;
}

export interface ScoreSubmission {
  name: string;
  /** waves cleared */
  wave: number;
  won: boolean;
  kills: number;
  integrity: number;
  credits: number;
}

export interface ScoreEntry {
  id: number;
  name: string;
  score: number;
  wave: number;
  won: boolean;
  kills: number;
  createdAt: string;
}

export type Phase = 'title' | 'build' | 'wave' | 'won' | 'lost';

export interface GameState {
  phase: Phase;
  paused: boolean;
  speed: 1 | 2 | 3;
  /** index of next wave to start; waves cleared = wave while in build */
  wave: number;
  credits: number;
  integrity: number;
  maxIntegrity: number;
  /** total sim seconds */
  time: number;
  waveTime: number;
  spawnQueue: SpawnQueueItem[];
  towers: Tower[];
  buildings: Building[];
  enemies: Enemy[];
  projectiles: Projectile[];
  fx: Fx[];
  /** remaining seconds per ability id */
  abilityCooldowns: Record<string, number>;
  buffs: { fireRateMul: number; fireRateMulUntil: number };
  /** newest last, capped at 30 */
  news: string[];
  nextId: number;
  stats: { kills: number; leaks: number };
}

const NEWS_CAP = 30;

export const pushNews = (state: GameState, text: string) => {
  state.news.push(text);
  if (state.news.length > NEWS_CAP) state.news.splice(0, state.news.length - NEWS_CAP);
};

export const nextId = (state: GameState) => state.nextId++;

/** The only source of randomness for engine code, so tests can stub it. */
export const rand = () => Math.random();
