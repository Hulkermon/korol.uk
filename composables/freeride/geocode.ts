// Address autocomplete and reverse geocoding via Photon (komoot): free, OSM-based, CORS-enabled.

export interface Place {
  label: string;
  lat: number;
  lng: number;
}

const PHOTON = 'https://photon.komoot.io';
// Bias results towards the Alps.
const BIAS_LAT = 46.5;
const BIAS_LNG = 9.5;

export function photonUrl(q: string, opts: { limit?: number; lang?: string } = {}): string {
  const limit = opts.limit ?? 6;
  const lang = opts.lang ?? 'en';
  return (
    `${PHOTON}/api/?q=${encodeURIComponent(q)}&limit=${limit}` +
    `&lang=${encodeURIComponent(lang)}&lat=${BIAS_LAT}&lon=${BIAS_LNG}`
  );
}

export function reverseUrl(lat: number, lng: number): string {
  return `${PHOTON}/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&lang=en`;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function placeLabel(props: Record<string, unknown> | null | undefined): string {
  const p = props ?? {};
  const street = [str(p.street), str(p.housenumber)].filter(Boolean).join(' ');
  // A postcode alone ("Zermatt, 3920") reads as noise, so it only goes with a city or district
  const town = str(p.city) || str(p.district);
  const locality = town ? [str(p.postcode), town].filter(Boolean).join(' ') : '';
  const parts = [str(p.name), street, locality, str(p.country)].filter(Boolean);
  return [...new Set(parts)].join(', ');
}

export function parsePhoton(json: unknown): Place[] {
  const features = (json as { features?: unknown } | null)?.features;
  if (!Array.isArray(features)) return [];
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const f of features) {
    const coords = f?.geometry?.coordinates;
    if (!Array.isArray(coords)) continue;
    const lng = coords[0];
    const lat = coords[1];
    if (typeof lng !== 'number' || typeof lat !== 'number') continue;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    const label = placeLabel(f?.properties);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push({ label, lat, lng });
  }
  return out;
}

interface FetchOpts {
  fetchFn?: typeof fetch;
  signal?: AbortSignal;
}

async function getJson(url: string, opts: FetchOpts): Promise<unknown> {
  const doFetch = opts.fetchFn ?? globalThis.fetch;
  const res = await doFetch(url, { signal: opts.signal });
  if (!res.ok) throw new Error(`Photon request failed: ${res.status}`);
  return res.json();
}

export async function searchPlaces(q: string, opts: FetchOpts = {}): Promise<Place[]> {
  const text = q.trim();
  if (text.length < 3) return [];
  return parsePhoton(await getJson(photonUrl(text), opts));
}

export async function reversePlace(
  lat: number,
  lng: number,
  opts: FetchOpts = {}
): Promise<Place | null> {
  const places = parsePhoton(await getJson(reverseUrl(lat, lng), opts));
  return places[0] ?? null;
}
