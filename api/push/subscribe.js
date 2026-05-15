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

async function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  try {
    const mod = await import('@supabase/supabase-js');
    return mod.createClient(url, serviceKey, { auth: { persistSession: false } });
  } catch {
    return null;
  }
}

function toRecord(body = {}) {
  return {
    user_id: body.userId || body.user_id || 'owner',
    label: body.label || 'Appareil Horizon Farm',
    channels: Array.isArray(body.channels) ? body.channels : ['urgence', 'critique'],
    endpoint: body.subscription.endpoint,
    subscription: body.subscription,
    active: true,
    updated_at: new Date().toISOString(),
  };
}

function saveInMemory(record) {
  const payload = {
    id: record.id || `push-${Date.now()}`,
    userId: record.user_id || 'owner',
    label: record.label,
    channels: record.channels,
    subscription: record.subscription,
    created_at: new Date().toISOString(),
    updated_at: record.updated_at,
  };
  const existingIndex = memoryStore.findIndex((item) => item.subscription?.endpoint === payload.subscription.endpoint);
  if (existingIndex >= 0) memoryStore[existingIndex] = { ...memoryStore[existingIndex], ...payload };
  else memoryStore.push(payload);
  return payload;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (!isValidSubscription(body.subscription)) return json(res, 400, { ok: false, error: 'Invalid push subscription' });

    const record = toRecord(body);
    const supabase = await getSupabaseAdmin();
    if (supabase) {
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(record, { onConflict: 'endpoint' });
      if (!error) return json(res, 200, { ok: true, storage: 'supabase' });
      saveInMemory(record);
      return json(res, 200, { ok: true, storage: 'memory_fallback', warning: error.message });
    }

    saveInMemory(record);
    return json(res, 200, { ok: true, storage: 'memory', count: memoryStore.length });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || 'Subscribe failed' });
  }
}
