import { describe, expect, it } from 'vitest';
import {
  classifyName,
  endDay,
  inSeason,
  isInEurope,
  isTrustedOrg,
  toDay
} from '@/composables/freeride/classify';

describe('classifyName', () => {
  it('classifies real names', () => {
    expect(classifyName('2027 Nendaz Freeride Qualifier 2*')).toEqual({
      tier: 'qualifier',
      stars: 2
    });
    expect(classifyName('2027 Evolution 2 Freeride Series Valfréjus Qualifier 4*')).toEqual({
      tier: 'qualifier',
      stars: 4
    });
    expect(classifyName('2027 YETI Freeride World Tour Verbier Junior 4*')).toEqual({
      tier: 'junior',
      stars: 4
    });
    expect(classifyName('2027 Baqueira Beret Pro By Occident')).toEqual({
      tier: 'pro',
      stars: null
    });
    expect(classifyName('2027 Georgia pro')).toEqual({ tier: 'pro', stars: null });
    expect(classifyName('2027 Fieberbrunn pro')).toEqual({ tier: 'pro', stars: null });
  });

  it('handles challenger and FWQ', () => {
    expect(classifyName('2027 Foo Challenger')).toEqual({ tier: 'challenger', stars: null });
    expect(classifyName('2027 Foo Challenger 3*')).toEqual({ tier: 'challenger', stars: 3 });
    expect(classifyName('2020 Bar FWQ 3*')).toEqual({ tier: 'qualifier', stars: 3 });
  });

  it('applies precedence', () => {
    expect(classifyName('Freeride World Tour Junior 4*')?.tier).toBe('junior');
    expect(classifyName('Pro Challenger')?.tier).toBe('challenger');
    expect(classifyName('Pro Qualifier 2*')?.tier).toBe('qualifier');
    expect(classifyName('2027 Nendaz Freeride Video Contest Junior 1*')).toEqual({
      tier: 'junior',
      stars: 1
    });
  });

  it('returns null for unknown names', () => {
    expect(classifyName('Some Random Contest')).toBeNull();
    expect(classifyName('Improvement camp')).toBeNull();
  });
});

describe('isTrustedOrg', () => {
  it('matches known ids', () => {
    expect(isTrustedOrg('29100')).toBe(true);
    expect(isTrustedOrg('30783')).toBe(true);
    expect(isTrustedOrg('1')).toBe(false);
  });
});

describe('isInEurope', () => {
  it('uses the bbox', () => {
    expect(isInEurope(42.5, 44.5)).toBe(true);
    expect(isInEurope(46.1, 7.3)).toBe(true);
    expect(isInEurope(35, -25)).toBe(true);
    expect(isInEurope(72, 45)).toBe(true);
    expect(isInEurope(42.8, 140.7)).toBe(false);
    expect(isInEurope(40.58, -111.65)).toBe(false);
  });
});

describe('toDay / endDay', () => {
  it('uses the UTC date', () => {
    expect(toDay('2027-02-14T07:00:00Z')).toBe('2027-02-14');
    expect(toDay('2027-02-14T23:30:00-05:00')).toBe('2027-02-15');
  });

  it('computes end day', () => {
    expect(endDay('2027-02-14', 1)).toBe('2027-02-14');
    expect(endDay('2027-02-14', 0)).toBe('2027-02-14');
    expect(endDay('2027-02-14', 3)).toBe('2027-02-16');
    expect(endDay('2027-02-27', 3)).toBe('2027-03-01');
  });
});

describe('inSeason', () => {
  it('is inclusive at edges', () => {
    expect(inSeason('2026-10-01')).toBe(true);
    expect(inSeason('2027-06-30')).toBe(true);
    expect(inSeason('2026-09-30')).toBe(false);
    expect(inSeason('2027-07-01')).toBe(false);
  });

  it('accepts a custom season', () => {
    expect(inSeason('2025-12-01', { from: '2025-10-01', to: '2026-06-30' })).toBe(true);
  });
});
