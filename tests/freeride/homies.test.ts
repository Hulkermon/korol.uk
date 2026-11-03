import { describe, it, expect } from 'vitest';
import { nextTick } from 'vue';
import {
  HOMIES_KEY,
  allRiders,
  homieEntries,
  homieEventIds,
  matchesQuery,
  riderKey,
  useHomies,
} from '@/composables/freeride/homies';
import type { Division, FreerideEvent } from '@/composables/freeride/types';

function ev(id: string, start: string, divisions: Division[], name = `Event ${id}`): FreerideEvent {
  return {
    id,
    name,
    tier: 'qualifier',
    stars: 2,
    start,
    end: start,
    place: 'Somewhere',
    countryCode: 'CH',
    lat: 46,
    lng: 7,
    status: 'upcoming',
    registrationMode: 'waitlist',
    price: null,
    url: '',
    registerUrl: '',
    divisions,
  };
}

const div = (name: string, riders: [string, string | null, string][]): Division => ({
  name,
  entryCount: riders.length,
  riders: riders.map(([n, nat, status]) => ({ name: n, nationality: nat, status })),
});

const events = [
  ev('3', '2027-03-01', [div('Ski Women', [['Élise Dupré', 'France', 'waitlisted']])]),
  ev('1', '2027-01-10', [
    div('Ski Women', [['elise dupre', null, 'confirmed']]),
    div('Snowboard Women', [['ELISE DUPRE', null, 'denied']]),
  ]),
  ev('2', '2027-02-01', [div('Ski Men', [['Zed Rider', 'Sweden', 'waitlisted']])]),
];

function memStorage(initial?: string, opts: { throwOnSet?: boolean } = {}) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(HOMIES_KEY, initial);
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (opts.throwOnSet) throw new Error('QuotaExceededError');
      data.set(k, v);
    },
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage & { data: Map<string, string> };
}

describe('riderKey', () => {
  it('normalises case, accents and whitespace', () => {
    expect(riderKey('Élise  Dupré ')).toBe('elise dupre');
    expect(riderKey('  ZED\tRider')).toBe('zed rider');
  });
});

describe('homieEntries / homieEventIds', () => {
  it('finds a rider across events and divisions, sorted by date', () => {
    const entries = homieEntries(events, riderKey('Elise Dupre'));
    expect(entries.map((e) => [e.event.id, e.division, e.status])).toEqual([
      ['1', 'Ski Women', 'confirmed'],
      ['1', 'Snowboard Women', 'denied'],
      ['3', 'Ski Women', 'waitlisted'],
    ]);
  });

  it('returns nothing for an unknown key', () => {
    expect(homieEntries(events, 'nobody')).toEqual([]);
  });

  it('dedupes event ids', () => {
    expect(homieEventIds(events, 'elise dupre')).toEqual(['1', '3']);
  });
});

describe('allRiders', () => {
  it('dedupes, counts events, prefers a nationality and sorts by name', () => {
    expect(allRiders(events)).toEqual([
      { key: 'elise dupre', name: 'Élise Dupré', nationality: 'France', eventCount: 2 },
      { key: 'zed rider', name: 'Zed Rider', nationality: 'Sweden', eventCount: 1 },
    ]);
  });

  it('fills a missing nationality from a later occurrence', () => {
    const r = allRiders([
      ev('a', '2027-01-01', [div('X', [['Kim', null, 'waitlisted']])]),
      ev('b', '2027-01-02', [div('X', [['Kim', 'Norway', 'waitlisted']])]),
    ]);
    expect(r[0].nationality).toBe('Norway');
  });
});

describe('matchesQuery', () => {
  it('matches substrings ignoring case and accents', () => {
    expect(matchesQuery('Élise Dupré', 'DUPR')).toBe(true);
    expect(matchesQuery('Elise Dupre', 'é')).toBe(true);
    expect(matchesQuery('Zed Rider', 'elise')).toBe(false);
    expect(matchesQuery('Zed Rider', '   ')).toBe(true);
  });
});

describe('useHomies', () => {
  it('starts empty and toggles', () => {
    const h = useHomies(memStorage());
    expect(h.homies.value).toEqual([]);
    h.toggleHomie(' Zed Rider ');
    expect(h.homies.value).toEqual([{ key: 'zed rider', name: 'Zed Rider' }]);
    expect(h.isHomie('ZED rider')).toBe(true);
    h.toggleHomie('zed RIDER');
    expect(h.homies.value).toEqual([]);
    expect(h.isHomie('Zed Rider')).toBe(false);
  });

  it('persists and round trips', async () => {
    const st = memStorage();
    const a = useHomies(st);
    a.toggleHomie('Élise Dupré');
    a.toggleHomie('Zed Rider');
    await nextTick();
    const b = useHomies(st);
    expect(b.homies.value.map((x) => x.name)).toEqual(['Élise Dupré', 'Zed Rider']);
  });

  it('ignores corrupt data and dedupes', () => {
    expect(useHomies(memStorage('{nope')).homies.value).toEqual([]);
    expect(useHomies(memStorage('{"a":1}')).homies.value).toEqual([]);
    const h = useHomies(
      memStorage(
        JSON.stringify([
          { key: 'x', name: 'Kim' },
          { key: 'kim', name: 'KIM' },
          { name: 'no key' },
          null,
          42,
        ]),
      ),
    );
    expect(h.homies.value).toEqual([{ key: 'kim', name: 'Kim' }]);
  });

  it('works without storage or when storage throws', async () => {
    const a = useHomies(null);
    a.toggleHomie('Kim');
    expect(a.isHomie('kim')).toBe(true);
    const b = useHomies(memStorage(undefined, { throwOnSet: true }));
    b.toggleHomie('Kim');
    await nextTick();
    expect(b.homies.value).toHaveLength(1);
  });
});
