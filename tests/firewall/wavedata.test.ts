import { describe, expect, it } from 'vitest';
import { ENEMY_DEFS, getEnemyDef } from '../../composables/firewall/data/enemies';
import { WAVES, hpScaleForWave } from '../../composables/firewall/data/waves';

const total = (i: number) => WAVES[i].groups.reduce((n, grp) => n + grp.count, 0);
const hasBoss = (i: number) => WAVES[i].groups.some((grp) => getEnemyDef(grp.enemyId).boss);

describe('enemy data', () => {
  it('has 8 enemies with unique ids', () => {
    expect(ENEMY_DEFS).toHaveLength(8);
    expect(new Set(ENEMY_DEFS.map((e) => e.id)).size).toBe(8);
  });

  it('spawnsOnDeath references existing enemies', () => {
    for (const e of ENEMY_DEFS) {
      if (e.spawnsOnDeath) expect(() => getEnemyDef(e.spawnsOnDeath!.enemyId)).not.toThrow();
    }
  });
});

describe('wave data', () => {
  it('has 20 waves referencing existing enemies', () => {
    expect(WAVES).toHaveLength(20);
    for (const w of WAVES)
      for (const grp of w.groups) expect(() => getEnemyDef(grp.enemyId)).not.toThrow();
  });

  it('has bosses only in waves 10 and 20', () => {
    WAVES.forEach((_, i) => expect(hasBoss(i)).toBe(i === 9 || i === 19));
  });

  it('hpScaleForWave is strictly increasing', () => {
    for (let i = 1; i < 20; i++) expect(hpScaleForWave(i)).toBeGreaterThan(hpScaleForWave(i - 1));
  });

  it('late waves are bigger than early waves', () => {
    const avg = (a: number, b: number) => {
      let s = 0;
      for (let i = a; i < b; i++) s += total(i);
      return s / (b - a);
    };
    expect(avg(15, 20)).toBeGreaterThan(avg(0, 5));
    expect(total(0)).toBeLessThanOrEqual(10);
  });
});
