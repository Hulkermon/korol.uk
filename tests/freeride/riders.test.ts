import { describe, expect, it } from 'vitest';
import {
  formatPoints,
  isFinished,
  primaryRanking,
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
          { eventId: '9', eventName: 'E9', date: '2025-12-01', place: 1, points: 1, dropped: false },
        ]),
        rk('qualifier', 10, [
          { eventId: '9', eventName: 'E9', date: '2025-12-01', place: 1, points: 1, dropped: false },
          { eventId: '8', eventName: 'E8', date: '2025-11-01', place: 1, points: 1, dropped: false },
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
    expect(riderProfile(snap([ev('1', '2026-02-01', [div({ riders: [rider] })])]), 'nope')).toBeNull();
  });
});

describe('formatPoints', () => {
  it('formats with separators', () => {
    expect(formatPoints(5100)).toBe('5,100 pts');
    expect(formatPoints(0)).toBe('0 pts');
  });
});
