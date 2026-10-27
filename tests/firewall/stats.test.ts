import { describe, expect, it } from 'vitest';
import { getTowerDef } from '../../composables/firewall/data/towers';
import {
  availableUpgrades,
  computeStats,
  getLevel,
  lockedUpgrades,
} from '../../composables/firewall/engine/stats';
import type { UpgradeNode } from '../../composables/firewall/engine/types';

const ping = getTowerDef('ping');

describe('computeStats', () => {
  it('applies add before mul and ignores unpurchased nodes', () => {
    const tree: UpgradeNode<{ a: number }>[] = [
      {
        id: 'x',
        name: 'x',
        blurb: '',
        cost: 1,
        parent: null,
        mods: [
          { stat: 'a', op: 'mul', value: 2 },
          { stat: 'a', op: 'add', value: 3 },
        ],
      },
      {
        id: 'y',
        name: 'y',
        blurb: '',
        cost: 1,
        parent: 'x',
        mods: [{ stat: 'a', op: 'add', value: 100 }],
      },
    ];
    expect(computeStats({ a: 1 }, tree, ['x'])).toEqual({ a: 8 });
    expect(computeStats({ a: 1 }, tree, [])).toEqual({ a: 1 });
  });

  it('multiplies cooldown directly and does not mutate base', () => {
    const s = computeStats(ping.base, ping.tree, ['n2', 'n3a']);
    expect(s.damage).toBeCloseTo(ping.base.damage * 1.4);
    expect(s.cooldown).toBeCloseTo(ping.base.cooldown * 0.6);
    expect(ping.base.cooldown).toBe(0.45);
  });
});

describe('upgrades', () => {
  it('getLevel is 1 + purchased', () => {
    expect(getLevel([])).toBe(1);
    expect(getLevel(['n2', 'n3a'])).toBe(3);
  });

  it('offers the root first', () => {
    expect(availableUpgrades(ping.tree, []).map((n) => n.id)).toEqual(['n2']);
  });

  it('offers both level-3 nodes after n2', () => {
    expect(availableUpgrades(ping.tree, ['n2']).map((n) => n.id)).toEqual(['n3a', 'n3b']);
  });

  it('offers only the chosen branch afterwards', () => {
    expect(availableUpgrades(ping.tree, ['n2', 'n3b']).map((n) => n.id)).toEqual(['n4b']);
  });

  it('offers nothing at level 5', () => {
    expect(availableUpgrades(ping.tree, ['n2', 'n3a', 'n4a', 'n5a'])).toEqual([]);
  });

  it('lists the sibling of the chosen fork as locked', () => {
    expect(lockedUpgrades(ping.tree, ['n2']).map((n) => n.id)).toEqual([]);
    expect(lockedUpgrades(ping.tree, ['n2', 'n3a']).map((n) => n.id)).toEqual(['n3b']);
  });
});
