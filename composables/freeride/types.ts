export type Tier = 'pro' | 'challenger' | 'qualifier' | 'junior';
export type Stars = 1 | 2 | 3 | 4;
export type EntryStatus = string; // Liveheats values seen: 'confirmed', 'waitlisted', 'denied', 'withdrawn' …

export interface Rider {
  athleteId: string | null;
  name: string;
  nationality: string | null;
  status: EntryStatus;
}

export interface DivisionResult {
  place: number;
  athleteId: string | null;
  name: string;
  nationality: string | null;
  points: number | null;
}

export interface Division {
  name: string;
  entryCount: number;
  riders: Rider[];
  results: DivisionResult[];
}

export interface FreerideEvent {
  id: string; // Liveheats event id
  name: string;
  tier: Tier;
  stars: Stars | null; // null for pro/challenger without stars
  start: string; // 'YYYY-MM-DD' (UTC date of Liveheats `date`)
  end: string; // 'YYYY-MM-DD' = start + daysWindow - 1 (min = start)
  place: string; // human readable, e.g. 'Nendaz, Switzerland'
  countryCode: string | null;
  lat: number;
  lng: number;
  status: string; // Liveheats status, e.g. 'upcoming'
  registrationMode: string | null; // e.g. 'waitlist', 'open', null
  price: { amountCents: number; currency: string } | null;
  url: string; // https://liveheats.com/events/<id>
  registerUrl: string; // https://liveheats.com/events/<id>/registration
  divisions: Division[];
}

export interface RankingResult {
  eventId: string;
  eventName: string;
  date: string; // 'YYYY-MM-DD'
  place: number;
  points: number;
  dropped: boolean;
}

export interface RiderRanking {
  seriesId: string;
  series: string;
  tier: Tier;
  division: string;
  place: number;
  points: number;
  results: RankingResult[];
}

export interface Athlete {
  id: string;
  name: string;
  nationality: string | null;
  image: string | null;
  rankings: RiderRanking[];
}

export interface EventSnapshot {
  fetchedAt: string;
  season: string;
  source: string;
  events: FreerideEvent[];
  athletes: Record<string, Athlete>;
}
