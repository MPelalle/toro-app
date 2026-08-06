const CACHE_NAME = "toro-public-shell-v2";
const PUBLIC_SHELL = ["/", "/login", "/sign-in", "/offline", "/manifest.webmanifest", "/icons/toro-icon-1024.png"];
const PUBLIC_NAVIGATIONS = new Set(["/", "/login", "/sign-in", "/offline"]);

function isCacheable(response) {
  const cacheControl = response.headers.get("Cache-Control") ?? "";
  return response.ok && !cacheControl.includes("no-store") && !cacheControl.includes("private");
}

async function networkFirstPublicPage(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (isCacheable(response)) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) ?? (await cache.match("/offline"));
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheable(response)) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PUBLIC_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();

  if (event.data?.type === "CACHE_APP_SHELL" && Array.isArray(event.data.assets)) {
    const assets = event.data.assets
      .filter((asset) => typeof asset === "string")
      .map((asset) => new URL(asset, self.location.origin))
      .filter((asset) => asset.origin === self.location.origin && (asset.pathname.startsWith("/_next/static/") || asset.pathname.startsWith("/icons/")));

    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        await Promise.all(assets.map(async (asset) => {
          try {
            const response = await fetch(asset);
            if (isCacheable(response)) await cache.put(asset, response);
          } catch {
            // A single unavailable asset must not prevent installation.
          }
        }));
      }),
    );
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    if (PUBLIC_NAVIGATIONS.has(url.pathname)) {
      event.respondWith(networkFirstPublicPage(request));
    } else {
      // Protected pages can contain another user's data. Never save their HTML.
      event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    }
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirstAsset(request));
  }
});
