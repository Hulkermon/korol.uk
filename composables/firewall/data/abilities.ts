import type { AbilityDef } from '../engine/types';

export const ABILITY_DEFS: AbilityDef[] = [
  {
    id: 'restore',
    name: 'System Restore',
    blurb: 'Rolls back the damage: heals 15 integrity.',
    cooldown: 60,
    unlock: { building: 'backup', level: 1 },
    targeting: 'none',
    color: '#ffffff',
    hotkey: 'z',
  },
  {
    id: 'auction',
    name: 'eBay Auction',
    blurb: 'Instantly sells spare cycles for credits.',
    cooldown: 75,
    unlock: { building: 'farm', level: 2 },
    targeting: 'none',
    color: '#7dff3a',
    hotkey: 'x',
  },
  {
    id: 'surge',
    name: 'Overclock Surge',
    blurb: 'All towers fire 2x for 8s.',
    cooldown: 60,
    unlock: { building: 'rack', level: 2 },
    targeting: 'none',
    color: '#ff4d4d',
    hotkey: 'c',
  },
  {
    id: 'ion',
    name: 'Ion Cannon',
    blurb: 'Orbital strike. Click the map.',
    cooldown: 50,
    unlock: { building: 'antenna', level: 2 },
    targeting: 'point',
    color: '#b36bff',
    hotkey: 'v',
  },
  {
    id: 'ctrlaltdel',
    name: 'Ctrl+Alt+Del',
    blurb: 'Freezes every enemy for 4s.',
    cooldown: 90,
    unlock: { building: 'backup', level: 3 },
    targeting: 'none',
    color: '#6aa8ff',
    hotkey: 'b',
  },
];

export const getAbilityDef = (id: string): AbilityDef => {
  const def = ABILITY_DEFS.find((d) => d.id === id);
  if (!def) throw new Error(`Unknown ability: ${id}`);
  return def;
};
