// One-off snapshot of 2026/27 FWT/FWQ/Junior European events from the Liveheats public API.
// Run: node --experimental-strip-types scripts/freeride/fetch-events.ts
// Writes composables/freeride/data/events.json
import { mkdir, writeFile } from 'node:fs/promises';
import {
  classifyName,
  endDay,
  inSeason,
  isInEurope,
  isTrustedOrg,
  toDay,
} from '../../composables/freeride/classify.ts';
import type { EventSnapshot, FreerideEvent } from '../../composables/freeride/types.ts';
import { resolveVenue } from '../../composables/freeride/venues.ts';

const API = 'https://liveheats.com/api/graphql';
const OUT_DIR = new URL('../../composables/freeride/data/', import.meta.url);
const OUT_FILE = new URL('events.json', OUT_DIR);

const TERMS = [
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gql(query: string): Promise<any> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json: any = await res.json();
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors)}`);
  return json.data;
}

const detailQuery = (
  id: string,
) => `{ event(id: ${JSON.stringify(id)}) { id name date daysWindow status organisationId hideEntries
  location { formattedAddress countryCode location { lat lng } }
  registrationOptions { mode }
  paymentOptions { currency defaultDivisionPrice }
  eventDivisions { entryCount division { name } entries { status athlete { name nationality } } } } }`;

async function main() {
  // Discovery (any failure is fatal)
  const found = new Map<string, { id: string; name: string; date: string }>();
  for (const term of TERMS) {
    const data = await gql(
      `{ eventsByName(search: ${JSON.stringify(term)}, limit: 100) { id name date } }`,
    );
    for (const e of data.eventsByName ?? []) found.set(e.id, e);
    await sleep(150);
  }
  const candidates = [...found.values()].filter(
    (e) => e.date && inSeason(toDay(e.date)) && classifyName(e.name) !== null,
  );
  console.log(`Discovered ${found.size} events, ${candidates.length} candidates`);

  const dropped: Record<string, number> = {};
  const drop = (reason: string, label: string) => {
    dropped[reason] = (dropped[reason] ?? 0) + 1;
    console.log(`DROP (${reason}): ${label}`);
  };

  const events: FreerideEvent[] = [];
  for (const c of candidates) {
    await sleep(150);
    let ev: any;
    try {
      ev = (await gql(detailQuery(c.id))).event;
    } catch (err) {
      console.warn(`WARN: detail failed for ${c.id} ${c.name}: ${(err as Error).message}`);
      dropped['detail-failed'] = (dropped['detail-failed'] ?? 0) + 1;
      continue;
    }
    if (!ev) {
      drop('not-found', `${c.id} ${c.name}`);
      continue;
    }
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

  const snapshot: EventSnapshot = {
    fetchedAt: new Date().toISOString(),
    season: '2026/27',
    source: 'Liveheats public API (liveheats.com)',
    events,
  };
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n');

  const perTier: Record<string, number> = {};
  for (const e of events) perTier[e.tier] = (perTier[e.tier] ?? 0) + 1;
  console.log(`\nWrote ${events.length} events`);
  console.log('Per tier:', perTier);
  console.log('Dropped:', dropped);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
