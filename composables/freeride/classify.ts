import type { Stars, Tier } from './types';

export const FWT_ORG_IDS = ['29100', '30783'] as const;

export function isTrustedOrg(id: string): boolean {
  return (FWT_ORG_IDS as readonly string[]).includes(id);
}

export const EUROPE_BBOX = { minLat: 35, maxLat: 72, minLng: -25, maxLng: 45 };

export function isInEurope(lat: number, lng: number): boolean {
  return (
    lat >= EUROPE_BBOX.minLat &&
    lat <= EUROPE_BBOX.maxLat &&
    lng >= EUROPE_BBOX.minLng &&
    lng <= EUROPE_BBOX.maxLng
  );
}

export function classifyName(name: string): { tier: Tier; stars: Stars | null } | null {
  const starMatch = name.match(/(\d)\s*\*/);
  const n = starMatch ? Number(starMatch[1]) : 0;
  const stars: Stars | null = n >= 1 && n <= 4 ? (n as Stars) : null;

  if (/\bjunior\b/i.test(name)) return { tier: 'junior', stars };
  if (/\bqualifier\b/i.test(name) || /\bFWQ\b/i.test(name)) return { tier: 'qualifier', stars };
  if (/challenger/i.test(name)) return { tier: 'challenger', stars };
  if (/\bpro\b/i.test(name)) return { tier: 'pro', stars: null };
  return null;
}

export function toDay(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function endDay(startDay: string, daysWindow: number): string {
  if (!(daysWindow > 1)) return startDay;
  const d = new Date(`${startDay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.floor(daysWindow) - 1);
  return d.toISOString().slice(0, 10);
}

export function inSeason(
  day: string,
  season: { from: string; to: string } = { from: '2026-10-01', to: '2027-06-30' },
): boolean {
  return day >= season.from && day <= season.to;
}
