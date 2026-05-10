const memoryStore = globalThis.__HORIZON_FARM_PUSH_SUBSCRIPTIONS__ || [];
globalThis.__HORIZON_FARM_PUSH_SUBSCRIPTIONS__ = memoryStore;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
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

async function loadWebPushSafely() {
  try {
    const mod = await import('web-push');
    return mod.default || mod;
  } catch {
    return null;
  }
}

async function loadSupabaseSubscriptions() {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id,user_id,label,channels,endpoint,subscription,active')
    .eq('active', true);
  if (error || !Array.isArray(data)) return [];
  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    label: row.label,
    channels: row.channels,
    subscription: row.subscription,
    storage: 'supabase',
  }));
}

function normalizeSubscriptions(body = {}, supabaseRecords = []) {
  const local = Array.isArray(body.localSubscriptions) ? body.localSubscriptions : [];
  const merged = [...supabaseRecords, ...memoryStore, ...local];
  const byEndpoint = new Map();
  merged.forEach((record) => {
    const endpoint = record?.subscription?.endpoint;
    if (endpoint) byEndpoint.set(endpoint, record);
  });
  return [...byEndpoint.values()];
}

function channelAllowed(record = {}, severity = 'info') {
  const channels = Array.isArray(record.channels) ? record.channels.map((item) => String(item).toLowerCase()) : [];
  if (!channels.length) return true;
  return channels.includes(String(severity || 'info').toLowerCase());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const severity = body.severity || 'info';
    const supabaseRecords = await loadSupabaseSubscriptions();
    const records = normalizeSubscriptions(body, supabaseRecords).filter((record) => channelAllowed(record, severity));
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
        storage: supabaseRecords.length ? 'supabase' : 'memory_or_local',
        reason: !webpush ? 'web_push_dependency_missing' : 'vapid_keys_missing',
        message: 'Push serveur non configuré. Les notifications locales/PWA restent disponibles.',
      });
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    if (!records.length) return json(res, 200, { ok: true, sent: 0, message: 'No push subscriptions' });

    const payload = JSON.stringify({
      title: body.title || 'Alerte Horizon Farm',
      body: body.body || body.message || 'Une alerte nécessite votre attention.',
      severity,
      module: body.module || body.module_source || 'alertes',
      alert_id: body.alert_id || body.id || '',
      entity_id: body.entity_id || '',
      tag: body.tag || body.alert_id || body.id || 'horizon-farm-alert',
      requireInteraction: Boolean(body.requireInteraction || severity === 'urgence'),
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
