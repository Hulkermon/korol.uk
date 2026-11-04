import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const src = readFileSync(resolve(__dirname, '../../public/freeride-sw.js'), 'utf8');
const ORIGIN = 'https://korol.uk';

function makeCache() {
  const map = new Map<string, any>();
  const k = (r: any) => (typeof r === 'string' ? r : r.url);
  return {
    map,
    put: vi.fn(async (r: any, res: any) => {
      map.delete(k(r));
      map.set(k(r), res);
    }),
    match: vi.fn(async (r: any) => map.get(k(r))),
    keys: vi.fn(async () => [...map.keys()].map((url) => ({ url }))),
    delete: vi.fn(async (r: any) => map.delete(k(r))),
    addAll: vi.fn(async (urls: string[]) => {
      urls.forEach((u) => map.set(u, new Response('x')));
    }),
  };
}

let handlers: Record<string, (e: any) => void>;
let store: Map<string, ReturnType<typeof makeCache>>;
let fetchMock: ReturnType<typeof vi.fn>;
let self_: any;

function load() {
  handlers = {};
  store = new Map();
  fetchMock = vi.fn();
  self_ = {
    addEventListener: (t: string, h: any) => (handlers[t] = h),
    location: { origin: ORIGIN },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };
  const caches = {
    open: async (n: string) => {
      if (!store.has(n)) store.set(n, makeCache());
      return store.get(n)!;
    },
    keys: async () => [...store.keys()],
    delete: async (n: string) => store.delete(n),
    match: async () => undefined,
  };
  new Function('self', 'caches', 'fetch', 'URL', 'Response', src)(
    self_,
    caches,
    fetchMock,
    URL,
    Response,
  );
}

function dispatch(type: string, extra: any = {}) {
  const waits: Promise<any>[] = [];
  let responded: Promise<any> | undefined;
  const event = {
    ...extra,
    waitUntil: (p: Promise<any>) => waits.push(p),
    respondWith: (p: Promise<any>) => (responded = p),
  };
  handlers[type](event);
  return { waits, responded: () => responded };
}

const req = (url: string, over: any = {}) => ({ url, method: 'GET', mode: 'cors', ...over });

describe('freeride service worker', () => {
  beforeEach(load);

  it('precaches the shell on install and skips waiting', async () => {
    const { waits } = dispatch('install');
    await Promise.all(waits);
    const shell = store.get('freeride-v1-shell')!;
    expect([...shell.map.keys()]).toEqual([
      '/freeride',
      '/freeride.webmanifest',
      '/freeride-icons/icon-192.png',
    ]);
    expect(self_.skipWaiting).toHaveBeenCalled();
  });

  it('activate deletes old freeride caches but keeps current and tiles', async () => {
    for (const n of ['freeride-v0-shell', 'freeride-v1-shell', 'freeride-tiles', 'other'])
      store.set(n, makeCache());
    const { waits } = dispatch('activate');
    await Promise.all(waits);
    expect([...store.keys()].sort()).toEqual(['freeride-tiles', 'freeride-v1-shell', 'other']);
    expect(self_.clients.claim).toHaveBeenCalled();
  });

  it('navigate: network success is cached under /freeride', async () => {
    fetchMock.mockResolvedValue(new Response('fresh'));
    const { responded } = dispatch('fetch', {
      request: req(`${ORIGIN}/freeride?x=1`, { mode: 'navigate' }),
    });
    const res = await responded()!;
    expect(await res.text()).toBe('fresh');
    const cached = store.get('freeride-v1-shell')!.map.get('/freeride');
    expect(await cached.text()).toBe('fresh');
  });

  it('navigate: falls back to cached shell when offline', async () => {
    const cache = makeCache();
    cache.map.set('/freeride', new Response('shell'));
    store.set('freeride-v1-shell', cache);
    fetchMock.mockRejectedValue(new Error('offline'));
    const { responded } = dispatch('fetch', {
      request: req(`${ORIGIN}/freeride/foo`, { mode: 'navigate' }),
    });
    expect(await (await responded()!).text()).toBe('shell');
  });

  it('navigate: does not cache non-ok responses', async () => {
    fetchMock.mockResolvedValue(new Response('err', { status: 500 }));
    const { responded } = dispatch('fetch', {
      request: req(`${ORIGIN}/freeride`, { mode: 'navigate' }),
    });
    await responded();
    expect(store.get('freeride-v1-shell')!.map.has('/freeride')).toBe(false);
  });

  it('/_nuxt/ cache hit skips the network; miss fetches and caches', async () => {
    const url = `${ORIGIN}/_nuxt/a.js`;
    const cache = makeCache();
    cache.map.set(url, new Response('cached'));
    store.set('freeride-v1-shell', cache);
    const hit = dispatch('fetch', { request: req(url) });
    expect(await (await hit.responded()!).text()).toBe('cached');
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValue(new Response('net'));
    const miss = dispatch('fetch', { request: req(`${ORIGIN}/_nuxt/b.js`) });
    expect(await (await miss.responded()!).text()).toBe('net');
    expect(cache.map.has(`${ORIGIN}/_nuxt/b.js`)).toBe(true);
  });

  it('tiles: serves cached immediately and revalidates in background', async () => {
    const url = 'https://a.tile.openstreetmap.org/1/2/3.png';
    const cache = makeCache();
    cache.map.set(url, new Response('old'));
    store.set('freeride-tiles', cache);
    fetchMock.mockResolvedValue(new Response('new'));
    const { responded } = dispatch('fetch', { request: req(url) });
    expect(await (await responded()!).text()).toBe('old');
    await vi.waitFor(async () => {
      expect(await (await cache.match(url)).text()).toBe('new');
    });
  });

  it('tiles: fetches and caches on miss, trims to 400 oldest first', async () => {
    const cache = makeCache();
    for (let i = 0; i < 400; i++) cache.map.set(`https://a.tile.openstreetmap.org/${i}.png`, 1);
    store.set('freeride-tiles', cache);
    fetchMock.mockResolvedValue(new Response('t'));
    const url = 'https://b.tile.openstreetmap.org/new.png';
    const { responded } = dispatch('fetch', { request: req(url) });
    await responded();
    await vi.waitFor(() => expect(cache.map.size).toBe(400));
    expect(cache.map.has(url)).toBe(true);
    expect(cache.map.has('https://a.tile.openstreetmap.org/0.png')).toBe(false);
    expect(cache.map.has('https://a.tile.openstreetmap.org/1.png')).toBe(true);
  });

  it('does not intercept non-GET, API or unrelated requests', () => {
    const cases = [
      req(`${ORIGIN}/_nuxt/a.js`, { method: 'POST' }),
      req(`${ORIGIN}/api/freeride/snapshot`),
      req('https://example.com/_nuxt/a.js'),
      req('https://example.com/tile.png'),
    ];
    for (const request of cases) {
      const { responded } = dispatch('fetch', { request });
      expect(responded()).toBeUndefined();
    }
  });
});
