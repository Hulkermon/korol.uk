import { describe, expect, it } from 'vitest';
import { resolveVenue } from '../../composables/freeride/venues';

const lausanne = { place: 'Lausanne, Switzerland', countryCode: 'CH', lat: 46.52, lng: 6.63 };

describe('resolveVenue', () => {
  it('replaces Lausanne HQ for a Pro event with the venue coords', () => {
    const v = resolveVenue('2027 Baqueira Beret Pro By Occident', '30783', lausanne);
    expect(v).toMatchObject({ countryCode: 'ES', lat: 42.7, lng: 0.93 });
  });

  it('keeps real coords for other orgs', () => {
    const loc = { place: 'Nendaz, Switzerland', countryCode: 'CH', lat: 46.18, lng: 7.29 };
    expect(resolveVenue('2027 Nendaz Freeride Qualifier 2*', '29100', loc)).toEqual(loc);
  });

  it('returns null for null coords with no venue match', () => {
    const loc = { place: null, countryCode: null, lat: null, lng: null };
    expect(resolveVenue('2027 Nowhere Qualifier 1*', '29100', loc)).toBeNull();
  });

  it('returns null for an unknown Pro name', () => {
    expect(resolveVenue('2027 Mystery Pro', '30783', lausanne)).toBeNull();
  });
});
