self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Alerte Horizon Farm', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Alerte Horizon Farm';
  const options = {
    body: payload.body || 'Une alerte nécessite votre attention.',
    icon: payload.icon || '/favicon.ico',
    badge: payload.badge || '/favicon.ico',
    tag: payload.tag || payload.alert_id || 'horizon-farm-alert',
    renotify: Boolean(payload.renotify),
    requireInteraction: Boolean(payload.requireInteraction),
    data: {
      url: payload.url || '/',
      module: payload.module || 'alertes',
      alert_id: payload.alert_id || '',
      entity_id: payload.entity_id || '',
    },
    actions: [
      { action: 'open', title: 'Ouvrir Horizon Farm' },
      { action: 'close', title: 'Fermer' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;
  const data = event.notification.data || {};
  const targetUrl = data.url || `/?module=${data.module || 'alertes'}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'HORIZON_FARM_OPEN_ALERT', payload: data });
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
