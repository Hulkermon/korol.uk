import type {
  Athlete,
  EventSnapshot,
  FreerideEvent,
  RankingResult,
  RiderRanking,
  Tier,
} from './types';
import { riderId } from './homies';

export const TIER_ORDER: Tier[] = ['pro', 'challenger', 'qualifier', 'junior'];

export function isFinished(e: FreerideEvent): boolean {
  return (
    e.status === 'finished' ||
    e.status === 'results_published' ||
    e.divisions.some((d) => d.results.length > 0)
  );
}

export function primaryRanking(a: Athlete): RiderRanking | null {
  let best: RiderRanking | null = null;
  for (const r of a.rankings) {
    if (!best) {
      best = r;
      continue;
    }
    const ti = TIER_ORDER.indexOf(r.tier);
    const tb = TIER_ORDER.indexOf(best.tier);
    if (ti < tb || (ti === tb && r.points > best.points)) best = r;
  }
  return best;
}

export function riderPoints(
  athletes: Record<string, Athlete>,
  athleteId: string,
): { points: number; place: number; series: string; tier: Tier } | null {
  const a = athletes[athleteId];
  if (!a) return null;
  const r = primaryRanking(a);
  if (!r) return null;
  return { points: r.points, place: r.place, series: r.series, tier: r.tier };
}

/** Orders homies like a leaderboard: ranked by tier then points, unranked last by name. */
export function rankHomies<H extends { key: string; name: string }>(
  homies: H[],
  athletes: Record<string, Athlete>,
): { homie: H; medal: 1 | 2 | 3 | null }[] {
  const ranked: { homie: H; tier: number; points: number }[] = [];
  const unranked: H[] = [];
  for (const homie of homies) {
    const p = riderPoints(athletes, homie.key);
    if (p) ranked.push({ homie, tier: TIER_ORDER.indexOf(p.tier), points: p.points });
    else unranked.push(homie);
  }
  ranked.sort(
    (a, b) => a.tier - b.tier || b.points - a.points || a.homie.name.localeCompare(b.homie.name),
  );
  unranked.sort((a, b) => a.name.localeCompare(b.name));
  return [
    ...ranked.map((r, i) => ({
      homie: r.homie,
      medal: i < 3 ? ((i + 1) as 1 | 2 | 3) : null,
    })),
    ...unranked.map((homie) => ({ homie, medal: null })),
  ];
}

export const CATEGORIES = ['Ski Men', 'Ski Women', 'Snowboard Men', 'Snowboard Women'] as const;
export type Category = (typeof CATEGORIES)[number];

/** Discipline + gender of a division name, e.g. 'Master Ski Women' or 'Snowboard Men U-19'. */
export function categoryOf(division: string | null | undefined): Category | null {
  if (!division) return null;
  const discipline = /snowboard/i.test(division)
    ? 'Snowboard'
    : /ski/i.test(division)
      ? 'Ski'
      : null;
  const gender = /\bwomen\b/i.test(division) ? 'Women' : /\bmen\b/i.test(division) ? 'Men' : null;
  return discipline && gender ? `${discipline} ${gender}` : null;
}

/** A rider's category: from their primary ranking, else from the first division they entered. */
export function riderCategory(
  athletes: Record<string, Athlete>,
  events: FreerideEvent[],
  key: string,
): Category | null {
  const a = athletes[key];
  const fromRanking = categoryOf(a ? primaryRanking(a)?.division : null);
  if (fromRanking) return fromRanking;
  const sorted = [...events].sort((x, y) => x.start.localeCompare(y.start));
  for (const e of sorted)
    for (const d of e.divisions) {
      if (!d.riders.some((r) => riderId(r) === key) && !d.results.some((r) => r.athleteId === key))
        continue;
      const c = categoryOf(d.name);
      if (c) return c;
    }
  return null;
}

/** Splits homies into one leaderboard per category (each with its own medals), uncategorised last. */
export function groupHomies<H extends { key: string; name: string }>(
  homies: H[],
  athletes: Record<string, Athlete>,
  events: FreerideEvent[],
): { category: Category | null; rows: { homie: H; medal: 1 | 2 | 3 | null }[] }[] {
  const buckets = new Map<Category | null, H[]>();
  for (const h of homies) {
    const c = riderCategory(athletes, events, h.key);
    buckets.set(c, [...(buckets.get(c) ?? []), h]);
  }
  return [...CATEGORIES, null]
    .filter((c) => buckets.has(c))
    .map((category) => ({ category, rows: rankHomies(buckets.get(category)!, athletes) }));
}

export interface ProfileEntry {
  event: FreerideEvent;
  division: string;
  status: string | null;
  result: { place: number; points: number | null; dropped: boolean } | null;
}

export interface OtherResult extends RankingResult {
  series: string;
}

export interface RiderProfileData {
  id: string;
  name: string;
  nationality: string | null;
  image: string | null;
  ranking: RiderRanking | null;
  rankings: RiderRanking[];
  entries: ProfileEntry[];
  otherResults: OtherResult[];
}

export function riderProfile(snapshot: EventSnapshot, athleteId: string): RiderProfileData | null {
  const athlete = snapshot.athletes[athleteId] ?? null;
  const rankings = athlete?.rankings ?? [];
  const droppedEvents = new Set<string>();
  for (const r of rankings) for (const x of r.results) if (x.dropped) droppedEvents.add(x.eventId);

  const entries: ProfileEntry[] = [];
  let fbName: string | null = null;
  let fbNat: string | null = null;

  for (const event of snapshot.events) {
    for (const div of event.divisions) {
      const rider = div.riders.find((r) => r.athleteId === athleteId);
      const res = div.results.find((r) => r.athleteId === athleteId);
      if (!rider && !res) continue;
      fbName ??= rider?.name ?? res?.name ?? null;
      fbNat ??= rider?.nationality ?? res?.nationality ?? null;
      entries.push({
        event,
        division: div.name,
        status: rider ? rider.status : null,
        result: res
          ? {
              place: res.place,
              points: res.points,
              dropped: droppedEvents.has(event.id),
            }
          : null,
      });
    }
  }

  if (!athlete && entries.length === 0) return null;

  entries.sort(
    (a, b) =>
      a.event.start.localeCompare(b.event.start) || a.event.name.localeCompare(b.event.name),
  );

  const eventIds = new Set(snapshot.events.map((e) => e.id));
  const seen = new Set<string>();
  const otherResults: OtherResult[] = [];
  for (const r of rankings) {
    for (const x of r.results) {
      if (eventIds.has(x.eventId) || seen.has(x.eventId)) continue;
      seen.add(x.eventId);
      otherResults.push({ ...x, series: r.series });
    }
  }
  otherResults.sort((a, b) => a.date.localeCompare(b.date));

  return {
    id: athleteId,
    name: athlete?.name ?? fbName ?? '',
    nationality: athlete ? athlete.nationality : fbNat,
    image: athlete?.image ?? null,
    ranking: athlete ? primaryRanking(athlete) : null,
    rankings,
    entries,
    otherResults,
  };
}

export function formatPoints(n: number): string {
  return `${n.toLocaleString('en')} pts`;
}
