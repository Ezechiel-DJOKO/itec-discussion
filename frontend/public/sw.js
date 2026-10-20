// frontend/public/sw.js

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ÉCOUTE DES NOTIFICATIONS PUSH EN ARRIÈRE-PLAN (APP FERMÉE)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || '💬 ITEC Discuss';
    const options = {
      body: data.body || 'Nouveau message reçu',
      icon: '/logo.jpg',
      badge: '/logo.jpg',
      tag: data.tag || 'itec-chat-message',
      renotify: true,
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/dashboard/chat',
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Erreur traitement Push SW:', err);
  }
});

// CLIC SUR LA NOTIFICATION SUR L'ÉCRAN DU TÉLÉPHONE
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/dashboard/chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si l'onglet est déjà ouvert, le ramener au premier plan
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus();
        }
      }
      // Sinon ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});