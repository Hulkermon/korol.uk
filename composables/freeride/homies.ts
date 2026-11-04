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
  athleteId?: string | null;
  nationality: string | null;
  eventCount: number;
}

/** Identity for a rider: Liveheats exposes no rider id, so we match on the normalised name. */
export function riderKey(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Stable id for a rider: the Liveheats athlete id, else the normalised name. */
export function riderId(r: { athleteId?: string | null; name: string }): string {
  return r.athleteId || riderKey(r.name);
}

export function homieEntries(events: FreerideEvent[], key: string): HomieEntry[] {
  const out: HomieEntry[] = [];
  for (const event of events) {
    for (const d of event.divisions) {
      const rider = d.riders.find((r) => riderId(r) === key);
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
        const key = riderId(r);
        if (!key) continue;
        let s = map.get(key);
        if (!s) {
          s = {
            key,
            name: r.name.trim(),
            ...(r.athleteId ? { athleteId: r.athleteId } : {}),
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

const isId = (key: string) => /^\d+$/.test(key);

/** Upgrades homies stored under a name key to the athlete id, when the events know one. */
export function migrateHomies(homies: Homie[], events: FreerideEvent[]): Homie[] {
  const ids = new Map<string, string>();
  for (const e of events)
    for (const d of e.divisions)
      for (const r of d.riders) {
        if (!r.athleteId) continue;
        const k = riderKey(r.name);
        if (!ids.has(k)) ids.set(k, r.athleteId);
      }
  let changed = false;
  const seen = new Set<string>();
  const out: Homie[] = [];
  for (const h of homies) {
    const id = isId(h.key) ? undefined : ids.get(h.key);
    const next = id ? { ...h, key: id } : h;
    if (id) changed = true;
    if (seen.has(next.key)) {
      changed = true;
      continue;
    }
    seen.add(next.key);
    out.push(next);
  }
  return changed ? out : homies;
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
    const k = /^\d+$/.test(key) ? key : riderKey(name);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push({ key: k, name: name.trim() });
  }
  return out;
}

export function useHomies(
  storage: Storage | null = safeLocalStorage(),
  events?: Ref<FreerideEvent[]>,
): {
  homies: Ref<Homie[]>;
  isHomie: (name: string, athleteId?: string | null) => boolean;
  toggleHomie: (name: string, athleteId?: string | null) => void;
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

  if (events) {
    watch(
      events,
      (list) => {
        const m = migrateHomies(homies.value, list);
        if (m !== homies.value) homies.value = m;
      },
      { immediate: true },
    );
  }

  function resolveId(name: string, athleteId?: string | null): string {
    if (athleteId) return athleteId;
    const nameKey = riderKey(name);
    for (const e of events?.value ?? [])
      for (const d of e.divisions)
        for (const r of d.riders)
          if (r.athleteId && riderKey(r.name) === nameKey) return r.athleteId;
    return nameKey;
  }

  function isHomie(name: string, athleteId?: string | null): boolean {
    const key = resolveId(name, athleteId);
    const nameKey = riderKey(name);
    return homies.value.some((h) => h.key === key || h.key === nameKey);
  }

  function toggleHomie(name: string, athleteId?: string | null) {
    const key = resolveId(name, athleteId);
    const nameKey = riderKey(name);
    if (!key) return;
    if (homies.value.some((h) => h.key === key || h.key === nameKey))
      homies.value = homies.value.filter((h) => h.key !== key && h.key !== nameKey);
    else homies.value = [...homies.value, { key, name: name.trim() }];
  }

  return { homies, isHomie, toggleHomie };
}
