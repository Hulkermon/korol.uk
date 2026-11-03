import { describe, it, expect, vi } from 'vitest';
import {
  buildStops,
  haversineKm,
  straightLegs,
  findConflicts,
  osrmUrl,
  fetchRoute,
  totals,
} from '@/composables/freeride/planner';
import type { Leg } from '@/composables/freeride/planner';
import type { FreerideEvent } from '@/composables/freeride/types';

const ev = (id: string, start: string, end: string, lat = 46, lng = 7, name = id) =>
  ({ id, name, start, end, lat, lng, place: 'x' }) as FreerideEvent;
const home = { lat: 47.3769, lng: 8.5417, label: 'Home' };

describe('buildStops', () => {
  const events = [ev('c', '2026-03-10', '2026-03-12'), ev('a', '2026-03-01', '2026-03-02')];
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
      { startAtHome: true, returnHome: true },
    );
    expect(kinds(s)).toEqual(['A', 'B', 'Z']);
  });
  it('adds home at both ends', () => {
    expect(kinds(buildStops(events, home, { startAtHome: true, returnHome: true }))).toEqual([
      'home:start',
      'a',
      'c',
      'home:end',
    ]);
  });
  it('respects each option', () => {
    expect(kinds(buildStops(events, home, { startAtHome: true, returnHome: false }))).toEqual([
      'home:start',
      'a',
      'c',
    ]);
    expect(kinds(buildStops(events, home, { startAtHome: false, returnHome: true }))).toEqual([
      'a',
      'c',
      'home:end',
    ]);
    expect(kinds(buildStops(events, home, { startAtHome: false, returnHome: false }))).toEqual([
      'a',
      'c',
    ]);
  });
  it('omits home when null', () => {
    expect(buildStops(events, null, { startAtHome: true, returnHome: true })).toHaveLength(2);
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
    const stops = buildStops([a, b], null, { startAtHome: false, returnHome: false });
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
    { startAtHome: true, returnHome: false },
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
