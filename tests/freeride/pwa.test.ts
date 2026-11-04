import { describe, expect, it, vi } from 'vitest';
import { FREERIDE_PWA_HEAD, registerFreerideSw } from '@/composables/freeride/pwa';

const navWith = (register: any) => ({ serviceWorker: { register } }) as unknown as Navigator;

describe('registerFreerideSw', () => {
  it('skips in dev', async () => {
    const register = vi.fn();
    expect(await registerFreerideSw(navWith(register), true)).toBe(false);
    expect(register).not.toHaveBeenCalled();
  });
  it('returns false without service worker support', async () => {
    expect(await registerFreerideSw({} as Navigator)).toBe(false);
    expect(await registerFreerideSw(undefined, false)).toBe(false);
  });
  it('registers with url and scope', async () => {
    const register = vi.fn().mockResolvedValue({});
    expect(await registerFreerideSw(navWith(register))).toBe(true);
    expect(register).toHaveBeenCalledWith('/freeride-sw.js', { scope: '/freeride' });
  });
  it('returns false on rejection', async () => {
    const register = vi.fn().mockRejectedValue(new Error('x'));
    expect(await registerFreerideSw(navWith(register))).toBe(false);
  });
});

describe('FREERIDE_PWA_HEAD', () => {
  it('has overridable manifest and icon links', () => {
    const keys = FREERIDE_PWA_HEAD.link.map((l) => l.key);
    expect(keys).toEqual(['manifest', 'apple-touch-icon']);
    expect(FREERIDE_PWA_HEAD.link[0].href).toBe('/freeride.webmanifest');
  });
  it('has the expected meta tags', () => {
    const m = Object.fromEntries(FREERIDE_PWA_HEAD.meta.map((x) => [x.name, x.content]));
    expect(m).toEqual({
      'theme-color': '#1f2a37',
      'apple-mobile-web-app-title': 'Freeride',
      'apple-mobile-web-app-capable': 'yes',
      'mobile-web-app-capable': 'yes',
    });
  });
});
