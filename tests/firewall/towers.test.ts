import { describe, expect, it } from 'vitest';
import { getTowerDef, TOWER_DEFS } from '../../composables/firewall/data/towers';
import type { TowerDef, TowerStats } from '../../composables/firewall/engine/types';

const NODE_IDS = ['n2', 'n3a', 'n3b', 'n4a', 'n4b', 'n5a', 'n5b'];
const PARENTS: Record<string, string | null> = {
  n2: null,
  n3a: 'n2',
  n3b: 'n2',
  n4a: 'n3a',
  n5a: 'n4a',
  n4b: 'n3b',
  n5b: 'n4b',
};

const applyMods = (def: TowerDef, ids: string[]): TowerStats => {
  const s = { ...def.base };
  for (const id of ids) {
    const node = def.tree.find((n) => n.id === id)!;
    for (const m of node.mods.filter((m) => m.op === 'add')) s[m.stat] += m.value;
    for (const m of node.mods.filter((m) => m.op === 'mul')) s[m.stat] *= m.value;
  }
  return s;
};

describe('firewall towers', () => {
  it('has 5 defs with unique ids and hotkeys', () => {
    expect(TOWER_DEFS).toHaveLength(5);
    expect(new Set(TOWER_DEFS.map((d) => d.id)).size).toBe(5);
    expect(TOWER_DEFS.map((d) => d.hotkey).sort()).toEqual(['1', '2', '3', '4', '5']);
  });

  for (const def of TOWER_DEFS) {
    describe(def.id, () => {
      it('has the specified tree shape', () => {
        expect(def.tree.map((n) => n.id).sort()).toEqual(NODE_IDS);
        for (const n of def.tree) {
          expect(n.parent).toBe(PARENTS[n.id]);
          if (n.id.endsWith('a')) expect(n.branch).toBe('A');
          if (n.id.endsWith('b')) expect(n.branch).toBe('B');
        }
      });

      it('uses real stat keys', () => {
        for (const n of def.tree) {
          expect(n.mods.length).toBeGreaterThan(0);
          for (const m of n.mods) expect(m.stat in def.base).toBe(true);
        }
      });

      it('has positive costs increasing along each branch', () => {
        const cost = (id: string) => def.tree.find((n) => n.id === id)!.cost;
        for (const n of def.tree) expect(n.cost).toBeGreaterThan(0);
        for (const b of ['a', 'b']) {
          const chain = ['n2', `n3${b}`, `n4${b}`, `n5${b}`].map(cost);
          for (let i = 1; i < chain.length; i++) expect(chain[i]).toBeGreaterThan(chain[i - 1]);
        }
      });

      it('stays finite with positive cooldown when fully upgraded', () => {
        for (const b of ['a', 'b']) {
          const s = applyMods(def, ['n2', `n3${b}`, `n4${b}`, `n5${b}`]);
          for (const v of Object.values(s)) expect(Number.isFinite(v)).toBe(true);
          expect(s.cooldown).toBeGreaterThan(0);
          expect(s.armorPierce).toBeLessThanOrEqual(1);
        }
      });
    });
  }

  it('getTowerDef finds defs and throws for unknown ids', () => {
    expect(getTowerDef('ping').name).toBe('PING Cannon');
    expect(() => getTowerDef('nope')).toThrow();
  });
});
