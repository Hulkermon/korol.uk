import { describe, expect, it } from 'vitest';
import { BUILDING_DEFS, getBuildingDef } from '../../composables/firewall/data/buildings';
import { ABILITY_DEFS, getAbilityDef } from '../../composables/firewall/data/abilities';

const STAT_KEYS = [
  'auraRange',
  'fireRateBonus',
  'rangeBonus',
  'damageBonus',
  'incomePerWave',
  'healPerWave',
  'bountyBonus',
];
const PARENTS: Record<string, string | null> = {
  n2: null,
  n3a: 'n2',
  n3b: 'n2',
  n4a: 'n3a',
  n5a: 'n4a',
  n4b: 'n3b',
  n5b: 'n4b',
};

describe('buildings', () => {
  it('has 4 buildings with unique ids and hotkeys', () => {
    expect(BUILDING_DEFS).toHaveLength(4);
    expect(new Set(BUILDING_DEFS.map((d) => d.id)).size).toBe(4);
    expect(new Set(BUILDING_DEFS.map((d) => d.hotkey)).size).toBe(4);
  });

  for (const def of BUILDING_DEFS) {
    describe(def.id, () => {
      it('has the 7-node tree shape', () => {
        expect(def.tree.map((n) => n.id).sort()).toEqual(Object.keys(PARENTS).sort());
        for (const n of def.tree) {
          expect(n.parent).toBe(PARENTS[n.id]);
          if (n.id.endsWith('a') && n.id !== 'n2') expect(n.branch).toBe('A');
          if (n.id.endsWith('b')) expect(n.branch).toBe('B');
        }
      });

      it('uses real stat keys, increasing costs', () => {
        expect(def.cost).toBeGreaterThan(0);
        for (const k of Object.keys(def.base)) expect(STAT_KEYS).toContain(k);
        for (const n of def.tree) {
          expect(n.cost).toBeGreaterThan(0);
          expect(n.mods.length).toBeGreaterThan(0);
          for (const m of n.mods) expect(STAT_KEYS).toContain(m.stat);
        }
        const cost = (id: string) => def.tree.find((n) => n.id === id)!.cost;
        for (const b of ['a', 'b']) {
          expect(cost('n2')).toBeLessThan(cost(`n3${b}`));
          expect(cost(`n3${b}`)).toBeLessThan(cost(`n4${b}`));
          expect(cost(`n4${b}`)).toBeLessThan(cost(`n5${b}`));
        }
      });
    });
  }

  it('getBuildingDef looks up and throws on unknown id', () => {
    expect(getBuildingDef('farm').id).toBe('farm');
    expect(() => getBuildingDef('nope')).toThrow();
  });
});

describe('abilities', () => {
  it('has 5 abilities with unique ids and hotkeys', () => {
    expect(ABILITY_DEFS).toHaveLength(5);
    expect(new Set(ABILITY_DEFS.map((d) => d.id)).size).toBe(5);
    expect(new Set(ABILITY_DEFS.map((d) => d.hotkey)).size).toBe(5);
  });

  it('unlocks reference existing buildings with level 1-5', () => {
    for (const a of ABILITY_DEFS) {
      expect(() => getBuildingDef(a.unlock.building)).not.toThrow();
      expect(a.unlock.level).toBeGreaterThanOrEqual(1);
      expect(a.unlock.level).toBeLessThanOrEqual(5);
      expect(a.cooldown).toBeGreaterThan(0);
    }
  });

  it('getAbilityDef looks up and throws on unknown id', () => {
    expect(getAbilityDef('ion').targeting).toBe('point');
    expect(() => getAbilityDef('nope')).toThrow();
  });
});

describe('hotkeys across towers, buildings and abilities', () => {
  it('are unique (tower hotkeys 1-5 hardcoded; towers.ts not imported)', () => {
    const keys = [
      '1',
      '2',
      '3',
      '4',
      '5',
      ...BUILDING_DEFS.map((d) => d.hotkey),
      ...ABILITY_DEFS.map((d) => d.hotkey),
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });
});
