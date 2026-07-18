const CACHE_NAME = 'horizon-farm-v11';
const APP_SHELL = ['/manifest.webmanifest', '/brand-icon-192.png', '/brand-icon-512.png', '/brand-logo.png'];

const isAssetRequest = (url) => /\/assets\//.test(url.pathname) || url.pathname.endsWith('.js') || url.pathname.endsWith('.css');

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.hostname.includes('supabase.co')) return;

  if (isAssetRequest(url)) {
    event.respondWith(fetch(request));
    return;
  }

  const isNavigation = request.mode === 'navigate'
    || request.destination === 'document'
    || (request.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// --- Notifications push (app fermée ou en arrière-plan) ---
// Sans ces gestionnaires, le service worker reçoit le message push mais
// n'affiche jamais rien : c'est la cause d'« aucune notification reçue ».

function readPushPayload(event) {
  if (!event.data) return {};
  try {
    return event.data.json();
  } catch {
    try {
      return { title: 'Horizon Farm', body: event.data.text() };
    } catch {
      return {};
    }
  }
}

self.addEventListener('push', (event) => {
  const payload = readPushPayload(event);
  const severity = String(payload.severity || 'info').toLowerCase();
  const title = payload.title || 'Alerte Horizon Farm';
  const body = payload.body || payload.message || '';
  const vibrate = ['urgence', 'critique'].includes(severity)
    ? (severity === 'urgence' ? [250, 120, 250, 120, 250] : [200, 100, 200])
    : undefined;

  const options = {
    body,
    icon: payload.icon || '/brand-icon-192.png',
    badge: payload.badge || '/brand-icon-192.png',
    tag: payload.tag || payload.alert_id || 'horizon-farm-alert',
    renotify: payload.renotify === true,
    requireInteraction: payload.requireInteraction === true || severity === 'urgence',
    vibrate,
    data: {
      url: payload.url || `/?module=${payload.module || payload.module_source || 'alertes'}`,
      module: payload.module || payload.module_source || 'alertes',
      module_source: payload.module_source || payload.module || '',
      action: payload.action || '',
      focus: payload.focus || '',
      alert_id: payload.alert_id || '',
      entity_type: payload.entity_type || '',
      entity_id: payload.entity_id || '',
      severity,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'HORIZON_FARM_OPEN_ALERT', payload: data });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    }),
  );
});
