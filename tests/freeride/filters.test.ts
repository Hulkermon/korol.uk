import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LEGEND,
  clampRange,
  countByStars,
  countByTier,
  dayToNum,
  filterEvents,
  numToDay,
  overlapsRange,
  passesLegend,
  seasonBounds,
} from '@/composables/freeride/filters';
import type { LegendFilter } from '@/composables/freeride/filters';
import type { FreerideEvent } from '@/composables/freeride/types';

function ev(p: Partial<FreerideEvent>): FreerideEvent {
  return {
    id: 'x',
    name: 'X',
    tier: 'pro',
    stars: null,
    start: '2027-01-10',
    end: '2027-01-12',
    place: 'Nowhere',
    countryCode: null,
    lat: 0,
    lng: 0,
    status: 'upcoming',
    registrationMode: null,
    price: null,
    url: '',
    registerUrl: '',
    divisions: [],
    ...p,
  };
}

const range = { from: '2027-01-10', to: '2027-01-20' };

describe('DEFAULT_LEGEND', () => {
  it('hides juniors, shows everything else', () => {
    expect(DEFAULT_LEGEND.tiers).toEqual({
      pro: true,
      challenger: true,
      qualifier: true,
      junior: false,
    });
    expect(DEFAULT_LEGEND.stars).toEqual({ 1: true, 2: true, 3: true, 4: true });
    expect(passesLegend(ev({ tier: 'junior' }), DEFAULT_LEGEND)).toBe(false);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(DEFAULT_LEGEND)).toBe(true);
    expect(Object.isFrozen(DEFAULT_LEGEND.tiers)).toBe(true);
    expect(Object.isFrozen(DEFAULT_LEGEND.stars)).toBe(true);
  });
});

describe('passesLegend', () => {
  const noStars: LegendFilter = {
    tiers: { ...DEFAULT_LEGEND.tiers },
    stars: { 1: false, 2: false, 3: false, 4: false },
  };

  it('star-less event ignores star toggles', () => {
    expect(passesLegend(ev({ tier: 'pro', stars: null }), noStars)).toBe(true);
  });

  it('starred event needs its star toggle', () => {
    expect(passesLegend(ev({ tier: 'qualifier', stars: 2 }), noStars)).toBe(false);
    const f = { ...noStars, stars: { ...noStars.stars, 2: true } };
    expect(passesLegend(ev({ tier: 'qualifier', stars: 2 }), f)).toBe(true);
  });

  it('tier must be on', () => {
    const f = { ...DEFAULT_LEGEND, tiers: { ...DEFAULT_LEGEND.tiers, pro: false } };
    expect(passesLegend(ev({ tier: 'pro' }), f)).toBe(false);
  });
});

describe('overlapsRange', () => {
  it('event ending exactly on from overlaps', () => {
    expect(overlapsRange(ev({ start: '2027-01-08', end: '2027-01-10' }), range)).toBe(true);
  });
  it('event ending the day before from does not', () => {
    expect(overlapsRange(ev({ start: '2027-01-08', end: '2027-01-09' }), range)).toBe(false);
  });
  it('event starting exactly on to overlaps', () => {
    expect(overlapsRange(ev({ start: '2027-01-20', end: '2027-01-22' }), range)).toBe(true);
  });
  it('event starting the day after to does not', () => {
    expect(overlapsRange(ev({ start: '2027-01-21', end: '2027-01-22' }), range)).toBe(false);
  });
  it('event spanning the whole range overlaps', () => {
    expect(overlapsRange(ev({ start: '2027-01-01', end: '2027-02-01' }), range)).toBe(true);
  });
});

describe('filterEvents', () => {
  it('applies legend and range', () => {
    const a = ev({ id: 'a' });
    const b = ev({ id: 'b', tier: 'junior' });
    const c = ev({ id: 'c', start: '2027-03-01', end: '2027-03-02' });
    expect(filterEvents([a, b, c], DEFAULT_LEGEND, range)).toEqual([a]);
  });
});

describe('seasonBounds', () => {
  it('falls back when empty', () => {
    expect(seasonBounds([])).toEqual({ from: '2026-12-01', to: '2027-04-30' });
  });
  it('uses min start and max end', () => {
    const events = [
      ev({ start: '2027-02-01', end: '2027-02-03' }),
      ev({ start: '2026-12-15', end: '2026-12-16' }),
      ev({ start: '2027-03-01', end: '2027-03-09' }),
      ev({ start: '2027-03-02', end: '2027-03-03' }),
    ];
    expect(seasonBounds(events)).toEqual({ from: '2026-12-15', to: '2027-03-09' });
  });
});

describe('dayToNum / numToDay', () => {
  it('epoch is 0', () => {
    expect(dayToNum('1970-01-01')).toBe(0);
    expect(numToDay(0)).toBe('1970-01-01');
  });
  it('round trips across a leap day', () => {
    expect(numToDay(dayToNum('2028-02-28') + 1)).toBe('2028-02-29');
    expect(numToDay(dayToNum('2028-02-29') + 1)).toBe('2028-03-01');
    expect(dayToNum('2028-03-01') - dayToNum('2028-02-28')).toBe(2);
    for (const d of ['2028-02-29', '2026-12-31', '2027-04-30']) {
      expect(numToDay(dayToNum(d))).toBe(d);
    }
  });
});

describe('counts', () => {
  const events = [
    ev({ tier: 'pro', stars: null }),
    ev({ tier: 'qualifier', stars: 1 }),
    ev({ tier: 'qualifier', stars: 1 }),
    ev({ tier: 'challenger', stars: 3 }),
  ];
  it('countByTier', () => {
    expect(countByTier(events)).toEqual({ pro: 1, challenger: 1, qualifier: 2, junior: 0 });
  });
  it('countByStars ignores star-less', () => {
    expect(countByStars(events)).toEqual({ 1: 2, 2: 0, 3: 1, 4: 0 });
  });
});

describe('clampRange', () => {
  const bounds = { from: '2026-12-01', to: '2027-04-30' };
  it('clamps into bounds', () => {
    expect(clampRange({ from: '2026-01-01', to: '2028-01-01' }, bounds)).toEqual(bounds);
  });
  it('swaps when from > to', () => {
    expect(clampRange({ from: '2027-03-01', to: '2027-02-01' }, bounds)).toEqual({
      from: '2027-02-01',
      to: '2027-03-01',
    });
  });
  it('leaves valid range alone', () => {
    const r = { from: '2027-01-01', to: '2027-01-05' };
    expect(clampRange(r, bounds)).toEqual(r);
  });
});
