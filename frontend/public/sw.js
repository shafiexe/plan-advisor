/* Plan Advisor — Service Worker for Web Push notifications */

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
