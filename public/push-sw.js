async function resolvePushPayload(event) {
  let payload;
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Alerte Horizon Farm', body: event.data ? event.data.text() : '' };
  }

  if (payload.title && payload.body) return payload;

  try {
    const response = await fetch('/api/push/latest-alert', { cache: 'no-store' });
    if (response.ok) {
      const latest = await response.json();
      if (latest?.ok && latest.title && latest.body) return latest;
    }
  } catch {
    // Fallback ci-dessous.
  }

  return {
    title: payload.title || '🚨 Alerte Horizon Farm',
    body: payload.body || 'Une alerte nécessite votre attention.\nAction : ouvrir Horizon Farm.',
    module: payload.module || 'alertes',
    url: payload.url || '/?module=alertes',
    tag: payload.tag || 'horizon-farm-alert',
    requireInteraction: true,
  };
}

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    const payload = await resolvePushPayload(event);
    const title = payload.title || '🚨 Alerte Horizon Farm';
    const options = {
      body: payload.body || 'Une alerte nécessite votre attention.\nAction : ouvrir Horizon Farm.',
      icon: payload.icon || '/favicon.ico',
      badge: payload.badge || '/favicon.ico',
      tag: payload.tag || payload.alert_id || 'horizon-farm-alert',
      renotify: Boolean(payload.renotify),
      requireInteraction: payload.requireInteraction !== false,
      data: {
        url: payload.url || `/?module=${payload.module || 'alertes'}`,
        module: payload.module || 'alertes',
        alert_id: payload.alert_id || '',
        entity_id: payload.entity_id || '',
        severity: payload.severity || 'critique',
      },
      actions: [
        { action: 'open', title: 'Ouvrir' },
        { action: 'close', title: 'Fermer' },
      ],
    };

    await self.registration.showNotification(title, options);
  })());
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
