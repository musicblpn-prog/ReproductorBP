const CACHE_STATIC = "mi-music-static-v2";
const CACHE_RUNTIME = "mi-music-runtime-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

// ================================
// INSTALL
// ================================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );

  self.skipWaiting();
});

// ================================
// ACTIVATE
// ================================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_STATIC && key !== CACHE_RUNTIME)
          .map((key) => caches.delete(key))
      );
    })
  );

  self.clients.claim();
});

// ================================
// HELPERS
// ================================
async function networkFirst(request) {
  const cache = await caches.open(CACHE_RUNTIME);

  try {
    const fresh = await fetch(request);

    if (fresh && fresh.status === 200) {
      cache.put(request, fresh.clone());
    }

    return fresh;

  } catch {

    const cached = await cache.match(request);

    if (cached) return cached;

    return caches.match("./index.html");
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const fresh = await fetch(request);
  const cache = await caches.open(CACHE_RUNTIME);

  if (fresh && fresh.status === 200) {
    cache.put(request, fresh.clone());
    limitCacheSize(CACHE_RUNTIME, 60);
  }

  return fresh;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_RUNTIME);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((fresh) => {
      cache.put(request, fresh.clone());
      return fresh;
    })
    .catch(() => null);

  return cached || networkFetch || fetch(request);
}


async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    limitCacheSize(cacheName, maxItems);
  }
}

// ================================
// FETCH
// ================================
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Solo GET
  if (request.method !== "GET") return;

  // Navegación HTML
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Archivos locales de la app
  if (url.origin === self.location.origin) {
    if (
      url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".json") ||
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".jpg") ||
      url.pathname.endsWith(".jpeg") ||
      url.pathname.endsWith(".webp") ||
      url.pathname.endsWith(".svg") ||
      url.pathname.endsWith(".ico")
    ) {
      event.respondWith(cacheFirst(request));
      return;
    }
  }

  // Portadas remotas
  if (
    request.destination === "image" ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".webp")
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // MP3 / audio remotos: NO cache agresivo todavía
if (
  request.destination === "audio" ||
  url.pathname.endsWith(".mp3") ||
  url.pathname.endsWith(".m4a") ||
  url.pathname.endsWith(".aac")
) {

  event.respondWith(

    caches.open(CACHE_RUNTIME).then(async (cache) => {

      const cached = await cache.match(request);

      //  si ya está cacheado → respuesta inmediata
      if (cached) return cached;

      try {

        const response = await fetch(request);

        //  solo cachear si es válido
        if (response && response.status === 200) {
          cache.put(request, response.clone());
          limitCacheSize(CACHE_RUNTIME, 50); //  límite
        }

        return response;

      } catch (err) {

        if (cached) return cached;

        throw err;

      }

    })

  );

  return;
}

  // Default
  event.respondWith(networkFirst(request));
});

