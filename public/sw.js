const CACHE_NAME = "toro-public-shell-v3";
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

function getLiveWorkoutTarget(data) {
  if (data?.type !== "TORO_LIVE_WORKOUT" || typeof data.sessionId !== "string" || data.sessionId.length > 100 || typeof data.url !== "string") return null;
  try {
    const url = new URL(data.url, self.location.origin);
    if (url.origin !== self.location.origin || !/^\/dashboard\/routine\/(?:free|[A-Za-z0-9-]{8,100})$/.test(url.pathname)) return null;
    return { url, sessionId: data.sessionId };
  } catch {
    return null;
  }
}

async function focusWorkoutWindow(url) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const exact = windows.find((client) => {
    try {
      return new URL(client.url).origin === self.location.origin && new URL(client.url).pathname === url.pathname;
    } catch {
      return false;
    }
  });
  if (exact) return exact.focus();

  const existing = windows.find((client) => {
    try {
      return new URL(client.url).origin === self.location.origin;
    } catch {
      return false;
    }
  });
  if (existing) {
    await existing.navigate(url.href);
    return existing.focus();
  }
  return self.clients.openWindow(url.href);
}

function requestWorkoutAction(client, sessionId, action, exerciseId, setId, restState) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => {
      channel.port1.close();
      resolve(null);
    }, 8_000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      channel.port1.close();
      resolve(event.data);
    };
    client.postMessage(
      {
        type: "TORO_LIVE_WORKOUT_ACTION",
        sessionId,
        action,
        exerciseId,
        setId,
        restState,
        expiresAt: Date.now() + 8_000,
      },
      [channel.port2],
    );
  });
}

self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  const target = getLiveWorkoutTarget(notification.data);
  if (!target) {
    notification.close();
    return;
  }

  const action = event.action || "open_workout";
  event.waitUntil((async () => {
    if (action === "open_workout") {
      notification.close();
      await focusWorkoutWindow(target.url);
      return;
    }

    if (action !== "complete_set" && action !== "toggle_rest") {
      notification.close();
      await focusWorkoutWindow(target.url);
      return;
    }
    if (action === "complete_set" && (typeof notification.data.exerciseId !== "string" || typeof notification.data.setId !== "string")) {
      notification.close();
      await focusWorkoutWindow(target.url);
      return;
    }

    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const workoutClient = windows.find((client) => {
      try {
        return new URL(client.url).origin === self.location.origin && new URL(client.url).pathname === target.url.pathname;
      } catch {
        return false;
      }
    });
    if (!workoutClient) {
      notification.close();
      await focusWorkoutWindow(target.url);
      await self.registration.showNotification("TORO · Abrí tu entrenamiento", {
        body: "La pestaña no estaba activa. Revisá la sesión y volvé a intentar la acción.",
        tag: "toro-live-workout",
        renotify: false,
        icon: "/icons/toro-icon-1024.png",
        data: { type: "TORO_LIVE_WORKOUT", sessionId: target.sessionId, url: target.url.href },
        actions: [{ action: "open_workout", title: "Abrir TORO" }],
      });
      return;
    }

    await workoutClient.focus();
    let result = null;
    try {
      result = await requestWorkoutAction(
        workoutClient,
        target.sessionId,
        action,
        notification.data.exerciseId,
        notification.data.setId,
        notification.data.restState,
      );
    } catch {
      result = null;
    }

    if (result?.status === "saved") {
      return;
    }

    const body = result?.message || "No se confirmó ningún cambio. Revisá la sesión antes de volver a intentar.";
    await self.registration.showNotification("TORO · Acción no confirmada", {
      body,
      tag: "toro-live-workout",
      renotify: false,
      icon: "/icons/toro-icon-1024.png",
      data: { type: "TORO_LIVE_WORKOUT", sessionId: target.sessionId, url: target.url.href },
      actions: [{ action: "open_workout", title: "Abrir TORO" }],
    });
  })());
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

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirstAsset(request));
  }
});
