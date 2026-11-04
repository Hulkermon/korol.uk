import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import { routeKey, useRouting } from '@/composables/freeride/useRouting';
import type { PlanOptions, RouteResult, Stop } from '@/composables/freeride/planner';

const stop = (lat: number, lng: number): Stop =>
  ({ kind: 'home', role: 'via', lat, lng, label: 'x' }) as Stop;
const opts = (over: Partial<PlanOptions> = {}): PlanOptions => ({
  startAtHome: false,
  returnHome: false,
  homeTrips: {},
  homeGapDays: 5,
  ...over,
});
const result = (km: number): RouteResult => ({
  legs: [{ from: 0, to: 1, km, hours: 1, source: 'osrm' }],
  line: [
    [0, 0],
    [1, 1],
  ],
  source: 'osrm',
});

function setup() {
  const stops = ref<Stop[]>([stop(0, 0), stop(1, 1)]);
  const options = ref<PlanOptions>(opts());
  const fetchFn = vi.fn(async () => result(10));
  return { stops, options, fetchFn, r: useRouting(stops, options, fetchFn) };
}

describe('useRouting', () => {
  it('does not fetch until calculate()', async () => {
    const { fetchFn, r, stops } = setup();
    stops.value = [stop(0, 0), stop(2, 2)];
    await Promise.resolve();
    expect(fetchFn).not.toHaveBeenCalled();
    expect(r.calculated.value).toBe(false);
    expect(r.stale.value).toBe(false);
  });

  it('fills legs and line after calculate()', async () => {
    const { r } = setup();
    await r.calculate();
    expect(r.calculated.value).toBe(true);
    expect(r.legs.value).toHaveLength(1);
    expect(r.line.value).toHaveLength(2);
    expect(r.loading.value).toBe(false);
  });

  it('goes stale when stops change and recovers on recalculate', async () => {
    const { r, stops } = setup();
    await r.calculate();
    stops.value = [stop(0, 0), stop(5, 5)];
    expect(r.stale.value).toBe(true);
    expect(r.calculated.value).toBe(false);
    expect(r.legs.value).toEqual([]);
    expect(r.line.value).toEqual([]);
    await r.calculate();
    expect(r.stale.value).toBe(false);
    expect(r.calculated.value).toBe(true);
  });

  it('routeKey changes with returnHome', () => {
    const s = [stop(0, 0), stop(1, 1)];
    expect(routeKey(s, opts())).not.toBe(routeKey(s, opts({ returnHome: true })));
  });

  it('ignores a superseded request', async () => {
    const stops = ref<Stop[]>([stop(0, 0), stop(1, 1)]);
    const options = ref<PlanOptions>(opts());
    const resolvers: ((r: RouteResult) => void)[] = [];
    const fetchFn = vi.fn(() => new Promise<RouteResult>((res) => resolvers.push(res)));
    const r = useRouting(stops, options, fetchFn);
    const p1 = r.calculate();
    const p2 = r.calculate();
    resolvers[1](result(2));
    await p2;
    resolvers[0](result(1));
    await p1;
    expect(r.legs.value[0].km).toBe(2);
    expect(r.loading.value).toBe(false);
  });

  it('cancel() drops an in-flight result', async () => {
    const stops = ref<Stop[]>([stop(0, 0), stop(1, 1)]);
    const options = ref<PlanOptions>(opts());
    let resolve!: (r: RouteResult) => void;
    const fetchFn = vi.fn(() => new Promise<RouteResult>((res) => (resolve = res)));
    const r = useRouting(stops, options, fetchFn);
    const p = r.calculate();
    expect(r.loading.value).toBe(true);
    r.cancel();
    expect(r.loading.value).toBe(false);
    resolve(result(3));
    await p;
    expect(r.calculated.value).toBe(false);
  });

  it('does nothing with fewer than 2 stops', async () => {
    const { r, stops, fetchFn } = setup();
    stops.value = [stop(0, 0)];
    await r.calculate();
    expect(fetchFn).not.toHaveBeenCalled();
    expect(r.loading.value).toBe(false);
  });
});
