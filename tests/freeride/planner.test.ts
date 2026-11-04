import { describe, it, expect, vi } from 'vitest';
import {
  buildStops,
  haversineKm,
  straightLegs,
  findConflicts,
  osrmUrl,
  fetchRoute,
  totals,
  sortByDate,
  planOrder,
  planNav,
} from '@/composables/freeride/planner';
import type { Leg, PlanOptions } from '@/composables/freeride/planner';
import type { FreerideEvent } from '@/composables/freeride/types';

const ev = (id: string, start: string, end: string, lat = 46, lng = 7, name = id) =>
  ({ id, name, start, end, lat, lng, place: 'x' }) as FreerideEvent;
const O = (startAtHome: boolean, returnHome: boolean, extra: Partial<PlanOptions> = {}) => ({
  startAtHome,
  returnHome,
  homeTrips: {},
  homeGapDays: 5,
  ...extra,
});
const home = { lat: 47.3769, lng: 8.5417, label: 'Home' };

describe('buildStops', () => {
  const events = [ev('c', '2026-03-05', '2026-03-12'), ev('a', '2026-03-01', '2026-03-02')];
  const kinds = (s: ReturnType<typeof buildStops>) =>
    s.map((x) => (x.kind === 'home' ? `home:${x.role}` : x.label));

  it('sorts by start, end, name', () => {
    const s = buildStops(
      [
        ev('z', '2026-03-01', '2026-03-03', 0, 0, 'Z'),
        ev('b', '2026-03-01', '2026-03-02', 0, 0, 'B'),
        ev('a', '2026-03-01', '2026-03-02', 0, 0, 'A'),
      ],
      null,
      O(true, true),
    );
    expect(kinds(s)).toEqual(['A', 'B', 'Z']);
  });
  it('adds home at both ends', () => {
    expect(kinds(buildStops(events, home, O(true, true)))).toEqual([
      'home:start',
      'a',
      'c',
      'home:end',
    ]);
  });
  it('respects each option', () => {
    expect(kinds(buildStops(events, home, O(true, false)))).toEqual(['home:start', 'a', 'c']);
    expect(kinds(buildStops(events, home, O(false, true)))).toEqual(['a', 'c', 'home:end']);
    expect(kinds(buildStops(events, home, O(false, false)))).toEqual(['a', 'c']);
  });
  it('omits home when null', () => {
    expect(buildStops(events, null, O(true, true))).toHaveLength(2);
  });
});

describe('home trips', () => {
  const a = ev('a', '2026-03-01', '2026-03-02');
  const kinds = (s: ReturnType<typeof buildStops>) =>
    s.map((x) => (x.kind === 'home' ? `home:${x.role}` : x.label));
  it('inserts a via stop by the auto threshold', () => {
    const b4 = ev('b', '2026-03-06', '2026-03-07'); // gap 4
    const b5 = ev('b', '2026-03-07', '2026-03-08'); // gap 5
    expect(kinds(buildStops([a, b4], home, O(false, false)))).toEqual(['a', 'b']);
    const s = buildStops([a, b5], home, O(false, false));
    expect(kinds(s)).toEqual(['a', 'home:via', 'b']);
    expect(s[1]).toMatchObject({ kind: 'home', role: 'via', after: 'a' });
  });
  it('lets overrides force on or off', () => {
    const b4 = ev('b', '2026-03-06', '2026-03-07');
    const b9 = ev('b', '2026-03-11', '2026-03-12');
    expect(kinds(buildStops([a, b4], home, O(false, false, { homeTrips: { a: true } })))).toEqual([
      'a',
      'home:via',
      'b',
    ]);
    expect(kinds(buildStops([a, b9], home, O(false, false, { homeTrips: { a: false } })))).toEqual([
      'a',
      'b',
    ]);
  });
  it('adds no via without home', () => {
    const b9 = ev('b', '2026-03-11', '2026-03-12');
    expect(buildStops([a, b9], null, O(true, true, { homeTrips: { a: true } }))).toHaveLength(2);
  });
  it('sums legs through home for conflicts', () => {
    const b = ev('b', '2026-03-05', '2026-03-06'); // gap 3
    const stops = buildStops([a, b], home, O(false, false, { homeTrips: { a: true } }));
    const legs = (h: number): Leg[] => [
      { from: 0, to: 1, km: 1, hours: h, source: 'osrm' },
      { from: 1, to: 2, km: 1, hours: h, source: 'osrm' },
    ];
    expect(findConflicts(stops, legs(15))).toEqual([]); // 30h -> 3 days, gap 3
    expect(findConflicts(stops, legs(16))).toEqual([{ a: 'a', b: 'b', reason: 'tight' }]); // 32h -> 4
  });
  it('sums km when any leg lacks hours', () => {
    const b = ev('b', '2026-03-05', '2026-03-06');
    const stops = buildStops([a, b], home, O(false, false, { homeTrips: { a: true } }));
    const legs: Leg[] = [
      { from: 0, to: 1, km: 1000, hours: 1, source: 'osrm' },
      { from: 1, to: 2, km: 1200, hours: null, source: 'straight' },
    ];
    expect(findConflicts(stops, legs)).toEqual([{ a: 'a', b: 'b', reason: 'tight' }]); // 4 days
  });
  it('still flags overlap with a via', () => {
    const b = ev('b', '2026-03-02', '2026-03-03');
    const stops = buildStops([a, b], home, O(false, false, { homeTrips: { a: true } }));
    expect(findConflicts(stops, straightLegs(stops))).toEqual([
      { a: 'a', b: 'b', reason: 'overlap' },
    ]);
  });
});

describe('haversineKm', () => {
  it('Zurich to Chamonix', () => {
    const d = haversineKm({ lat: 47.3769, lng: 8.5417 }, { lat: 45.9237, lng: 6.8694 });
    expect(Math.abs(d - 207)).toBeLessThanOrEqual(5);
  });
});

describe('findConflicts', () => {
  const run = (a: FreerideEvent, b: FreerideEvent, legs?: Leg[]) => {
    const stops = buildStops([a, b], null, O(false, false));
    return findConflicts(stops, legs ?? straightLegs(stops));
  };
  it('flags overlap, including same-day', () => {
    expect(run(ev('a', '2026-03-01', '2026-03-03'), ev('b', '2026-03-03', '2026-03-04'))).toEqual([
      { a: 'a', b: 'b', reason: 'overlap' },
    ]);
  });
  it('flags tight with straight legs', () => {
    // ~1500 km apart -> 3 days needed, gap is 1
    const far = run(
      ev('a', '2026-03-01', '2026-03-02', 48, 2),
      ev('b', '2026-03-03', '2026-03-04', 40, 20),
    );
    expect(far).toEqual([{ a: 'a', b: 'b', reason: 'tight' }]);
  });
  it('flags tight with osrm hours and passes when enough days', () => {
    const a = ev('a', '2026-03-01', '2026-03-02');
    const b = ev('b', '2026-03-04', '2026-03-05');
    const leg = (hours: number): Leg[] => [{ from: 0, to: 1, km: 100, hours, source: 'osrm' }];
    expect(run(a, b, leg(25))).toHaveLength(1); // gap 2 < 3
    expect(run(a, b, leg(20))).toEqual([]); // gap 2 >= 2
  });
});

describe('osrmUrl', () => {
  it('uses lng,lat order', () => {
    const stops = buildStops([ev('a', '2026-03-01', '2026-03-01', 46.5, 7.5)], home, {
      startAtHome: true,
      returnHome: false,
    });
    expect(osrmUrl(stops)).toBe(
      'https://router.project-osrm.org/route/v1/driving/8.5417,47.3769;7.5,46.5?overview=full&geometries=geojson',
    );
  });
});

describe('fetchRoute', () => {
  const stops = buildStops(
    [ev('a', '2026-03-01', '2026-03-01', 46, 7), ev('b', '2026-03-05', '2026-03-05', 45, 6)],
    home,
    O(true, false),
  );
  const okFetch = (body: unknown, ok = true) =>
    vi.fn().mockResolvedValue({ ok, json: async () => body }) as unknown as typeof fetch;

  it('returns empty for < 2 stops', async () => {
    expect(await fetchRoute(stops.slice(0, 1), okFetch({}))).toEqual({
      legs: [],
      line: [],
      source: 'straight',
    });
  });
  it('parses OSRM success', async () => {
    const body = {
      code: 'Ok',
      routes: [
        {
          geometry: {
            coordinates: [
              [8.5, 47.3],
              [7, 46],
              [6, 45],
            ],
          },
          legs: [
            { distance: 12345.6, duration: 3600 },
            { distance: 1000, duration: 7200 },
          ],
        },
      ],
    };
    const r = await fetchRoute(stops, okFetch(body));
    expect(r.source).toBe('osrm');
    expect(r.legs[0]).toMatchObject({ from: 0, to: 1, hours: 1, source: 'osrm' });
    expect(r.legs[0].km).toBeCloseTo(12.3456, 6);
    expect(r.legs[1].hours).toBe(2);
    expect(r.line[0]).toEqual([47.3, 8.5]);
  });
  it('falls back on rejected fetch', async () => {
    const r = await fetchRoute(stops, vi.fn().mockRejectedValue(new Error('x')) as never);
    expect(r.source).toBe('straight');
    expect(r.legs).toHaveLength(2);
    expect(r.legs[0].hours).toBeNull();
    expect(r.line[1]).toEqual([46, 7]);
  });
  it('falls back on NoRoute and non-200', async () => {
    expect((await fetchRoute(stops, okFetch({ code: 'NoRoute' }))).source).toBe('straight');
    expect((await fetchRoute(stops, okFetch({}, false))).source).toBe('straight');
  });
});

describe('totals', () => {
  it('sums', () => {
    const l = (km: number, hours: number | null): Leg => ({
      from: 0,
      to: 1,
      km,
      hours,
      source: 'osrm',
    });
    expect(totals([l(10, 1), l(5, 2)])).toEqual({ km: 15, hours: 3 });
    expect(totals([l(10, 1), l(5, null)])).toEqual({ km: 15, hours: null });
  });
});

describe('sortByDate', () => {
  it('breaks ties by end then name without mutating input', () => {
    const input = [
      ev('d', '2027-01-02', '2027-01-03', 46, 7, 'B'),
      ev('c', '2027-01-02', '2027-01-03', 46, 7, 'A'),
      ev('b', '2027-01-02', '2027-01-02'),
      ev('a', '2027-01-01', '2027-01-09'),
    ];
    const copy = [...input];
    expect(sortByDate(input).map((e) => e.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(input).toEqual(copy);
  });
});

describe('planOrder', () => {
  it('numbers events by date whatever the input order', () => {
    const events = [ev('z', '2027-03-01', '2027-03-02'), ev('y', '2027-01-01', '2027-01-02')];
    expect(planOrder(events)).toEqual({ y: 1, z: 2 });
  });
  it('is empty for no events', () => {
    expect(planOrder([])).toEqual({});
  });
});

describe('planNav', () => {
  const ids = ['a', 'b', 'c'];
  it('handles middle, first and last', () => {
    expect(planNav(ids, 'b')).toEqual({ index: 2, total: 3, prevId: 'a', nextId: 'c' });
    expect(planNav(ids, 'a')).toEqual({ index: 1, total: 3, prevId: null, nextId: 'b' });
    expect(planNav(ids, 'c')).toEqual({ index: 3, total: 3, prevId: 'b', nextId: null });
  });
  it('handles a single item', () => {
    expect(planNav(['a'], 'a')).toEqual({ index: 1, total: 1, prevId: null, nextId: null });
  });
  it('returns null for unknown or null id', () => {
    expect(planNav(ids, 'x')).toBeNull();
    expect(planNav(ids, null)).toBeNull();
  });
});
