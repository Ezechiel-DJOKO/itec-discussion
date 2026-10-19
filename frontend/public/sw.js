self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

// Affiche une bannière même app fermée (quand un push arrivera)
self.addEventListener('push', (event) => {
  let data = { title: 'ITEC Discuss', body: 'Nouveau message' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo.jpg',
      badge: '/logo.jpg',
      vibrate: [120, 60, 120],
      tag: 'itec-chat',
      renotify: true,
      data: { url: data.url || '/dashboard/chat' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard/chat';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes('/dashboard') && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});

self.addEventListener('fetch', () => {});