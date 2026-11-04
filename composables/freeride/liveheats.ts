// Builds the 2026/27 FWT/FWQ/Junior European event snapshot from the Liveheats public API.
// Plain TS, no Node/Vue APIs: runs in Node (script), Nitro (server route) and Vitest.
import { classifyName, endDay, inSeason, isInEurope, isTrustedOrg, toDay } from './classify';
import type { Athlete, EventSnapshot, FreerideEvent, RiderRanking, Tier } from './types';
import { resolveVenue } from './venues';

export const LIVEHEATS_URL = 'https://liveheats.com/api/graphql';

export const SEARCH_TERMS = [
  '2027 Qualifier',
  'Qualifier 1*',
  'Qualifier 2*',
  'Qualifier 3*',
  'Qualifier 4*',
  '2027 Junior',
  'Junior 1*',
  'Junior 2*',
  'Junior 3*',
  'Junior 4*',
  '2027 Freeride',
  '2027 Pro',
  'World Tour',
  'Challenger',
  '2027 FWQ',
];

// Official season ranking series, matched by name among the events' `Ranking`-type series
export const RANKING_SERIES: { tier: Tier; pattern: RegExp }[] = [
  { tier: 'pro', pattern: /^FWT Pro Tour 2027$/ },
  { tier: 'challenger', pattern: /^FWT Challenger(?!.*Qualifying).*2027$/ },
  { tier: 'qualifier', pattern: /^FWT Qualifier Region 1 .*2027$/ },
  { tier: 'junior', pattern: /^FWT Junior Region 1 .*2027$/ },
];

const BATCH_SIZE = 20;
const MAX_IN_FLIGHT = 2;

export interface BuildLog {
  info(msg: string): void;
  warn(msg: string): void;
}

export interface BuildResult {
  snapshot: EventSnapshot;
  dropped: Record<string, number>;
}

const EVENT_FIELDS = `id name date daysWindow status organisationId hideEntries
  series { id name type }
  location { formattedAddress countryCode location { lat lng } }
  registrationOptions { mode }
  paymentOptions { currency defaultDivisionPrice }
  eventDivisions { entryCount division { name } entries { status athlete { id name nationality } }
    ranking { place competitor { athlete { id name nationality } } } }`;

async function gql(fetchFn: typeof fetch, query: string): Promise<any> {
  const res = await fetchFn(LIVEHEATS_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json: any = await res.json();
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors)}`);
  return json.data;
}

export async function buildSnapshot(
  fetchFn: typeof fetch,
  log?: BuildLog,
  now: () => Date = () => new Date(),
): Promise<BuildResult> {
  // Discovery (any failure is fatal)
  const results = await Promise.all(
    SEARCH_TERMS.map((term) =>
      gql(
        fetchFn,
        `{ eventsByName(search: ${JSON.stringify(term)}, limit: 100) { id name date } }`,
      ),
    ),
  );
  const found = new Map<string, { id: string; name: string; date: string }>();
  for (const data of results) for (const e of data?.eventsByName ?? []) found.set(String(e.id), e);
  const candidates = [...found.values()].filter(
    (e) => e.date && inSeason(toDay(e.date)) && classifyName(e.name) !== null,
  );
  log?.info(`Discovered ${found.size} events, ${candidates.length} candidates`);

  const dropped: Record<string, number> = {};
  const drop = (reason: string, label: string) => {
    dropped[reason] = (dropped[reason] ?? 0) + 1;
    log?.info(`DROP (${reason}): ${label}`);
  };

  // Details, batched with aliases; ids must be digits before they go into the query string
  const ids: string[] = [];
  for (const c of candidates) {
    if (/^\d+$/.test(String(c.id))) ids.push(String(c.id));
    else drop('bad-id', `${c.id} ${c.name}`);
  }
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) batches.push(ids.slice(i, i + BATCH_SIZE));

  const details: any[] = [];
  let next = 0;
  const worker = async () => {
    while (next < batches.length) {
      const batch = batches[next++];
      const query = `{ ${batch
        .map((id, i) => `e${i}: event(id: "${id}") { ${EVENT_FIELDS} }`)
        .join('\n')} }`;
      try {
        const data = await gql(fetchFn, query);
        batch.forEach((id, i) => {
          const ev = data?.[`e${i}`];
          if (ev) details.push(ev);
          else drop('not-found', id);
        });
      } catch (err) {
        log?.warn(`WARN: detail batch failed for ${batch.join(',')}: ${(err as Error).message}`);
        dropped['detail-failed'] = (dropped['detail-failed'] ?? 0) + batch.length;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(MAX_IN_FLIGHT, batches.length) }, worker));

  const events: FreerideEvent[] = [];
  const seriesFound = new Map<string, { name: string; tier: Tier }>();
  for (const ev of details) {
    const label = `${ev.id} ${ev.name}`;
    if (!isTrustedOrg(String(ev.organisationId))) {
      drop('untrusted-org', label);
      continue;
    }
    const cls = classifyName(ev.name);
    if (!cls) {
      drop('unclassified', label);
      continue;
    }
    const venue = resolveVenue(ev.name, String(ev.organisationId), {
      place: ev.location?.formattedAddress ?? null,
      countryCode: ev.location?.countryCode ?? null,
      lat: ev.location?.location?.lat ?? null,
      lng: ev.location?.location?.lng ?? null,
    });
    if (!venue || venue.lat == null || venue.lng == null) {
      drop('no-venue', label);
      continue;
    }
    if (!isInEurope(venue.lat, venue.lng)) {
      drop('outside-europe', `${label} (${venue.place})`);
      continue;
    }
    for (const s of ev.series ?? []) {
      if (s?.type !== 'Ranking' || seriesFound.has(String(s.id))) continue;
      const match = RANKING_SERIES.find((r) => r.pattern.test(s.name ?? ''));
      if (match) seriesFound.set(String(s.id), { name: s.name, tier: match.tier });
    }
    const start = toDay(ev.date);
    const price = ev.paymentOptions?.defaultDivisionPrice
      ? {
          amountCents: ev.paymentOptions.defaultDivisionPrice,
          currency: ev.paymentOptions.currency,
        }
      : null;
    events.push({
      id: String(ev.id),
      name: ev.name,
      tier: cls.tier,
      stars: cls.stars,
      start,
      end: endDay(start, ev.daysWindow),
      place: venue.place ?? '',
      countryCode: venue.countryCode,
      lat: venue.lat,
      lng: venue.lng,
      status: ev.status,
      registrationMode: ev.registrationOptions?.mode ?? null,
      price,
      url: `https://liveheats.com/events/${ev.id}`,
      registerUrl: `https://liveheats.com/events/${ev.id}/registration`,
      divisions: (ev.eventDivisions ?? []).map((d: any) => ({
        name: d.division?.name ?? '',
        entryCount: d.entryCount ?? 0,
        riders: ev.hideEntries
          ? []
          : (d.entries ?? []).map((en: any) => ({
              athleteId: en.athlete?.id != null ? String(en.athlete.id) : null,
              name: en.athlete?.name ?? '',
              nationality: en.athlete?.nationality ?? null,
              status: en.status,
            })),
        results: (d.ranking ?? [])
          .filter((r: any) => typeof r?.place === 'number')
          .map((r: any) => {
            const a = r.competitor?.athlete;
            return {
              place: r.place as number,
              athleteId: a?.id != null ? String(a.id) : null,
              name: a?.name ?? '',
              nationality: a?.nationality ?? null,
              points: null,
            };
          })
          .sort((x: any, y: any) => x.place - y.place),
      })),
    });
  }

  events.sort((a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name));

  // Athletes that appear in the snapshot
  const athletes: Record<string, Athlete> = {};
  const seen = (id: string | null, name: string, nationality: string | null) => {
    if (id == null || athletes[id]) return;
    athletes[id] = { id, name, nationality, image: null, rankings: [] };
  };
  for (const e of events)
    for (const d of e.divisions) {
      for (const r of d.riders) seen(r.athleteId, r.name, r.nationality);
      for (const r of d.results) seen(r.athleteId, r.name, r.nationality);
    }

  // Rankings: two requests per series (division list, then one aliased query for all divisions)
  const seriesList = [...seriesFound.entries()].filter(([id]) => /^\d+$/.test(id));
  let nextSeries = 0;
  const seriesWorker = async () => {
    while (nextSeries < seriesList.length) {
      const [id, info] = seriesList[nextSeries++];
      try {
        const meta = await gql(
          fetchFn,
          `{ series(id: "${id}") { name rankingsDivisions { id name } } }`,
        );
        const divs = (meta?.series?.rankingsDivisions ?? []).filter((d: any) =>
          /^\d+$/.test(String(d.id)),
        );
        if (!divs.length) continue;
        const query = `{ series(id: "${id}") { ${divs
          .map(
            (d: any, i: number) =>
              `d${i}: rankings(divisionId: "${d.id}") { place points athlete { id name nationality image } results { place points dropped eventDivision { event { id name date } } } }`,
          )
          .join('\n')} } }`;
        const data = await gql(fetchFn, query);
        divs.forEach((d: any, i: number) => {
          for (const row of data?.series?.[`d${i}`] ?? []) {
            const a = row?.athlete;
            if (a?.id == null) continue;
            const aid = String(a.id);
            const target = athletes[aid];
            if (!target) continue;
            target.name = a.name ?? target.name;
            target.nationality = a.nationality ?? target.nationality;
            target.image = a.image ?? target.image;
            const ranking: RiderRanking = {
              seriesId: id,
              series: info.name,
              tier: info.tier,
              division: d.name ?? '',
              place: row.place,
              points: row.points,
              results: (row.results ?? [])
                .filter((r: any) => r?.eventDivision?.event?.id != null)
                .map((r: any) => ({
                  eventId: String(r.eventDivision.event.id),
                  eventName: r.eventDivision.event.name ?? '',
                  date: r.eventDivision.event.date ? toDay(r.eventDivision.event.date) : '',
                  place: r.place,
                  points: r.points,
                  dropped: r.dropped === true,
                })),
            };
            target.rankings.push(ranking);
          }
        });
      } catch (err) {
        log?.warn(`WARN: ranking series ${id} failed: ${(err as Error).message}`);
        dropped['ranking-failed'] = (dropped['ranking-failed'] ?? 0) + 1;
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(MAX_IN_FLIGHT, seriesList.length) }, seriesWorker),
  );

  // Join ranking points into event results
  for (const e of events)
    for (const d of e.divisions)
      for (const r of d.results) {
        if (r.athleteId == null) continue;
        const rankings = athletes[r.athleteId]?.rankings ?? [];
        const pick = (list: RiderRanking[]) =>
          list.flatMap((rk) => rk.results).find((x) => x.eventId === e.id);
        const hit = pick(rankings.filter((rk) => rk.tier === e.tier)) ?? pick(rankings);
        r.points = hit ? hit.points : null;
      }

  return {
    snapshot: {
      fetchedAt: now().toISOString(),
      season: '2026/27',
      source: 'Liveheats public API (liveheats.com)',
      events,
      athletes,
    },
    dropped,
  };
}
