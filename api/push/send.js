const memoryStore = globalThis.__HORIZON_FARM_PUSH_SUBSCRIPTIONS__ || [];
globalThis.__HORIZON_FARM_PUSH_SUBSCRIPTIONS__ = memoryStore;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function normalizeSubscriptions(body = {}) {
  const local = Array.isArray(body.localSubscriptions) ? body.localSubscriptions : [];
  const merged = [...memoryStore, ...local];
  const byEndpoint = new Map();
  merged.forEach((record) => {
    const endpoint = record?.subscription?.endpoint;
    if (endpoint) byEndpoint.set(endpoint, record);
  });
  return [...byEndpoint.values()];
}

async function loadWebPushSafely() {
  try {
    const mod = await import('web-push');
    return mod.default || mod;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const records = normalizeSubscriptions(body);
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:contact@horizonfarm.app';
    const webpush = await loadWebPushSafely();

    if (!webpush || !publicKey || !privateKey) {
      return json(res, 200, {
        ok: true,
        simulated: true,
        sent: 0,
        total: records.length,
        reason: !webpush ? 'web_push_dependency_missing' : 'vapid_keys_missing',
        message: 'Push serveur non configuré. Les notifications locales/PWA restent disponibles.',
      });
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    if (!records.length) return json(res, 200, { ok: true, sent: 0, message: 'No push subscriptions' });

    const payload = JSON.stringify({
      title: body.title || 'Alerte Horizon Farm',
      body: body.body || body.message || 'Une alerte nécessite votre attention.',
      severity: body.severity || 'info',
      module: body.module || body.module_source || 'alertes',
      alert_id: body.alert_id || body.id || '',
      entity_id: body.entity_id || '',
      tag: body.tag || body.alert_id || body.id || 'horizon-farm-alert',
      requireInteraction: Boolean(body.requireInteraction || body.severity === 'urgence'),
      url: body.url || `/?module=${body.module || body.module_source || 'alertes'}`,
    });

    const results = await Promise.allSettled(records.map((record) => webpush.sendNotification(record.subscription, payload)));
    const sent = results.filter((item) => item.status === 'fulfilled').length;
    const failed = results.length - sent;
    return json(res, 200, { ok: true, simulated: false, sent, failed, total: results.length });
  } catch (error) {
    return json(res, 200, { ok: true, simulated: true, sent: 0, error: error.message || 'Push send simulated after error' });
  }
}
