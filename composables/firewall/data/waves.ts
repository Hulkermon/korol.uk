import type { SpawnGroup, WaveDef } from '../engine/types';

const baseHpScale = (waveIndex: number): number =>
  1 + 0.12 * waveIndex + 0.003 * waveIndex * waveIndex + 0.18 * Math.max(0, waveIndex - 10);

/**
 * Enemy HP multiplier. The extra slope after wave 10 keeps the late waves from going slack; past
 * wave 20 it flattens, because the waves themselves keep growing.
 */
export const hpScaleForWave = (waveIndex: number): number =>
  waveIndex < 20 ? baseHpScale(waveIndex) : baseHpScale(19) + 0.1 * (waveIndex - 19);

const g = (enemyId: string, count: number, interval: number, delay = 0): SpawnGroup => ({
  enemyId,
  count,
  interval,
  delay,
});

const BASE: { name: string; groups: SpawnGroup[] }[] = [
  { name: 'Spam Folder', groups: [g('popup', 8, 1.2)] },
  { name: 'Chain Letters', groups: [g('popup', 8, 1), g('worm', 4, 1.2, 10)] },
  { name: 'Forwarded Jokes', groups: [g('worm', 8, 1), g('popup', 10, 0.8, 8)] },
  { name: 'Free Toolbars', groups: [g('spyware', 8, 0.8), g('worm', 8, 0.9, 8)] },
  { name: 'Horse Trading', groups: [g('popup', 12, 0.6), g('trojan', 2, 2.5, 8)] },
  {
    name: 'Download Manager',
    groups: [g('spyware', 12, 0.6), g('trojan', 3, 2, 6), g('worm', 8, 0.8, 14)],
  },
  { name: 'Window Shopping', groups: [g('hydra', 4, 1.8), g('popup', 14, 0.5, 6)] },
  {
    name: 'Hydra Season',
    groups: [g('hydra', 6, 1.5), g('spyware', 12, 0.5, 6), g('trojan', 3, 2, 12)],
  },
  {
    name: 'Pre-Millennium Tension',
    groups: [g('hydra', 8, 1.2), g('trojan', 5, 1.6, 4), g('worm', 14, 0.6, 12)],
  },
  {
    name: 'The Y2K Bug',
    groups: [
      g('y2k', 1, 1),
      g('popup', 20, 0.5, 4),
      g('spyware', 14, 0.5, 14),
      g('hydra', 4, 1.5, 20),
    ],
  },
  {
    name: 'Reply All',
    groups: [g('worm', 20, 0.5), g('trojan', 6, 1.5, 6), g('hydra', 6, 1.2, 14)],
  },
  {
    name: 'Spyware Rush',
    groups: [g('spyware', 30, 0.3), g('hydra', 6, 1.2, 4), g('trojan', 6, 1.5, 14)],
  },
  {
    name: 'Trojan Parade',
    groups: [g('trojan', 12, 1), g('worm', 18, 0.5, 6), g('spyware', 16, 0.4, 14)],
  },
  {
    name: 'Hydra Swarm',
    groups: [g('hydra', 14, 0.8), g('popup', 24, 0.3, 4), g('trojan', 8, 1.2, 14)],
  },
  {
    name: 'Kernel Panic Room',
    groups: [g('rootkit', 4, 2), g('spyware', 24, 0.4, 4), g('hydra', 10, 0.9, 12)],
  },
  {
    name: 'Hidden Files',
    groups: [g('rootkit', 8, 1.5), g('worm', 24, 0.4, 4), g('trojan', 10, 1, 14)],
  },
  {
    name: 'Mass Mailer',
    groups: [
      g('worm', 30, 0.3),
      g('rootkit', 8, 1.4, 6),
      g('hydra', 14, 0.8, 14),
      g('spyware', 20, 0.3, 22),
    ],
  },
  {
    name: 'Total Infection',
    groups: [
      g('rootkit', 12, 1.2),
      g('trojan', 14, 0.9, 4),
      g('hydra', 16, 0.7, 14),
      g('spyware', 20, 0.3, 24),
    ],
  },
  {
    name: 'Calm Before the Crash',
    groups: [
      g('rootkit', 14, 1),
      g('hydra', 18, 0.6, 4),
      g('trojan', 14, 0.8, 12),
      g('worm', 24, 0.3, 24),
    ],
  },
  {
    name: 'Blue Screen of Death',
    groups: [
      g('bsod', 1, 1),
      g('rootkit', 12, 1, 4),
      g('hydra', 16, 0.6, 10),
      g('trojan', 10, 0.8, 18),
      g('spyware', 24, 0.3, 26),
    ],
  },
  {
    name: 'Service Pack Zero',
    groups: [
      g('rootkit', 14, 1),
      g('trojan', 14, 0.8, 4),
      g('hydra', 18, 0.6, 12),
      g('spyware', 26, 0.3, 24),
    ],
  },
  {
    name: 'Registry Cleaner',
    groups: [
      g('spyware', 32, 0.25),
      g('rootkit', 14, 1, 6),
      g('hydra', 20, 0.6, 14),
      g('trojan', 14, 0.8, 26),
    ],
  },
  {
    name: 'Drive-By Download',
    groups: [
      g('worm', 34, 0.25),
      g('hydra', 20, 0.6, 4),
      g('rootkit', 16, 0.9, 12),
      g('trojan', 16, 0.7, 24),
    ],
  },
  {
    name: 'Zero-Day Special',
    groups: [
      g('rootkit', 18, 0.9),
      g('trojan', 16, 0.7, 4),
      g('hydra', 22, 0.5, 12),
      g('spyware', 24, 0.25, 22),
      g('worm', 20, 0.25, 30),
    ],
  },
  {
    name: 'Rootkit Convention',
    groups: [
      g('rootkit', 32, 0.7),
      g('hydra', 24, 0.5, 6),
      g('trojan', 20, 0.65, 14),
      g('spyware', 30, 0.25, 26),
    ],
  },
  {
    name: 'Botnet Uprising',
    groups: [
      g('worm', 30, 0.25),
      g('spyware', 26, 0.25, 6),
      g('hydra', 22, 0.5, 14),
      g('rootkit', 20, 0.75, 22),
      g('trojan', 16, 0.65, 32),
    ],
  },
  {
    name: 'Ransom Note',
    groups: [
      g('trojan', 24, 0.65),
      g('rootkit', 24, 0.75, 4),
      g('hydra', 28, 0.5, 14),
      g('spyware', 34, 0.25, 26),
      g('worm', 12, 0.25, 38),
    ],
  },
  {
    name: 'Cascade Failure',
    groups: [
      g('rootkit', 24, 0.75),
      g('hydra', 28, 0.5, 4),
      g('trojan', 22, 0.6, 12),
      g('worm', 34, 0.25, 22),
      g('spyware', 32, 0.25, 32),
    ],
  },
  {
    name: 'Last Dance of the Mainframe',
    groups: [
      g('rootkit', 26, 0.7),
      g('hydra', 30, 0.45, 6),
      g('trojan', 24, 0.6, 14),
      g('spyware', 34, 0.25, 26),
      g('worm', 36, 0.25, 36),
    ],
  },
  {
    name: 'Blue Screen of Death II: The Reckoning',
    groups: [
      g('bsod', 1, 1),
      g('rootkit', 20, 0.9, 4),
      g('hydra', 24, 0.55, 10),
      g('bsod', 1, 1, 20),
      g('trojan', 18, 0.65, 26),
      g('spyware', 28, 0.25, 36),
    ],
  },
];

export const WAVES: WaveDef[] = BASE.map((w, i) => ({
  name: `Wave ${i + 1}: ${w.name}`,
  groups: w.groups,
  bonus: 50 + 7 * i,
}));

export const WAVE_COUNT = WAVES.length;
