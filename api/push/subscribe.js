const memoryStore = globalThis.__HORIZON_FARM_PUSH_SUBSCRIPTIONS__ || [];
globalThis.__HORIZON_FARM_PUSH_SUBSCRIPTIONS__ = memoryStore;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function isValidSubscription(subscription = {}) {
  return Boolean(subscription.endpoint && subscription.keys && subscription.keys.p256dh && subscription.keys.auth);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (!isValidSubscription(body.subscription)) return json(res, 400, { ok: false, error: 'Invalid push subscription' });

    const record = {
      id: body.id || `push-${Date.now()}`,
      userId: body.userId || 'owner',
      label: body.label || 'Appareil Horizon Farm',
      channels: Array.isArray(body.channels) ? body.channels : ['urgence', 'critique'],
      subscription: body.subscription,
      created_at: body.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const existingIndex = memoryStore.findIndex((item) => item.subscription?.endpoint === record.subscription.endpoint);
    if (existingIndex >= 0) memoryStore[existingIndex] = { ...memoryStore[existingIndex], ...record };
    else memoryStore.push(record);

    return json(res, 200, { ok: true, storage: 'memory', count: memoryStore.length });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || 'Subscribe failed' });
  }
}
