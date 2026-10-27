import type { SpawnGroup, WaveDef } from '../engine/types';

export const hpScaleForWave = (waveIndex: number): number =>
  1 + 0.12 * waveIndex + 0.003 * waveIndex * waveIndex;

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
];

export const WAVES: WaveDef[] = BASE.map((w, i) => ({
  name: `Wave ${i + 1}: ${w.name}`,
  groups: w.groups,
  bonus: 50 + 7 * i,
}));
