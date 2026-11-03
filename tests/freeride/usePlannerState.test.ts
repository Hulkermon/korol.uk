import { describe, it, expect } from 'vitest';
import { nextTick } from 'vue';
import { STORAGE_KEY, usePlannerState } from '@/composables/freeride/usePlannerState';
import { DEFAULT_LEGEND } from '@/composables/freeride/filters';

const bounds = { from: '2026-12-01', to: '2027-04-30' };

function memStorage(initial?: string): Storage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(STORAGE_KEY, initial);
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage & { data: Map<string, string> };
}

describe('usePlannerState', () => {
  it('uses defaults with empty storage', () => {
    const s = usePlannerState(bounds, memStorage());
    expect(s.legend.value).toEqual(DEFAULT_LEGEND);
    expect(s.range.value).toEqual(bounds);
    expect(s.range.value).not.toBe(bounds);
    expect(s.planning.value).toBe(false);
    expect(s.plannedIds.value).toEqual([]);
    expect(s.home.value).toBeNull();
    expect(s.planOptions.value).toEqual({ startAtHome: true, returnHome: true });
  });

  it('round trips through storage', async () => {
    const st = memStorage();
    const a = usePlannerState(bounds, st);
    a.legend.value.tiers.junior = true;
    a.range.value = { from: '2027-01-10', to: '2027-02-10' };
    a.planning.value = true;
    a.togglePlanned('x');
    a.togglePlanned('y');
    a.setHome({ lat: 1.5, lng: 2.5, label: 'Home' });
    a.planOptions.value.returnHome = false;
    await nextTick();
    const b = usePlannerState(bounds, st);
    expect(b.legend.value).toEqual(a.legend.value);
    expect(b.range.value).toEqual({ from: '2027-01-10', to: '2027-02-10' });
    expect(b.planning.value).toBe(true);
    expect(b.plannedIds.value).toEqual(['x', 'y']);
    expect(b.home.value).toEqual({ lat: 1.5, lng: 2.5, label: 'Home' });
    expect(b.planOptions.value).toEqual({ startAtHome: true, returnHome: false });
  });

  it('falls back to defaults on corrupt JSON', () => {
    const s = usePlannerState(bounds, memStorage('{not json'));
    expect(s.legend.value).toEqual(DEFAULT_LEGEND);
    expect(s.range.value).toEqual(bounds);
    expect(s.plannedIds.value).toEqual([]);
  });

  it('keeps valid fields of a partially invalid object', () => {
    const raw = JSON.stringify({
      v: 1,
      legend: { tiers: { pro: false, junior: 'yes' }, stars: 5 },
      range: 'nope',
      planning: true,
      plannedIds: ['a', 3, 'a', null, 'b'],
      home: { lat: 'x', lng: 1, label: 'h' },
      planOptions: { startAtHome: false, returnHome: 'maybe' },
    });
    const s = usePlannerState(bounds, memStorage(raw));
    expect(s.legend.value.tiers).toEqual({ ...DEFAULT_LEGEND.tiers, pro: false });
    expect(s.legend.value.stars).toEqual(DEFAULT_LEGEND.stars);
    expect(s.range.value).toEqual(bounds);
    expect(s.planning.value).toBe(true);
    expect(s.plannedIds.value).toEqual(['a', 'b']);
    expect(s.home.value).toBeNull();
    expect(s.planOptions.value).toEqual({ startAtHome: false, returnHome: true });
  });

  it('clamps the loaded range into bounds', () => {
    const partial = JSON.stringify({ range: { from: '2026-01-01', to: '2027-02-01' } });
    expect(usePlannerState(bounds, memStorage(partial)).range.value).toEqual({
      from: '2026-12-01',
      to: '2027-02-01',
    });
    const outside = JSON.stringify({ range: { from: '2025-01-01', to: '2025-02-01' } });
    expect(usePlannerState(bounds, memStorage(outside)).range.value).toEqual(bounds);
  });

  it('works with storage = null', async () => {
    const s = usePlannerState(bounds, null);
    expect(() => {
      s.togglePlanned('a');
      s.legend.value.tiers.junior = true;
    }).not.toThrow();
    await nextTick();
    expect(s.plannedIds.value).toEqual(['a']);
  });

  it('survives a setItem that throws', async () => {
    const st = memStorage();
    st.setItem = () => {
      throw new Error('quota');
    };
    const s = usePlannerState(bounds, st);
    s.togglePlanned('a');
    await nextTick();
    expect(s.plannedIds.value).toEqual(['a']);
  });

  it('survives a getItem that throws', () => {
    const st = memStorage();
    st.getItem = () => {
      throw new Error('denied');
    };
    expect(usePlannerState(bounds, st).legend.value).toEqual(DEFAULT_LEGEND);
  });

  it('toggles, removes and clears planned ids', () => {
    const s = usePlannerState(bounds, null);
    s.togglePlanned('a');
    s.togglePlanned('b');
    expect(s.plannedIds.value).toEqual(['a', 'b']);
    s.togglePlanned('a');
    expect(s.plannedIds.value).toEqual(['b']);
    s.removePlanned('b');
    expect(s.plannedIds.value).toEqual([]);
    s.togglePlanned('c');
    s.clearPlan();
    expect(s.plannedIds.value).toEqual([]);
  });

  it('clones the default legend so mutation works and persists', async () => {
    const st = memStorage();
    const s = usePlannerState(bounds, st);
    expect(() => {
      s.legend.value.tiers.junior = true;
    }).not.toThrow();
    expect(DEFAULT_LEGEND.tiers.junior).toBe(false);
    await nextTick();
    expect(JSON.parse(st.data.get(STORAGE_KEY)!).legend.tiers.junior).toBe(true);
  });

  it('resets filters and sets home', () => {
    const s = usePlannerState(bounds, null);
    s.legend.value.tiers.junior = true;
    s.range.value = { from: '2027-01-01', to: '2027-01-02' };
    s.resetFilters();
    expect(s.legend.value).toEqual(DEFAULT_LEGEND);
    expect(s.range.value).toEqual(bounds);
    s.setHome({ lat: 0, lng: 0, label: 'z' });
    s.setHome(null);
    expect(s.home.value).toBeNull();
  });
});
