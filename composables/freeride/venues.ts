// Venue coordinate overrides. Pro events report the FWT HQ (Lausanne) as their location.
// Plain TS only so it runs in Node, Nitro and Vitest.

export interface Venue {
  place: string;
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
}

export const VENUES: {
  match: RegExp;
  place: string;
  countryCode: string;
  lat: number;
  lng: number;
}[] = [
  { match: /baqueira/i, place: 'Baqueira Beret, Spain', countryCode: 'ES', lat: 42.7, lng: 0.93 },
  {
    match: /val\s*thorens/i,
    place: 'Val Thorens, France',
    countryCode: 'FR',
    lat: 45.3,
    lng: 6.58,
  },
  {
    match: /georgia|gudauri/i,
    place: 'Gudauri, Georgia',
    countryCode: 'GE',
    lat: 42.48,
    lng: 44.48,
  },
  {
    match: /fieberbrunn/i,
    place: 'Fieberbrunn, Austria',
    countryCode: 'AT',
    lat: 47.47,
    lng: 12.55,
  },
  {
    match: /verbier|xtreme/i,
    place: 'Verbier, Switzerland',
    countryCode: 'CH',
    lat: 46.1,
    lng: 7.23,
  },
  {
    match: /andorra|ordino|arcal/i,
    place: 'Ordino Arcalís, Andorra',
    countryCode: 'AD',
    lat: 42.63,
    lng: 1.48,
  },
  {
    match: /kicking\s*horse/i,
    place: 'Kicking Horse, Canada',
    countryCode: 'CA',
    lat: 51.3,
    lng: -117.05,
  },
];

const PRO_ORG_ID = '30783';

export function resolveVenue(name: string, orgId: string, loc: Venue): Venue | null {
  const fromVenues = (): Venue | null => {
    const v = VENUES.find((x) => x.match.test(name));
    return v ? { place: v.place, countryCode: v.countryCode, lat: v.lat, lng: v.lng } : null;
  };
  if (orgId === PRO_ORG_ID || (loc.place ?? '').includes('Lausanne')) return fromVenues();
  if (loc.lat != null && loc.lng != null) return loc;
  return fromVenues();
}
