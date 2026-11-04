import { describe, expect, it, vi } from 'vitest';
import {
  parsePhoton,
  photonUrl,
  placeLabel,
  reversePlace,
  reverseUrl,
  searchPlaces
} from '@/composables/freeride/geocode';

const feature = (coordinates: unknown, properties: Record<string, unknown>) => ({
  geometry: { coordinates },
  properties
});

const okFetch = (json: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => json });

describe('urls', () => {
  it('encodes the query and sets params', () => {
    const url = new URL(photonUrl('Zürich & co'));
    expect(url.origin + url.pathname).toBe('https://photon.komoot.io/api/');
    expect(url.searchParams.get('q')).toBe('Zürich & co');
    expect(url.searchParams.get('limit')).toBe('6');
    expect(url.searchParams.get('lang')).toBe('en');
    expect(url.searchParams.get('lat')).toBe('46.5');
    expect(url.searchParams.get('lon')).toBe('9.5');
  });

  it('honours limit and lang', () => {
    const url = new URL(photonUrl('x', { limit: 3, lang: 'de' }));
    expect(url.searchParams.get('limit')).toBe('3');
    expect(url.searchParams.get('lang')).toBe('de');
  });

  it('builds the reverse url', () => {
    const url = new URL(reverseUrl(46.1, 7.2));
    expect(url.pathname).toBe('/reverse');
    expect(url.searchParams.get('lat')).toBe('46.1');
    expect(url.searchParams.get('lon')).toBe('7.2');
  });
});

describe('placeLabel', () => {
  it('builds a full address', () => {
    expect(
      placeLabel({
        street: 'Bahnhofstrasse',
        housenumber: '1',
        postcode: '8001',
        city: 'Zürich',
        country: 'Switzerland'
      })
    ).toBe('Bahnhofstrasse 1, 8001 Zürich, Switzerland');
  });

  it('uses name, falls back to district and dedupes', () => {
    expect(placeLabel({ name: 'Verbier', district: 'Verbier', country: 'Switzerland' })).toBe(
      'Verbier, Switzerland'
    );
    expect(placeLabel({ name: 'Hotel', postcode: '1936', district: 'Bagnes' })).toBe(
      'Hotel, 1936 Bagnes'
    );
  });

  it('handles empty input', () => {
    expect(placeLabel({})).toBe('');
    expect(placeLabel(null)).toBe('');
  });
});

describe('parsePhoton', () => {
  it('parses, dedupes and skips invalid features', () => {
    const json = {
      features: [
        feature([8.5, 47.3], { name: 'Zürich', country: 'Switzerland' }),
        feature([8.6, 47.4], { name: 'Zürich', country: 'Switzerland' }),
        feature([NaN, 1], { name: 'Bad' }),
        feature(['a', 1], { name: 'Bad2' }),
        feature(null, { name: 'Bad3' }),
        feature([1, 2], {}),
        null
      ]
    };
    expect(parsePhoton(json)).toEqual([{ label: 'Zürich, Switzerland', lat: 47.3, lng: 8.5 }]);
  });

  it('tolerates garbage', () => {
    expect(parsePhoton(null)).toEqual([]);
    expect(parsePhoton('x')).toEqual([]);
    expect(parsePhoton({ features: 5 })).toEqual([]);
  });
});

describe('searchPlaces', () => {
  it('does not fetch for short queries', async () => {
    const fetchFn = okFetch({ features: [] });
    expect(await searchPlaces('  ab ', { fetchFn })).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('returns parsed places and passes the signal', async () => {
    const fetchFn = okFetch({ features: [feature([9, 46], { name: 'Chur' })] });
    const ctrl = new AbortController();
    const res = await searchPlaces(' Chur ', { fetchFn, signal: ctrl.signal });
    expect(res).toEqual([{ label: 'Chur', lat: 46, lng: 9 }]);
    expect(fetchFn.mock.calls[0][0]).toContain('q=Chur&');
    expect(fetchFn.mock.calls[0][1].signal).toBe(ctrl.signal);
  });

  it('throws on http error', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(searchPlaces('Chur', { fetchFn })).rejects.toThrow();
  });
});

describe('reversePlace', () => {
  it('returns the first place', async () => {
    const fetchFn = okFetch({ features: [feature([9, 46], { name: 'Chur' })] });
    expect(await reversePlace(46, 9, { fetchFn })).toEqual({ label: 'Chur', lat: 46, lng: 9 });
  });

  it('returns null on empty results', async () => {
    expect(await reversePlace(0, 0, { fetchFn: okFetch({ features: [] }) })).toBeNull();
  });
});
