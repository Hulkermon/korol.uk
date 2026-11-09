import { describe, expect, it } from 'vitest';
import {
  formatPoints,
  isFinished,
  primaryRanking,
  rankHomies,
  categoryOf,
  riderCategory,
  groupHomies,
  riderPoints,
  riderProfile,
} from '@/composables/freeride/riders';
import type {
  Athlete,
  Division,
  EventSnapshot,
  FreerideEvent,
  RiderRanking,
} from '@/composables/freeride/types';

function ev(id: string, start: string, divisions: Division[], over: Partial<FreerideEvent> = {}) {
  return {
    id,
    name: `Event ${id}`,
    tier: 'pro',
    stars: null,
    start,
    end: start,
    place: 'X',
    countryCode: null,
    lat: 0,
    lng: 0,
    status: 'upcoming',
    registrationMode: null,
    price: null,
    url: '',
    registerUrl: '',
    divisions,
    ...over,
  } as FreerideEvent;
}

function div(over: Partial<Division> = {}): Division {
  return { name: 'Men Ski', entryCount: 0, riders: [], results: [], ...over };
}

function rk(tier: RiderRanking['tier'], points: number, results: RiderRanking['results'] = []) {
  return {
    seriesId: tier,
    series: `S-${tier}`,
    tier,
    division: 'Men Ski',
    place: 3,
    points,
    results,
  } as RiderRanking;
}

const rider = { athleteId: 'a1', name: 'Ann', nationality: 'FR', status: 'confirmed' };
const result = { place: 2, athleteId: 'a1', name: 'Ann', nationality: 'FR', points: 800 };

function snap(events: FreerideEvent[], athletes: Record<string, Athlete> = {}): EventSnapshot {
  return { fetchedAt: '', season: '2026', source: '', events, athletes };
}

describe('isFinished', () => {
  it('checks status and results', () => {
    expect(isFinished(ev('1', '2026-01-01', [div()]))).toBe(false);
    expect(isFinished(ev('1', '2026-01-01', [], { status: 'finished' }))).toBe(true);
    expect(isFinished(ev('1', '2026-01-01', [], { status: 'results_published' }))).toBe(true);
    expect(isFinished(ev('1', '2026-01-01', [div({ results: [result] })]))).toBe(true);
  });
});

describe('primaryRanking / riderPoints', () => {
  const a: Athlete = {
    id: 'a1',
    name: 'Ann',
    nationality: 'FR',
    image: null,
    rankings: [rk('qualifier', 9000), rk('pro', 100), rk('pro', 500)],
  };
  it('prefers highest tier then points', () => {
    expect(primaryRanking(a)?.points).toBe(500);
    expect(riderPoints({ a1: a }, 'a1')).toEqual({
      points: 500,
      place: 3,
      series: 'S-pro',
      tier: 'pro',
    });
  });
  it('returns null without rankings or athlete', () => {
    const b = { ...a, rankings: [] };
    expect(primaryRanking(b)).toBeNull();
    expect(riderPoints({ a1: b }, 'a1')).toBeNull();
    expect(riderPoints({}, 'zz')).toBeNull();
  });
});

describe('rankHomies', () => {
  const ath = (id: string, tier: RiderRanking['tier'], points: number): Athlete => ({
    id,
    name: id,
    nationality: null,
    image: null,
    rankings: [rk(tier, points)],
  });
  const h = (key: string, name = key) => ({ key, name });
  const keys = (r: { homie: { key: string } }[]) => r.map((x) => x.homie.key);

  it('returns an empty list for no homies', () => {
    expect(rankHomies([], {})).toEqual([]);
  });

  it('puts a pro with fewer points above a qualifier with more', () => {
    const athletes = { p: ath('p', 'pro', 10), q: ath('q', 'qualifier', 9000) };
    expect(keys(rankHomies([h('q'), h('p')], athletes))).toEqual(['p', 'q']);
  });

  it('sorts by points descending within a tier', () => {
    const athletes = { a: ath('a', 'pro', 100), b: ath('b', 'pro', 300), c: ath('c', 'pro', 200) };
    expect(keys(rankHomies([h('a'), h('b'), h('c')], athletes))).toEqual(['b', 'c', 'a']);
  });

  it('breaks ties by name', () => {
    const athletes = { a: ath('a', 'pro', 100), b: ath('b', 'pro', 100) };
    const r = rankHomies([h('b', 'Zed'), h('a', 'Amy')], athletes);
    expect(keys(r)).toEqual(['a', 'b']);
  });

  it('puts unranked last, alphabetical, without medals', () => {
    const athletes = { a: ath('a', 'junior', 1) };
    const r = rankHomies([h('z', 'Zed'), h('y', 'Amy'), h('a', 'Ann')], athletes);
    expect(keys(r)).toEqual(['a', 'y', 'z']);
    expect(r.map((x) => x.medal)).toEqual([1, null, null]);
  });

  it('awards medals only to the first three ranked', () => {
    const athletes = {
      a: ath('a', 'pro', 4),
      b: ath('b', 'pro', 3),
      c: ath('c', 'pro', 2),
      d: ath('d', 'pro', 1),
    };
    const r = rankHomies([h('d'), h('c'), h('b'), h('a')], athletes);
    expect(r.map((x) => x.medal)).toEqual([1, 2, 3, null]);
    const two = rankHomies([h('b'), h('a')], athletes);
    expect(two.map((x) => x.medal)).toEqual([1, 2]);
  });
});

describe('riderProfile', () => {
  it('builds sorted entries with dropped flag and other results', () => {
    const events = [
      ev('2', '2026-03-01', [div({ riders: [rider] })]),
      ev('1', '2026-02-01', [div({ riders: [rider], results: [result] })]),
    ];
    const a: Athlete = {
      id: 'a1',
      name: 'Ann Full',
      nationality: 'FR',
      image: 'img',
      rankings: [
        rk('pro', 500, [
          { eventId: '1', eventName: 'E1', date: '', place: 2, points: 800, dropped: true },
          {
            eventId: '9',
            eventName: 'E9',
            date: '2025-12-01',
            place: 1,
            points: 1,
            dropped: false,
          },
        ]),
        rk('qualifier', 10, [
          {
            eventId: '9',
            eventName: 'E9',
            date: '2025-12-01',
            place: 1,
            points: 1,
            dropped: false,
          },
          {
            eventId: '8',
            eventName: 'E8',
            date: '2025-11-01',
            place: 1,
            points: 1,
            dropped: false,
          },
        ]),
      ],
    };
    const p = riderProfile(snap(events, { a1: a }), 'a1')!;
    expect(p.name).toBe('Ann Full');
    expect(p.image).toBe('img');
    expect(p.ranking?.tier).toBe('pro');
    expect(p.entries.map((e) => e.event.id)).toEqual(['1', '2']);
    expect(p.entries[0].result).toEqual({ place: 2, points: 800, dropped: true });
    expect(p.entries[0].status).toBe('confirmed');
    expect(p.entries[1].result).toBeNull();
    expect(p.otherResults.map((r) => r.eventId)).toEqual(['8', '9']);
    expect(p.otherResults[0].series).toBe('S-qualifier');
  });

  it('handles athlete only in results', () => {
    const events = [ev('1', '2026-02-01', [div({ results: [result] })])];
    const p = riderProfile(snap(events), 'a1')!;
    expect(p.name).toBe('Ann');
    expect(p.nationality).toBe('FR');
    expect(p.image).toBeNull();
    expect(p.ranking).toBeNull();
    expect(p.entries[0].status).toBeNull();
    expect(p.entries[0].result?.dropped).toBe(false);
  });

  it('handles athlete without rankings', () => {
    const a: Athlete = { id: 'a1', name: 'Ann', nationality: null, image: null, rankings: [] };
    const p = riderProfile(snap([], { a1: a }), 'a1')!;
    expect(p.ranking).toBeNull();
    expect(p.entries).toEqual([]);
    expect(p.otherResults).toEqual([]);
  });

  it('returns null for unknown id', () => {
    expect(
      riderProfile(snap([ev('1', '2026-02-01', [div({ riders: [rider] })])]), 'nope'),
    ).toBeNull();
  });
});

describe('formatPoints', () => {
  it('formats with separators', () => {
    expect(formatPoints(5100)).toBe('5,100 pts');
    expect(formatPoints(0)).toBe('0 pts');
  });
});

describe('categoryOf', () => {
  it.each([
    ['Ski Men', 'Ski Men'],
    ['Ski Women U-19', 'Ski Women'],
    ['Master Snowboard Women', 'Snowboard Women'],
    ['Snowboard Men U-15', 'Snowboard Men'],
    ['Men Ski', 'Ski Men'],
    ['Women Snowboard', 'Snowboard Women'],
  ])('%s -> %s', (div, cat) => {
    expect(categoryOf(div)).toBe(cat);
  });

  it('returns null for unknown or missing divisions', () => {
    expect(categoryOf('Open')).toBeNull();
    expect(categoryOf('Ski')).toBeNull();
    expect(categoryOf(null)).toBeNull();
    expect(categoryOf(undefined)).toBeNull();
  });
});

describe('riderCategory and groupHomies', () => {
  const athlete = (id: string, division: string, tier: RiderRanking['tier'], points: number) =>
    ({
      id,
      name: id,
      nationality: null,
      image: null,
      rankings: [{ ...rk(tier, points), division }],
    }) as Athlete;
  const event = (id: string, start: string, divisions: [string, string[]][]) =>
    ({
      id,
      name: id,
      start,
      divisions: divisions.map(([name, ids]) => ({
        name,
        entryCount: ids.length,
        riders: ids.map((a) => ({ athleteId: a, name: a, nationality: null, status: 'confirmed' })),
        results: [],
      })),
    }) as unknown as FreerideEvent;

  it('prefers the ranking division over event entries', () => {
    const athletes = { a: athlete('a', 'Snowboard Women', 'qualifier', 10) };
    const events = [event('e', '2027-01-01', [['Ski Men', ['a']]])];
    expect(riderCategory(athletes, events, 'a')).toBe('Snowboard Women');
  });

  it('falls back to the earliest categorised division entered', () => {
    const events = [
      event('late', '2027-03-01', [['Snowboard Men', ['b']]]),
      event('early', '2027-01-01', [
        ['Open', ['b']],
        ['Ski Women', ['b']],
      ]),
    ];
    expect(riderCategory({}, events, 'b')).toBe('Ski Women');
    expect(riderCategory({}, events, 'zzz')).toBeNull();
  });

  it('ranks each category separately in a fixed order, uncategorised last', () => {
    const athletes = {
      sm: athlete('sm', 'Ski Men', 'qualifier', 100),
      sm2: athlete('sm2', 'Ski Men U-19', 'junior', 9000),
      sw: athlete('sw', 'Ski Women', 'qualifier', 50),
      bm: athlete('bm', 'Snowboard Men', 'pro', 1),
    };
    const hs = ['bm', 'sw', 'x', 'sm2', 'sm'].map((key) => ({ key, name: key }));
    const g = groupHomies(hs, athletes, []);
    expect(g.map((x) => [x.category, x.rows.map((r) => [r.homie.key, r.medal])])).toEqual([
      [
        'Ski Men',
        [
          ['sm', 1],
          ['sm2', 2],
        ],
      ],
      ['Ski Women', [['sw', 1]]],
      ['Snowboard Men', [['bm', 1]]],
      [null, [['x', null]]],
    ]);
  });

  it('returns no groups for no homies', () => {
    expect(groupHomies([], {}, [])).toEqual([]);
  });
});
