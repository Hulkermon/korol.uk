import { describe, it, expect } from 'vitest';
import { computeScore, validateSubmission } from '../../composables/firewall/engine/score';

const good = { name: 'Bob', wave: 20, won: true, kills: 100, integrity: 50, credits: 200 };

describe('computeScore', () => {
  it('computes the formula', () => {
    expect(
      computeScore({ wave: 5, kills: 10, integrity: 0, credits: 7, won: false }),
    ).toBe(5000 + 100 + 0 + 3);
    expect(computeScore({ wave: 20, kills: 1, integrity: 1, credits: 0, won: true })).toBe(
      20000 + 10 + 25 + 10000,
    );
  });
  it('clamps bad inputs', () => {
    expect(computeScore({ wave: -3, kills: NaN, integrity: -1, credits: -9, won: false })).toBe(0);
    expect(computeScore({ wave: 1.9, kills: 0, integrity: 0, credits: 0, won: false })).toBe(1000);
  });
  it('a win is worth more than a loss with the same stats', () => {
    const base = { kills: 300, integrity: 0, credits: 500 };
    const loss = computeScore({ ...base, wave: 19, won: false });
    const win = computeScore({ ...base, wave: 20, won: true });
    expect(win).toBeGreaterThan(loss + 10000);
  });
});

describe('validateSubmission', () => {
  it('accepts a valid win and a valid loss', () => {
    expect(validateSubmission(good).ok).toBe(true);
    expect(validateSubmission({ ...good, won: false, integrity: 0, wave: 7 }).ok).toBe(true);
  });
  it('rejects non-objects', () => {
    for (const b of [null, 'x', 5, [], undefined]) expect(validateSubmission(b).ok).toBe(false);
  });
  it('cleans names', () => {
    const r = validateSubmission({ ...good, name: '  a\u0000b \t  c\n ' });
    expect(r.ok && r.value.name).toBe('ab c');
  });
  it('rejects bad names', () => {
    expect(validateSubmission({ ...good, name: 5 }).ok).toBe(false);
    expect(validateSubmission({ ...good, name: ' \n ' }).ok).toBe(false);
    expect(validateSubmission({ ...good, name: 'x'.repeat(25) }).ok).toBe(false);
    expect(validateSubmission({ ...good, name: 'x'.repeat(24) }).ok).toBe(true);
  });
  it('rejects bad numbers', () => {
    expect(validateSubmission({ ...good, wave: 21 }).ok).toBe(false);
    expect(validateSubmission({ ...good, wave: 1.5 }).ok).toBe(false);
    expect(validateSubmission({ ...good, kills: 5001 }).ok).toBe(false);
    expect(validateSubmission({ ...good, kills: -1 }).ok).toBe(false);
    expect(validateSubmission({ ...good, credits: 1000001 }).ok).toBe(false);
    expect(validateSubmission({ ...good, integrity: 101 }).ok).toBe(false);
    expect(validateSubmission({ ...good, integrity: NaN }).ok).toBe(false);
  });
  it('rejects bad won', () => {
    expect(validateSubmission({ ...good, won: 'yes' }).ok).toBe(false);
    expect(validateSubmission({ ...good, wave: 19 }).ok).toBe(false);
    expect(validateSubmission({ ...good, integrity: 0 }).ok).toBe(false);
    expect(validateSubmission({ ...good, won: false, integrity: 5, wave: 3 }).ok).toBe(false);
  });
});
