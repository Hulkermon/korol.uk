// Builds the 2026/27 FWT/FWQ/Junior European event snapshot from the Liveheats public API.
// Plain TS, no Node/Vue APIs: runs in Node (script), Nitro (server route) and Vitest.
import { classifyName, endDay, inSeason, isInEurope, isTrustedOrg, toDay } from './classify';
import type { EventSnapshot, FreerideEvent } from './types';
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
  location { formattedAddress countryCode location { lat lng } }
  registrationOptions { mode }
  paymentOptions { currency defaultDivisionPrice }
  eventDivisions { entryCount division { name } entries { status athlete { name nationality } } }`;

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
              name: en.athlete?.name ?? '',
              nationality: en.athlete?.nationality ?? null,
              status: en.status,
            })),
      })),
    });
  }

  events.sort((a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name));

  return {
    snapshot: {
      fetchedAt: now().toISOString(),
      season: '2026/27',
      source: 'Liveheats public API (liveheats.com)',
      events,
    },
    dropped,
  };
}
