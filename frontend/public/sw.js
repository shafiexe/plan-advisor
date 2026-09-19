/* Plan Advisor — Service Worker v3: offline caching + Web Push */

const CACHE_NAME = "plan-advisor-v3";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
];

// Install: pre-cache critical static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
//   /_next/static/  → cache-first  (content-hashed, safe to serve stale)
//   /api/           → network-first with cached JSON fallback
//   /ws/            → skip (WebSocket, can't intercept)
//   pages / other   → network-first with cached page fallback
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET; skip WebSocket upgrades
  if (request.method !== "GET" || url.pathname.startsWith("/ws/")) return;

  // --- Next.js static assets: cache-first ---
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return resp;
        });
      })
    );
    return;
  }

  // --- API GET calls: network-first with offline JSON fallback ---
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, clone));
          }
          return resp;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ||
              new Response(
                JSON.stringify({ error: "offline", cached: false }),
                {
                  status: 503,
                  headers: { "Content-Type": "application/json" },
                }
              )
          )
        )
    );
    return;
  }

  // --- Pages and other requests: network-first, fall back to cached version ---
  event.respondWith(
    fetch(request)
      .then((resp) => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return resp;
      })
      .catch(() =>
        caches.match(request).then(
          (cached) =>
            cached ||
            caches.match("/").then(
              (root) =>
                root ||
                new Response("Offline — check your connection", {
                  status: 503,
                  headers: { "Content-Type": "text/plain" },
                })
            )
        )
      )
  );
});

// Message handler: app posts { type: "CACHE_CONVERSATIONS", key, data }
// after writing conversations to localStorage so they survive offline reloads
self.addEventListener("message", (event) => {
  if (event.data?.type === "CACHE_CONVERSATIONS") {
    const { key, data } = event.data;
    caches.open(CACHE_NAME).then((cache) => {
      const resp = new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
      cache.put(`/sw-cache/${key}`, resp);
    });
  }
});

// --- Web Push ---
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = {
      title: "Plan Advisor",
      body: event.data?.text() ?? "You have a new notification.",
    };
  }

  const title = data.title ?? "Plan Advisor";
  const options = {
    body: data.body ?? "You have a new price alert.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "price-alert",
    renotify: true,
    data: { url: data.url ?? "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (
            client.url.includes(self.location.origin) &&
            "focus" in client
          ) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
