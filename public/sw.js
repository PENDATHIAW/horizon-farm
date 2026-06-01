const CACHE_NAME = 'horizon-farm-v3';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/brand-logo.png', '/brand-icon-192.png', '/brand-icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;
  if (new URL(request.url).hostname.includes('supabase.co')) return;

  event.respondWith(
    caches.match(request).then((cached) =>
      cached ||
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    )
  );
});

function resolvePushPayload(event) {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Alerte Horizon Farm', body: event.data ? event.data.text() : '' };
  }

  if (payload.title && payload.body) return payload;

  // Fallback : récupérer la dernière alerte urgente/critiques (si jamais un push générique arrive).
  return fetch('/api/push/latest-alert', { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : null))
    .then((latest) => {
      if (latest?.ok && latest.title && latest.body) return latest;
      return {
        title: '🚨 Alerte Horizon Farm',
        body: 'Une alerte nécessite votre attention.\nAction : ouvrir Horizon Farm.',
        module: 'alertes',
        url: '/?module=alertes',
        tag: 'horizon-farm-alert',
        requireInteraction: true,
      };
    })
    .catch(() => ({
      title: '🚨 Alerte Horizon Farm',
      body: 'Une alerte nécessite votre attention.\nAction : ouvrir Horizon Farm.',
      module: 'alertes',
      url: '/?module=alertes',
      tag: 'horizon-farm-alert',
      requireInteraction: true,
    }));
}

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    const resolved = await resolvePushPayload(event);
    const payload = resolved || {};

    const title = payload.title || '🚨 Alerte Horizon Farm';
    const options = {
      body: payload.body || 'Une alerte nécessite votre attention.\nAction : ouvrir Horizon Farm.',
      icon: payload.icon || '/brand-icon-192.png',
      badge: payload.badge || '/brand-icon-192.png',
      tag: payload.tag || payload.alert_id || payload.alert_dedupe_key || payload.dedupe_key || 'horizon-farm-alert',
      renotify: Boolean(payload.renotify),
      requireInteraction: payload.requireInteraction !== false,
      data: {
        url: payload.url || `/?module=${payload.module || 'alertes'}`,
        module: payload.module || 'alertes',
        module_source: payload.module_source || payload.module || 'alertes',
        alert_id: payload.alert_id || '',
        entity_type: payload.entity_type || '',
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
    }),
  );
});
