import type { FreerideEvent } from '@/composables/freeride/types';

export interface Homebase {
  lat: number;
  lng: number;
  label: string;
}
export interface PlanOptions {
  startAtHome: boolean;
  returnHome: boolean;
}
export type Stop =
  | { kind: 'home'; role: 'start' | 'end'; lat: number; lng: number; label: string }
  | { kind: 'event'; event: FreerideEvent; lat: number; lng: number; label: string };
export interface Leg {
  from: number;
  to: number;
  km: number;
  hours: number | null;
  source: 'osrm' | 'straight';
}
export interface Conflict {
  a: string;
  b: string;
  reason: 'overlap' | 'tight';
}
export interface RouteResult {
  legs: Leg[];
  line: [number, number][];
  source: 'osrm' | 'straight';
}

const DAY_MS = 86400000;
const HOURS_PER_DRIVING_DAY = 10;
const KM_PER_DRIVING_DAY = 700;

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function buildStops(
  events: FreerideEvent[],
  home: Homebase | null,
  opts: PlanOptions,
): Stop[] {
  const sorted = [...events].sort(
    (a, b) => cmp(a.start, b.start) || cmp(a.end, b.end) || cmp(a.name, b.name),
  );
  const stops: Stop[] = [];
  if (home && opts.startAtHome) {
    stops.push({ kind: 'home', role: 'start', lat: home.lat, lng: home.lng, label: home.label });
  }
  for (const event of sorted) {
    stops.push({ kind: 'event', event, lat: event.lat, lng: event.lng, label: event.name });
  }
  if (home && opts.returnHome) {
    stops.push({ kind: 'home', role: 'end', lat: home.lat, lng: home.lng, label: home.label });
  }
  return stops;
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function straightLegs(stops: Stop[]): Leg[] {
  const legs: Leg[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    legs.push({
      from: i,
      to: i + 1,
      km: haversineKm(stops[i], stops[i + 1]),
      hours: null,
      source: 'straight',
    });
  }
  return legs;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export function findConflicts(stops: Stop[], legs: Leg[]): Conflict[] {
  const conflicts: Conflict[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const prev = stops[i];
    const next = stops[i + 1];
    if (prev.kind !== 'event' || next.kind !== 'event') continue;
    const gap = daysBetween(prev.event.end, next.event.start);
    if (gap <= 0) {
      conflicts.push({ a: prev.event.id, b: next.event.id, reason: 'overlap' });
      continue;
    }
    const leg = legs.find((l) => l.from === i && l.to === i + 1);
    if (!leg) continue;
    const needed =
      leg.hours != null
        ? Math.ceil(leg.hours / HOURS_PER_DRIVING_DAY)
        : Math.ceil(leg.km / KM_PER_DRIVING_DAY);
    if (gap < needed) conflicts.push({ a: prev.event.id, b: next.event.id, reason: 'tight' });
  }
  return conflicts;
}

export function osrmUrl(stops: Stop[]): string {
  const coords = stops.map((s) => `${s.lng},${s.lat}`).join(';');
  return `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
}

function straightResult(stops: Stop[]): RouteResult {
  return {
    legs: straightLegs(stops),
    line: stops.map((s) => [s.lat, s.lng] as [number, number]),
    source: 'straight',
  };
}

export async function fetchRoute(stops: Stop[], fetchFn?: typeof fetch): Promise<RouteResult> {
  if (stops.length < 2) return { legs: [], line: [], source: 'straight' };
  try {
    const res = await (fetchFn ?? globalThis.fetch)(osrmUrl(stops));
    if (!res.ok) return straightResult(stops);
    const data = await res.json();
    const route = data?.code === 'Ok' ? data.routes?.[0] : null;
    if (!route || !Array.isArray(route.legs) || route.legs.length !== stops.length - 1) {
      return straightResult(stops);
    }
    const legs: Leg[] = route.legs.map((l: { distance: number; duration: number }, i: number) => ({
      from: i,
      to: i + 1,
      km: l.distance / 1000,
      hours: l.duration / 3600,
      source: 'osrm' as const,
    }));
    const line = (route.geometry.coordinates as [number, number][]).map(
      ([lng, lat]) => [lat, lng] as [number, number],
    );
    return { legs, line, source: 'osrm' };
  } catch {
    return straightResult(stops);
  }
}

export function totals(legs: Leg[]): { km: number; hours: number | null } {
  const km = legs.reduce((s, l) => s + l.km, 0);
  const hours = legs.some((l) => l.hours == null)
    ? null
    : legs.reduce((s, l) => s + (l.hours as number), 0);
  return { km, hours };
}
