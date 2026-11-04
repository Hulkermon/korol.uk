// Freeride offline service worker. Classic script, no imports, no build step.
const VERSION = 'freeride-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const TILES_CACHE = 'freeride-tiles';
const SHELL_KEY = '/freeride';
const PRECACHE = ['/freeride', '/freeride.webmanifest', '/freeride-icons/icon-192.png'];
const MAX_TILES = 400;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => n.startsWith('freeride-') && n !== SHELL_CACHE && n !== TILES_CACHE)
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function trimCache(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) {
    await cache.delete(keys[i]);
  }
}

async function handleNavigate(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) await cache.put(SHELL_KEY, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(SHELL_KEY);
    if (cached) return cached;
    throw err;
  }
}

async function handleAsset(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) await cache.put(request, response.clone());
  return response;
}

async function handleTile(request) {
  const cache = await caches.open(TILES_CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
        await trimCache(cache, MAX_TILES);
      }
      return response;
    })
    .catch((err) => {
      if (cached) return cached;
      throw err;
    });
  return cached || refresh;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigate(request));
    return;
  }

  const url = new URL(request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith('/_nuxt/')) {
    event.respondWith(handleAsset(request));
    return;
  }

  if (url.hostname.endsWith('.tile.openstreetmap.org')) {
    event.respondWith(handleTile(request));
  }
});
