import { describe, it, expect } from 'vitest';
import { countryCode, flagUrl } from '@/composables/freeride/countries';

describe('countryCode', () => {
  it('maps every nationality string found in the real data', () => {
    const cases: Record<string, string> = {
      Andorra: 'ad',
      Argentina: 'ar',
      Australia: 'au',
      Austria: 'at',
      Belgium: 'be',
      Canada: 'ca',
      Czechia: 'cz',
      Denmark: 'dk',
      Finland: 'fi',
      France: 'fr',
      Georgia: 'ge',
      Germany: 'de',
      'Great Britain': 'gb',
      Ireland: 'ie',
      Italy: 'it',
      Japan: 'jp',
      'New Zealand': 'nz',
      Norway: 'no',
      Poland: 'pl',
      'Russian Federation': 'ru',
      Spain: 'es',
      Sweden: 'se',
      Switzerland: 'ch',
      'Taiwan, Province of China': 'tw',
      Ukraine: 'ua',
      'United Kingdom of Great Britain and Northern Ireland': 'gb',
      'United States of America': 'us',
    };
    for (const [name, code] of Object.entries(cases)) expect(countryCode(name), name).toBe(code);
  });

  it('maps ISO names with commas', () => {
    expect(countryCode('Korea, Republic of')).toBe('kr');
    expect(countryCode('Iran, Islamic Republic of')).toBe('ir');
    expect(countryCode('Bolivia, Plurinational State of')).toBe('bo');
    expect(countryCode('Netherlands, Kingdom of the')).toBe('nl');
  });

  it('maps aliases', () => {
    expect(countryCode('UK')).toBe('gb');
    expect(countryCode('England')).toBe('gb');
    expect(countryCode('Russia')).toBe('ru');
    expect(countryCode('Czech Republic')).toBe('cz');
    expect(countryCode('USA')).toBe('us');
    expect(countryCode('South Korea')).toBe('kr');
    expect(countryCode('Holland')).toBe('nl');
    expect(countryCode('Kosovo')).toBe('xk');
  });

  it('ignores case, whitespace and accents', () => {
    expect(countryCode('  sweden ')).toBe('se');
    expect(countryCode('New   Zealand')).toBe('nz');
    expect(countryCode('Türkiye')).toBe('tr');
    expect(countryCode('Turkiye')).toBe('tr');
    expect(countryCode('Côte d’Ivoire')).toBe('ci');
    expect(countryCode("Cote d'Ivoire")).toBe('ci');
  });

  it('returns null for unknown, empty and null', () => {
    expect(countryCode('Atlantis')).toBeNull();
    expect(countryCode('')).toBeNull();
    expect(countryCode(null)).toBeNull();
    expect(countryCode(undefined)).toBeNull();
  });
});

describe('flagUrl', () => {
  it('returns a url for known codes and null otherwise', () => {
    expect(flagUrl('se')).toBeTruthy();
    expect(flagUrl('zz')).toBeNull();
    expect(flagUrl(null)).toBeNull();
  });
});
