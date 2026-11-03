import type { FreerideEvent, Stars, Tier } from './types';

export interface LegendFilter {
  tiers: Record<Tier, boolean>;
  stars: Record<Stars, boolean>;
}

export interface DateRange {
  from: string; // 'YYYY-MM-DD', inclusive
  to: string; // 'YYYY-MM-DD', inclusive
}

// Frozen so consumers can't mutate it by accident: clone before editing.
export const DEFAULT_LEGEND: LegendFilter = Object.freeze({
  tiers: Object.freeze({ pro: true, challenger: true, qualifier: true, junior: false }),
  stars: Object.freeze({ 1: true, 2: true, 3: true, 4: true }),
}) as LegendFilter;

const DAY_MS = 86_400_000;
const TIERS: Tier[] = ['pro', 'challenger', 'qualifier', 'junior'];
const STARS: Stars[] = [1, 2, 3, 4];

export function dayToNum(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function numToDay(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

export function seasonBounds(events: FreerideEvent[]): DateRange {
  if (events.length === 0) return { from: '2026-12-01', to: '2027-04-30' };
  let from = events[0].start;
  let to = events[0].end;
  for (const e of events) {
    if (e.start < from) from = e.start;
    if (e.end > to) to = e.end;
  }
  return { from, to };
}

export function overlapsRange(e: FreerideEvent, r: DateRange): boolean {
  return e.start <= r.to && e.end >= r.from;
}

export function passesLegend(e: FreerideEvent, f: LegendFilter): boolean {
  if (!f.tiers[e.tier]) return false;
  if (e.stars !== null && !f.stars[e.stars]) return false;
  return true;
}

export function filterEvents(
  events: FreerideEvent[],
  f: LegendFilter,
  r: DateRange,
): FreerideEvent[] {
  return events.filter((e) => passesLegend(e, f) && overlapsRange(e, r));
}

export function countByTier(events: FreerideEvent[]): Record<Tier, number> {
  const out = Object.fromEntries(TIERS.map((t) => [t, 0])) as Record<Tier, number>;
  for (const e of events) out[e.tier]++;
  return out;
}

export function countByStars(events: FreerideEvent[]): Record<Stars, number> {
  const out = Object.fromEntries(STARS.map((s) => [s, 0])) as Record<Stars, number>;
  for (const e of events) if (e.stars !== null) out[e.stars]++;
  return out;
}

export function clampRange(r: DateRange, bounds: DateRange): DateRange {
  const clamp = (d: string) => (d < bounds.from ? bounds.from : d > bounds.to ? bounds.to : d);
  const a = clamp(r.from);
  const b = clamp(r.to);
  return a <= b ? { from: a, to: b } : { from: b, to: a };
}

// Re-fit a date range after the season bounds change (e.g. after a data refresh):
// a range that covered the whole old season keeps covering the whole new one.
export function rebaseRange(r: DateRange, oldBounds: DateRange, newBounds: DateRange): DateRange {
  if (r.from === oldBounds.from && r.to === oldBounds.to) return { ...newBounds };
  if (r.to < newBounds.from || r.from > newBounds.to) return { ...newBounds };
  return clampRange(r, newBounds);
}
