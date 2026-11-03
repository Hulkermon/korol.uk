import { ref, watch } from 'vue';
import { DEFAULT_LEGEND, clampRange } from './filters';
import type { DateRange, LegendFilter } from './filters';
import type { Homebase, PlanOptions } from './planner';
import type { Stars, Tier } from './types';

export const STORAGE_KEY = 'freeride-planner:v1';

const TIERS: Tier[] = ['pro', 'challenger', 'qualifier', 'junior'];
const STARS: Stars[] = [1, 2, 3, 4];
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function defaultLegend(): LegendFilter {
  return {
    tiers: { ...DEFAULT_LEGEND.tiers },
    stars: { ...DEFAULT_LEGEND.stars },
  };
}

function defaultOptions(): PlanOptions {
  return { startAtHome: true, returnHome: true };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseLegend(raw: unknown): LegendFilter {
  const out = defaultLegend();
  if (!isObj(raw)) return out;
  if (isObj(raw.tiers)) {
    for (const t of TIERS) if (typeof raw.tiers[t] === 'boolean') out.tiers[t] = raw.tiers[t];
  }
  if (isObj(raw.stars)) {
    for (const s of STARS) if (typeof raw.stars[s] === 'boolean') out.stars[s] = raw.stars[s];
  }
  return out;
}

function parseRange(raw: unknown, bounds: DateRange): DateRange {
  if (!isObj(raw)) return { ...bounds };
  const { from, to } = raw;
  if (typeof from !== 'string' || typeof to !== 'string') return { ...bounds };
  if (!DAY_RE.test(from) || !DAY_RE.test(to)) return { ...bounds };
  const a = from <= to ? from : to;
  const b = from <= to ? to : from;
  if (b < bounds.from || a > bounds.to) return { ...bounds };
  return clampRange({ from: a, to: b }, bounds);
}

function parseIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((x): x is string => typeof x === 'string'))];
}

function parseHome(raw: unknown): Homebase | null {
  if (!isObj(raw)) return null;
  const { lat, lng, label } = raw;
  if (typeof lat !== 'number' || !Number.isFinite(lat)) return null;
  if (typeof lng !== 'number' || !Number.isFinite(lng)) return null;
  if (typeof label !== 'string') return null;
  return { lat, lng, label };
}

function parseOptions(raw: unknown): PlanOptions {
  const out = defaultOptions();
  if (!isObj(raw)) return out;
  if (typeof raw.startAtHome === 'boolean') out.startAtHome = raw.startAtHome;
  if (typeof raw.returnHome === 'boolean') out.returnHome = raw.returnHome;
  return out;
}

function load(storage: Storage | null): Record<string, unknown> {
  if (!storage) return {};
  try {
    const text = storage.getItem(STORAGE_KEY);
    if (!text) return {};
    const data = JSON.parse(text);
    return isObj(data) ? data : {};
  } catch {
    return {};
  }
}

export function usePlannerState(bounds: DateRange, storage: Storage | null = safeLocalStorage()) {
  const saved = load(storage);

  const legend = ref<LegendFilter>(parseLegend(saved.legend));
  const range = ref<DateRange>(parseRange(saved.range, bounds));
  const planning = ref<boolean>(typeof saved.planning === 'boolean' ? saved.planning : false);
  const plannedIds = ref<string[]>(parseIds(saved.plannedIds));
  const home = ref<Homebase | null>(parseHome(saved.home));
  const planOptions = ref<PlanOptions>(parseOptions(saved.planOptions));

  watch(
    [legend, range, planning, plannedIds, home, planOptions],
    () => {
      if (!storage) return;
      try {
        storage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            v: 1,
            legend: legend.value,
            range: range.value,
            planning: planning.value,
            plannedIds: plannedIds.value,
            home: home.value,
            planOptions: planOptions.value,
          }),
        );
      } catch {
        // storage full or unavailable: state just won't persist
      }
    },
    { deep: true },
  );

  function togglePlanned(id: string) {
    const i = plannedIds.value.indexOf(id);
    if (i === -1) plannedIds.value = [...plannedIds.value, id];
    else plannedIds.value = plannedIds.value.filter((x) => x !== id);
  }

  function removePlanned(id: string) {
    plannedIds.value = plannedIds.value.filter((x) => x !== id);
  }

  function clearPlan() {
    plannedIds.value = [];
  }

  function setHome(h: Homebase | null) {
    home.value = h;
  }

  function resetFilters() {
    legend.value = defaultLegend();
    range.value = { ...bounds };
  }

  return {
    legend,
    range,
    planning,
    plannedIds,
    home,
    planOptions,
    togglePlanned,
    removePlanned,
    clearPlan,
    setHome,
    resetFilters,
  };
}
