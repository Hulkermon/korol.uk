import { ref, watch } from 'vue';
import type { Ref } from 'vue';
import { safeLocalStorage } from './usePlannerState';
import type { FreerideEvent } from './types';

export const HOMIES_KEY = 'freeride-homies:v1';

export interface Homie {
  key: string;
  name: string;
}

export interface HomieEntry {
  event: FreerideEvent;
  division: string;
  status: string;
}

export interface RiderSummary {
  key: string;
  name: string;
  nationality: string | null;
  eventCount: number;
}

/** Identity for a rider: Liveheats exposes no rider id, so we match on the normalised name. */
export function riderKey(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

export function homieEntries(events: FreerideEvent[], key: string): HomieEntry[] {
  const out: HomieEntry[] = [];
  for (const event of events) {
    for (const d of event.divisions) {
      const rider = d.riders.find((r) => riderKey(r.name) === key);
      if (rider) out.push({ event, division: d.name, status: rider.status });
    }
  }
  return out.sort(
    (a, b) =>
      a.event.start.localeCompare(b.event.start) ||
      a.event.name.localeCompare(b.event.name) ||
      a.division.localeCompare(b.division),
  );
}

export function homieEventIds(events: FreerideEvent[], key: string): string[] {
  return [...new Set(homieEntries(events, key).map((x) => x.event.id))];
}

export function allRiders(events: FreerideEvent[]): RiderSummary[] {
  const map = new Map<string, RiderSummary & { ids: Set<string> }>();
  for (const event of events) {
    for (const d of event.divisions) {
      for (const r of d.riders) {
        const key = riderKey(r.name);
        if (!key) continue;
        let s = map.get(key);
        if (!s) {
          s = {
            key,
            name: r.name.trim(),
            nationality: r.nationality,
            eventCount: 0,
            ids: new Set(),
          };
          map.set(key, s);
        } else if (!s.nationality && r.nationality) {
          s.nationality = r.nationality;
        }
        s.ids.add(event.id);
      }
    }
  }
  return [...map.values()]
    .map(({ ids, ...s }) => ({ ...s, eventCount: ids.size }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function matchesQuery(name: string, query: string): boolean {
  const q = riderKey(query);
  return !q || riderKey(name).includes(q);
}

function parseHomies(text: string | null): Homie[] {
  if (!text) return [];
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const out: Homie[] = [];
  for (const item of data) {
    if (typeof item !== 'object' || item === null) continue;
    const { key, name } = item as Record<string, unknown>;
    if (typeof key !== 'string' || typeof name !== 'string') continue;
    const k = riderKey(name);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push({ key: k, name: name.trim() });
  }
  return out;
}

export function useHomies(storage: Storage | null = safeLocalStorage()): {
  homies: Ref<Homie[]>;
  isHomie: (name: string) => boolean;
  toggleHomie: (name: string) => void;
} {
  let text: string | null = null;
  try {
    text = storage?.getItem(HOMIES_KEY) ?? null;
  } catch {
    text = null;
  }
  const homies = ref<Homie[]>(parseHomies(text));

  watch(
    homies,
    (list) => {
      if (!storage) return;
      try {
        storage.setItem(HOMIES_KEY, JSON.stringify(list));
      } catch {
        // storage full or unavailable: favourites just won't persist
      }
    },
    { deep: true },
  );

  function isHomie(name: string): boolean {
    const k = riderKey(name);
    return homies.value.some((h) => h.key === k);
  }

  function toggleHomie(name: string) {
    const key = riderKey(name);
    if (!key) return;
    if (homies.value.some((h) => h.key === key))
      homies.value = homies.value.filter((h) => h.key !== key);
    else homies.value = [...homies.value, { key, name: name.trim() }];
  }

  return { homies, isHomie, toggleHomie };
}
