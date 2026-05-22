const CACHE_NAME = 'vexo-erp-static-v2';
const ASSET_PATH_PREFIX = '/assets/';
const NAVIGATION_NETWORK_TIMEOUT_MS = 1800;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  if (url.pathname.startsWith(ASSET_PATH_PREFIX)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);

  if (response.ok) {
    cache.put(request, response.clone());
  }

  return response;
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put('/', response.clone());
    }

    return response;
  });
  fetchPromise.catch(() => {});
  const cachedFallbackPromise = new Promise((resolve) => {
    setTimeout(async () => {
      resolve((await cache.match('/')) || null);
    }, NAVIGATION_NETWORK_TIMEOUT_MS);
  });

  try {
    const response = await Promise.race([fetchPromise, cachedFallbackPromise]);

    if (response) {
      return response;
    }

    return await fetchPromise;
  } catch {
    return (await cache.match('/')) || Response.error();
  }
}
