import type { BuildingDef, BuildingStats, StatMod, UpgradeNode } from '../engine/types';

const ZERO: BuildingStats = {
  auraRange: 0,
  fireRateBonus: 0,
  rangeBonus: 0,
  damageBonus: 0,
  incomePerWave: 0,
  healPerWave: 0,
  bountyBonus: 0,
};

const node = (
  id: string,
  name: string,
  cost: number,
  parent: string | null,
  mods: StatMod<BuildingStats>[],
  branch?: 'A' | 'B',
): UpgradeNode<BuildingStats> => ({
  id,
  name,
  cost,
  parent,
  mods,
  ...(branch && { branch }),
});

const add = (stat: keyof BuildingStats, value: number): StatMod<BuildingStats> => ({
  stat,
  op: 'add',
  value,
});

export const BUILDING_DEFS: BuildingDef[] = [
  {
    id: 'farm',
    name: 'SETI@home Farm',
    blurb: 'Crunches alien signals for spare credits every wave.',
    cost: 175,
    color: '#7dff3a',
    shape: 'square',
    hotkey: 'q',
    base: { ...ZERO, incomePerWave: 40 },
    tree: [
      node('n2', 'Screensaver Mode', 105, null, [add('incomePerWave', 25)]),
      node('n3a', 'Distributed Network', 175, 'n2', [add('incomePerWave', 50)], 'A'),
      node(
        'n3b',
        'Spyware Reseller',
        175,
        'n2',
        [add('bountyBonus', 0.1), add('incomePerWave', 15)],
        'B',
      ),
      node('n4a', 'Grid Computing', 245, 'n3a', [add('incomePerWave', 70)], 'A'),
      node(
        'n4b',
        'Adware Bundle',
        245,
        'n3b',
        [add('bountyBonus', 0.1), add('incomePerWave', 20)],
        'B',
      ),
      node('n5a', 'Folding Empire', 350, 'n4a', [add('incomePerWave', 100)], 'A'),
      node(
        'n5b',
        'Data Broker',
        350,
        'n4b',
        [add('bountyBonus', 0.15), add('incomePerWave', 30)],
        'B',
      ),
    ],
  },
  {
    id: 'rack',
    name: 'Celeron Overclock Rack',
    blurb: 'Overclocked Celerons speed up nearby towers.',
    cost: 250,
    color: '#ff4d4d',
    shape: 'hex',
    hotkey: 'w',
    base: { ...ZERO, auraRange: 120, fireRateBonus: 0.15 },
    tree: [
      node('n2', 'Bigger Heatsink', 150, null, [add('auraRange', 20)]),
      node('n3a', 'Liquid Cooling', 250, 'n2', [add('fireRateBonus', 0.1)], 'A'),
      node('n3b', 'Voltage Mod', 250, 'n2', [add('damageBonus', 0.15)], 'B'),
      node('n4a', 'Peltier Plate', 350, 'n3a', [add('fireRateBonus', 0.1)], 'A'),
      node(
        'n4b',
        'Hard Mod Bios',
        350,
        'n3b',
        [add('damageBonus', 0.15), add('fireRateBonus', 0.05)],
        'B',
      ),
      node('n5a', 'Phase Change Unit', 500, 'n4a', [add('fireRateBonus', 0.15)], 'A'),
      node(
        'n5b',
        'Core Meltdown',
        500,
        'n4b',
        [add('damageBonus', 0.2), add('fireRateBonus', 0.05)],
        'B',
      ),
    ],
  },
  {
    id: 'antenna',
    name: '802.11b Uplink Antenna',
    blurb: 'Boosts the range of every tower in its signal.',
    cost: 200,
    color: '#b36bff',
    shape: 'triangle',
    hotkey: 'e',
    base: { ...ZERO, auraRange: 140, rangeBonus: 0.15 },
    tree: [
      node('n2', 'Signal Booster', 120, null, [add('rangeBonus', 0.05)]),
      node('n3a', 'Directional Dish', 200, 'n2', [add('rangeBonus', 0.1)], 'A'),
      node('n3b', 'Mesh Network', 200, 'n2', [add('auraRange', 40), add('damageBonus', 0.08)], 'B'),
      node('n4a', 'Parabolic Reflector', 280, 'n3a', [add('rangeBonus', 0.1)], 'A'),
      node(
        'n4b',
        'Roaming Hotspot',
        280,
        'n3b',
        [add('auraRange', 60), add('damageBonus', 0.1)],
        'B',
      ),
      node('n5a', 'Satellite Uplink', 400, 'n4a', [add('rangeBonus', 0.15)], 'A'),
      node(
        'n5b',
        'Wardriving Swarm',
        400,
        'n4b',
        [add('auraRange', 60), add('damageBonus', 0.1)],
        'B',
      ),
    ],
  },
  {
    id: 'backup',
    name: 'Tape Backup Server',
    blurb: 'Restores integrity after every wave. Mind the tapes.',
    cost: 225,
    color: '#ffffff',
    shape: 'circle',
    hotkey: 'r',
    base: { ...ZERO, healPerWave: 3 },
    tree: [
      node('n2', 'Spare DAT Tapes', 135, null, [add('healPerWave', 2)]),
      node('n3a', 'RAID Array', 225, 'n2', [add('healPerWave', 4)], 'A'),
      node(
        'n3b',
        'Offsite Backup',
        225,
        'n2',
        [add('healPerWave', 2), add('incomePerWave', 20)],
        'B',
      ),
      node('n4a', 'Hot Spare', 315, 'n3a', [add('healPerWave', 6)], 'A'),
      node('n4b', 'Cloud Sync', 315, 'n3b', [add('healPerWave', 3), add('incomePerWave', 30)], 'B'),
      node('n5a', 'Disaster Recovery', 450, 'n4a', [add('healPerWave', 8)], 'A'),
      node(
        'n5b',
        'Redundant Datacenter',
        450,
        'n4b',
        [add('healPerWave', 4), add('incomePerWave', 40)],
        'B',
      ),
    ],
  },
];

export const getBuildingDef = (id: string): BuildingDef => {
  const def = BUILDING_DEFS.find((d) => d.id === id);
  if (!def) throw new Error(`Unknown building: ${id}`);
  return def;
};
