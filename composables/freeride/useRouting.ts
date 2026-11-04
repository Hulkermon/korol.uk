import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { fetchRoute } from './planner';
import type { Leg, PlanOptions, RouteResult, Stop } from './planner';

export function routeKey(stops: Stop[], options: PlanOptions): string {
  return JSON.stringify([
    stops.map((s) => [s.lat, s.lng]),
    options.startAtHome,
    options.returnHome,
  ]);
}

export function useRouting(
  stops: Ref<Stop[]>,
  options: Ref<PlanOptions>,
  fetchFn: (stops: Stop[]) => Promise<RouteResult> = (s) => fetchRoute(s),
): {
  legs: ComputedRef<Leg[]>;
  line: ComputedRef<[number, number][]>;
  loading: Ref<boolean>;
  calculated: ComputedRef<boolean>;
  stale: ComputedRef<boolean>;
  calculate: () => Promise<void>;
  cancel: () => void;
} {
  const key = computed(() => routeKey(stops.value, options.value));
  const routed = ref<{ key: string; legs: Leg[]; line: [number, number][] } | null>(null);
  const loading = ref(false);
  let requestId = 0;

  const calculated = computed(() => !!routed.value && routed.value.key === key.value);
  const stale = computed(() => !!routed.value && routed.value.key !== key.value);
  const legs = computed<Leg[]>(() => (calculated.value ? routed.value!.legs : []));
  const line = computed<[number, number][]>(() => (calculated.value ? routed.value!.line : []));

  async function calculate() {
    if (stops.value.length < 2) return;
    const id = ++requestId;
    const k = key.value;
    const snap = stops.value.slice();
    loading.value = true;
    try {
      const res = await fetchFn(snap);
      if (id !== requestId) return;
      routed.value = { key: k, legs: res.legs, line: res.line };
    } catch {
      // keep the previous state
    } finally {
      if (id === requestId) loading.value = false;
    }
  }

  function cancel() {
    requestId++;
    loading.value = false;
  }

  return { legs, line, loading, calculated, stale, calculate, cancel };
}
