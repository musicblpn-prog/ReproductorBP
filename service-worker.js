// =====================================================
// MI MUSIC PLAYER — SERVICE WORKER
// v6 — estabilidad iOS / Android / PC
// =====================================================
//
// CAMBIOS CLAVE respecto a versiones anteriores:
// 1) Se corrigieron las rutas de los íconos en APP_SHELL
//    (antes apuntaban a "./icon-192.png" en vez de
//    "./icons/icon-192.png"), lo que hacía fallar
//    cache.addAll() y dejaba el Service Worker SIN INSTALAR
//    NUNCA (install() rechazado silenciosamente).
// 2) Se eliminó el cacheo de respuestas 206 (parciales) de
//    audio bajo la URL simple. Eso provocaba que, tras varias
//    canciones, el <audio> recibiera bytes de un rango
//    equivocado (cache corrupto) y la reproducción se colgara
//    o se pausara sin recuperación posible.
// 3) Ahora el audio se sirve "network-first" y, si hay una
//    copia COMPLETA (no parcial) ya en caché, se puede
//    reconstruir la respuesta parcial (206) correctamente
//    recortando el Blob según el header Range solicitado.
//    Esto permite que, si se cae Internet a mitad de la cola,
//    las canciones ya precargadas por completo sigan sonando.
// =====================================================

const VERSION = "v6";
const CACHE_STATIC = `mi-music-static-${VERSION}`;
const CACHE_RUNTIME = `mi-music-runtime-${VERSION}`;
const CACHE_AUDIO = `mi-music-audio-${VERSION}`;

const AUDIO_MAX_CACHE_ITEMS = 12; // canciones completas en caché de emergencia
const AUDIO_MAX_BYTES = 40 * 1024 * 1024; // no cachear archivos > 40MB completos

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./manifest.json",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// ================================
// INSTALL
// ================================
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_STATIC);
      // addAll() todo-o-nada: si un solo archivo falla, se
      // pierde la instalación completa. Por eso se cachea
      // uno por uno y se ignoran errores individuales, sin
      // dejar el SW entero sin instalar por un archivo suelto.
      await Promise.all(
        APP_SHELL.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "no-cache" });
            if (res && res.ok) await cache.put(url, res);
          } catch (err) {
            console.warn("[SW] No se pudo precachear:", url, err);
          }
        })
      );
    })()
  );

  self.skipWaiting();
});

// ================================
// ACTIVATE
// ================================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              key !== CACHE_STATIC &&
              key !== CACHE_RUNTIME &&
              key !== CACHE_AUDIO
          )
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// ================================
// MENSAJES DESDE LA APP
// ================================
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ================================
// HELPERS DE CACHÉ GENERAL
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

  try {
    const fresh = await fetch(request);
    const cache = await caches.open(CACHE_RUNTIME);

    if (fresh && fresh.status === 200) {
      cache.put(request, fresh.clone());
      limitCacheSize(CACHE_RUNTIME, 80);
    }

    return fresh;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_RUNTIME);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((fresh) => {
      if (fresh && fresh.status === 200) cache.put(request, fresh.clone());
      return fresh;
    })
    .catch(() => null);

  return cached || (await networkFetch) || cached;
}

async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    return limitCacheSize(cacheName, maxItems);
  }
}

// ================================
// HELPERS DE AUDIO (RANGE-AWARE)
// ================================

// Guarda SIEMPRE la versión completa (sin Range) de un audio,
// usando la URL como clave. Nunca se guarda un 206 aquí.
async function cacheFullAudioIfPossible(url, response) {
  try {
    if (!response || response.status !== 200) return;

    const lenHeader = response.headers.get("content-length");
    const len = lenHeader ? parseInt(lenHeader, 10) : 0;

    if (len && len > AUDIO_MAX_BYTES) return; // demasiado pesado

    const cache = await caches.open(CACHE_AUDIO);
    await cache.put(url, response.clone());
    limitCacheSize(CACHE_AUDIO, AUDIO_MAX_CACHE_ITEMS);
  } catch (err) {
    console.warn("[SW] No se pudo guardar audio completo:", err);
  }
}

// Corta un Response completo cacheado según el header Range
// solicitado, devolviendo un 206 válido y consistente.
async function sliceCachedAudio(cachedResponse, rangeHeader) {
  const blob = await cachedResponse.clone().blob();
  const size = blob.size;

  let start = 0;
  let end = size - 1;

  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader || "");
  if (match) {
    if (match[1] !== "") start = parseInt(match[1], 10);
    if (match[2] !== "") end = parseInt(match[2], 10);
  }

  if (Number.isNaN(start) || start < 0) start = 0;
  if (Number.isNaN(end) || end >= size) end = size - 1;
  if (start > end) start = 0;

  const sliced = blob.slice(start, end + 1);

  const headers = new Headers(cachedResponse.headers);
  headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  headers.set("Content-Length", String(sliced.size));
  headers.set("Accept-Ranges", "bytes");

  return new Response(sliced, {
    status: 206,
    statusText: "Partial Content",
    headers
  });
}

function isAudioRequest(request, url) {
  return (
    request.destination === "audio" ||
    url.pathname.endsWith(".mp3") ||
    url.pathname.endsWith(".m4a") ||
    url.pathname.endsWith(".aac") ||
    url.pathname.endsWith(".wav") ||
    url.pathname.endsWith(".ogg")
  );
}

// Maneja peticiones de audio (con o sin Range), priorizando
// siempre la red, pero cayendo a caché completa (recortada
// según Range si aplica) cuando no hay conexión. Esto es lo
// que permite que la música siga sonando si se cae el
// internet, siempre que la canción ya se haya precargado
// por completo alguna vez.
async function handleAudioRequest(request) {
  const url = request.url;
  const rangeHeader = request.headers.get("range");

  try {
    const fresh = await fetch(request);

    // Si la respuesta es completa (200), la guardamos para
    // poder usarla offline más adelante.
    if (fresh && fresh.status === 200) {
      cacheFullAudioIfPossible(url, fresh.clone());
    }

    return fresh;
  } catch (err) {
    // Sin conexión: buscamos una copia COMPLETA guardada.
    const cache = await caches.open(CACHE_AUDIO);
    const cachedFull = await cache.match(url);

    if (!cachedFull) throw err;

    if (rangeHeader) {
      return sliceCachedAudio(cachedFull, rangeHeader);
    }

    return cachedFull.clone();
  }
}

// ================================
// FETCH
// ================================
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Navegación HTML
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Audio remoto (Dropbox, etc.) — SIEMPRE antes que el resto
  // de reglas, sin importar el origen.
  if (isAudioRequest(request, url)) {
    event.respondWith(handleAudioRequest(request));
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

  // Default
  event.respondWith(networkFirst(request));
});
