/* Plan Advisor — Service Worker for Web Push notifications + Offline caching */

const CACHE_NAME = "plan-advisor-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(["/"])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only cache GET requests; skip API/WebSocket calls
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws/")) return;

  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        // Cache successful responses for static assets and the root page
        if (
          resp.ok &&
          (url.pathname.startsWith("/_next/static/") || url.pathname === "/")
        ) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return resp;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((r) => r ?? new Response("Offline", { status: 503 })),
      ),
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: 'Plan Advisor', body: event.data?.text() ?? 'You have a new notification.' };
  }

  const title = data.title ?? 'Plan Advisor';
  const options = {
    body: data.body ?? 'You have a new price alert.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'price-alert',          // replaces previous notification of same tag
    renotify: true,
    data: { url: data.url ?? '/' },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing tab if one is open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
