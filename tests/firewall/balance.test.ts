import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { TOWER_DEFS } from '../../composables/firewall/data/towers';
import { availableUpgrades, computeStats } from '../../composables/firewall/engine/stats';
import { playBot, type Branch, type Outcome } from './planbot';
import { costToLevel, holdWave, simulate } from './sim';

afterEach(() => vi.restoreAllMocks());

const ENTITIES = [
  'ping1',
  'ping2',
  'arc1',
  'arc2',
  'bomb1',
  'bomb2',
  'ice1',
  'scan1',
  'farm',
  'rack',
  'antenna',
];

/** deterministic fork assignments, so that a failure is reproducible */
const randomForks = (count: number): Record<string, Branch>[] => {
  let x = 4242;
  const next = () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296;
  return Array.from({ length: count }, () =>
    Object.fromEntries(ENTITIES.map((k) => [k, next() < 0.5 ? 'A' : 'B'])),
  );
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const winRate = (runs: Outcome[]) => runs.filter((r) => r.phase === 'won').length / runs.length;
const run = (opts: Parameters<typeof playBot>[0]) => {
  const out = playBot(opts);
  vi.restoreAllMocks();
  return out;
};

describe('skilled bot (hand-built plan)', () => {
  const SEEDS = [11, 12, 13, 14];
  let none: Outcome;
  let plain: Outcome;
  let noSupport: Outcome;
  let good: Outcome;
  let uniformA: Outcome[];
  let uniformB: Outcome[];
  let mixed: Outcome[];

  beforeAll(() => {
    none = run({ defense: false });
    plain = run({ upgrades: false });
    good = run({ branch: 'A', untilWave: 10 });
    noSupport = run({ support: false, untilWave: 10 });
    uniformA = SEEDS.map((seed) => run({ branch: 'A', seed }));
    uniformB = SEEDS.map((seed) => run({ branch: 'B', seed }));
    mixed = randomForks(12).map((branches, i) => run({ branches, seed: 100 + i }));
  }, 120_000);

  it('loses an undefended run within the first 6 waves', () => {
    expect(none.phase).toBe('lost');
    expect(none.wave).toBeLessThan(6);
  });

  it('does not lose the game in the first 10 waves, whatever the forks', () => {
    for (const r of [...uniformA, ...uniformB, ...mixed]) {
      expect(r.integrityAt[9]).toBeGreaterThan(40);
      expect(r.integrityAt[10]).toBeGreaterThan(30);
    }
  });

  it('does worse without any upgrades', () => {
    expect(plain.phase).toBe('lost');
    expect(plain.score).toBeLessThan(mean(uniformA.map((r) => r.score)));
  });

  it('is poorer at wave 10 without the Farm and Rack', () => {
    expect(noSupport.creditsAt[9]).toBeLessThan(good.creditsAt[9]);
    expect(noSupport.wealthAt[9]).toBeLessThan(good.wealthAt[9]);
  });

  it('wins nearly every fork combination', () => {
    expect(winRate(uniformA)).toBe(1);
    expect(winRate(uniformB)).toBe(1);
    expect(winRate(mixed)).toBeGreaterThanOrEqual(0.9);
  });

  it('is never a walkover: every run ends with integrity to spare, not to waste', () => {
    for (const r of [...uniformA, ...uniformB, ...mixed]) {
      expect(r.integrity).toBeLessThan(95);
    }
    expect(mean(mixed.map((r) => r.integrity))).toBeGreaterThan(15);
    expect(mean(mixed.map((r) => r.integrity))).toBeLessThan(75);
  });

  it('has no dominant fork: all-A and all-B finish within 15% of each other', () => {
    const a = mean(uniformA.map((r) => r.score));
    const b = mean(uniformB.map((r) => r.score));
    expect(Math.abs(a - b) / Math.max(a, b)).toBeLessThan(0.15);
  });
});

describe('weaker players', () => {
  const SEEDS = [21, 22, 23, 24, 25, 26];
  let optimal: Outcome[];
  let casual: Outcome[];
  let careless: Outcome[];

  beforeAll(() => {
    optimal = SEEDS.map((seed) => run({ seed, branch: 'B' }));
    casual = SEEDS.map((seed) => run({ seed, branch: 'B', sloppy: 0.3 }));
    careless = SEEDS.map((seed) => run({ seed, branch: 'B', sloppy: 0.6 }));
  }, 120_000);

  it('win less often the less of the plan they build', () => {
    expect(winRate(optimal)).toBeGreaterThan(winRate(casual));
    expect(winRate(casual)).toBeGreaterThanOrEqual(winRate(careless));
  });

  it('can still win with most of the plan, but not with half of it', () => {
    expect(winRate(casual)).toBeGreaterThan(0);
    expect(winRate(careless)).toBeLessThanOrEqual(0.2);
  });

  it('lose late, not early', () => {
    for (const r of careless.filter((x) => x.phase === 'lost')) {
      expect(r.wave).toBeGreaterThanOrEqual(10);
    }
  });
});

describe('exploits and dominant strategies', () => {
  it('two Pings on fork B cannot stun-lock a late wave', () => {
    // with unlimited re-stunning this pair held 19 of 20 waves; without it, about 8
    const pair = 2 * costToLevel('ping', 5, 'B');
    expect(holdWave('ping', 'B', 5, pair, 12).leaked).toBeGreaterThan(3);
  });

  it('a pile of level-1 Scanners cannot hold the late waves', () => {
    expect(holdWave('scanner', 'A', 1, 2400, 14).leaked).toBeGreaterThan(3);
  });

  it('ICE alone is a support, not a defense', () => {
    for (const branch of ['A', 'B'] as const) {
      expect(holdWave('ice', branch, 5, 4000, 12).leaked).toBeGreaterThan(3);
    }
  });
});

describe('naive bot (spends evenly, saves for the next item)', () => {
  const SEEDS = [31, 32, 33];
  const SUPPORT = ['farm', 'rack', 'backup'];
  // opening with a cheap tower: the first 300 credits decide a lot
  const leak = (towers: string[]) =>
    mean(
      SEEDS.map((seed) => {
        const r = simulate({ towers, support: SUPPORT, maxTowers: 8, immortal: true }, seed);
        vi.restoreAllMocks();
        return r.leak;
      }),
    );

  it('does better with a mixed team than with only ARC, only Bomb or only ICE', () => {
    const mixed = leak(['ping', 'bomb', 'arc', 'scanner']);
    for (const only of ['arc', 'bomb', 'ice']) {
      expect(mixed).toBeLessThan(leak([only]));
    }
  });
});

describe('tower value for money', () => {
  const levels = (id: string, branch: Branch) => {
    const def = TOWER_DEFS.find((d) => d.id === id)!;
    const out: { level: number; perCredit: number }[] = [];
    let purchased: string[] = [];
    for (let level = 1; level <= 5; level++) {
      if (level > 1) {
        const options = availableUpgrades(def.tree, purchased);
        const node = options.length > 1 ? options.find((n) => n.branch === branch)! : options[0];
        purchased = [...purchased, node.id];
      }
      const s = computeStats(def.base, def.tree, purchased);
      // single-target damage per second against armor 3, counting the first chain hop
      const armor = 3;
      const hit = (dmg: number) => Math.max(1, dmg - armor * (1 - s.armorPierce));
      let total = hit(s.damage);
      let dmg = s.damage;
      for (let i = 0; i < Math.min(s.chainCount, 2); i++) total += hit((dmg *= 0.8));
      const dps = total / s.cooldown + s.dotDps * Math.min(1, s.dotDuration / s.cooldown);
      out.push({ level, perCredit: dps / costToLevel(id, level, branch) });
    }
    return out;
  };

  it('keeps every damage dealer within a band of the others at each level', () => {
    const dealers = ['ping', 'scanner', 'arc'];
    for (let level = 1; level <= 5; level++) {
      const values = dealers.flatMap((id) =>
        (['A', 'B'] as const).map((b) => levels(id, b)[level - 1].perCredit),
      );
      expect(Math.max(...values) / Math.min(...values)).toBeLessThan(2.5);
    }
  });

  it('never gets worse value out of a fork than half of its sibling', () => {
    // ICE fork A is a pure slow tower, so damage per credit says nothing about it
    for (const id of ['ping', 'scanner', 'arc', 'bomb']) {
      const a = levels(id, 'A')[4].perCredit;
      const b = levels(id, 'B')[4].perCredit;
      expect(Math.min(a, b) / Math.max(a, b)).toBeGreaterThan(0.4);
    }
  });
});
