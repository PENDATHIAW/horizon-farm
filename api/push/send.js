import crypto from 'node:crypto';

const memoryStore = globalThis.__HORIZON_FARM_PUSH_SUBSCRIPTIONS__ || [];
globalThis.__HORIZON_FARM_PUSH_SUBSCRIPTIONS__ = memoryStore;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function base64UrlDecode(value = '') {
  const base64 = String(value).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64 + '='.repeat((4 - (base64.length % 4)) % 4), 'base64');
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
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

function createVapidJwt(endpoint, publicKey, privateKey, subject) {
  const audience = new URL(endpoint).origin;
  const publicBytes = base64UrlDecode(publicKey);
  const privateBytes = base64UrlDecode(privateKey);
  if (publicBytes.length !== 65 || publicBytes[0] !== 4) throw new Error('VAPID public key invalid');
  if (privateBytes.length !== 32) throw new Error('VAPID private key invalid');

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: base64UrlEncode(publicBytes.subarray(1, 33)),
    y: base64UrlEncode(publicBytes.subarray(33, 65)),
    d: base64UrlEncode(privateBytes),
  };
  const keyObject = crypto.createPrivateKey({ key: jwk, format: 'jwk' });
  const header = base64UrlEncode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = base64UrlEncode(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: subject }));
  const input = `${header}.${payload}`;
  const signature = crypto.sign('sha256', Buffer.from(input), { key: keyObject, dsaEncoding: 'ieee-p1363' });
  return `${input}.${base64UrlEncode(signature)}`;
}

async function sendNativeTriggerPush(record, vapid) {
  const endpoint = record?.subscription?.endpoint;
  if (!endpoint) return { ok: false, reason: 'missing_endpoint' };
  const token = createVapidJwt(endpoint, vapid.publicKey, vapid.privateKey, vapid.subject);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      TTL: '3600',
      Urgency: vapid.severity === 'urgence' ? 'high' : 'normal',
      Authorization: `vapid t=${token}, k=${vapid.publicKey}`,
    },
  });
  return { ok: response.status === 201 || response.status === 200 || response.status === 202, status: response.status };
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

    if (!publicKey || !privateKey) {
      return json(res, 200, {
        ok: true,
        simulated: true,
        sent: 0,
        total: records.length,
        storage: supabaseRecords.length ? 'supabase' : 'memory_or_local',
        reason: 'vapid_keys_missing',
        message: 'Clés VAPID manquantes. Les notifications locales/PWA restent disponibles.',
      });
    }

    if (!records.length) return json(res, 200, { ok: true, sent: 0, message: 'No push subscriptions' });

    const results = await Promise.allSettled(records.map((record) => sendNativeTriggerPush(record, { publicKey, privateKey, subject, severity })));
    const sent = results.filter((item) => item.status === 'fulfilled' && item.value?.ok).length;
    const failed = results.length - sent;
    return json(res, 200, {
      ok: true,
      simulated: false,
      native: true,
      sent,
      failed,
      total: results.length,
      note: 'Native Web Push trigger sent. Payload is generic unless encrypted payload support is added later.',
    });
  } catch (error) {
    return json(res, 200, { ok: true, simulated: true, sent: 0, error: error.message || 'Push send simulated after error' });
  }
}
