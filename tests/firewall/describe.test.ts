import { describe, expect, it } from 'vitest';
import {
  BUILDING_STAT_FORMATS,
  TOWER_STAT_FORMATS,
  describeUpgrade,
  statRows,
} from '../../composables/firewall/engine/describe';
import { getTowerDef } from '../../composables/firewall/data/towers';
import { getBuildingDef } from '../../composables/firewall/data/buildings';

const upgrade = (towerId: string, nodeId: string) => {
  const def = getTowerDef(towerId);
  const node = def.tree.find((n) => n.id === nodeId)!;
  return describeUpgrade(def.base, def.tree, node, TOWER_STAT_FORMATS);
};

describe('describeUpgrade', () => {
  it('shows before and after for changed stats only', () => {
    expect(upgrade('ping', 'n2')).toEqual(['Damage 9 → 12.6']);
  });

  it('accumulates earlier upgrades on the path', () => {
    expect(upgrade('ping', 'n3a')).toEqual(['Rate 2.22/s → 3.7/s']);
  });

  it('lists every stat an upgrade touches', () => {
    expect(upgrade('ping', 'n3b')).toEqual(['Damage 12.6 → 20.16', 'Pierce 50%']);
  });

  it('shows only the new value for a newly gained effect', () => {
    expect(upgrade('ice', 'n3b')).toEqual(['DoT 14/s', 'DoT time 3s']);
  });

  it('describes slow as a percentage', () => {
    expect(upgrade('ice', 'n3a')).toEqual(['Slow 40% → 56.8%']);
  });

  it('describes building upgrades', () => {
    const def = getBuildingDef('farm');
    const node = def.tree.find((n) => n.id === 'n2')!;
    expect(describeUpgrade(def.base, def.tree, node, BUILDING_STAT_FORMATS)).toEqual([
      'Income $40/wave → $65/wave',
    ]);
  });

  it('describes every upgrade of every tower with at least one line', () => {
    for (const id of ['ping', 'scanner', 'arc', 'ice', 'bomb']) {
      for (const n of getTowerDef(id).tree) expect(upgrade(id, n.id).length).toBeGreaterThan(0);
    }
  });
});

describe('statRows', () => {
  it('hides inactive stats', () => {
    const labels = statRows(getTowerDef('ping').base, TOWER_STAT_FORMATS).map((r) => r[0]);
    expect(labels).toEqual(['Damage', 'Range', 'Rate']);
  });
});
