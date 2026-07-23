import webpush from 'web-push';
import { selectRaciAudience } from './raciAudience.js';
import { checkCronAuthorization, getAuthenticatedPushUser } from './auth.js';

const memoryStore = globalThis.__HORIZON_FARM_PUSH_SUBSCRIPTIONS__ || [];
globalThis.__HORIZON_FARM_PUSH_SUBSCRIPTIONS__ = memoryStore;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
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

async function loadSupabaseSubscriptions(userId = '') {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return { supabase: null, records: [] };

  // select('*') : résilient si la colonne `role` n'est pas encore migrée
  // (on lit row.role si présent, sinon '').
  let query = supabase
    .from('push_subscriptions')
    .select('*')
    .eq('active', true);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;

  if (error || !Array.isArray(data)) return { supabase, records: [] };

  return {
    supabase,
    records: data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      label: row.label,
      role: row.role || '',
      channels: row.channels,
      endpoint: row.endpoint,
      subscription: row.subscription,
      storage: 'supabase',
    })),
  };
}

function channelAllowed(record = {}, severity = 'info') {
  const channels = Array.isArray(record.channels) ? record.channels.map((item) => String(item).toLowerCase()) : [];
  if (!channels.length) return true;
  return channels.includes(String(severity || 'info').toLowerCase());
}

function normalizeSubscriptions(body = {}, supabaseRecords = [], userId = '') {
  const local = Array.isArray(body.localSubscriptions) ? body.localSubscriptions : [];
  const memory = userId
    ? memoryStore.filter((record) => String(record.userId || record.user_id || '') === String(userId))
    : memoryStore;
  const localOwned = local.map((record) => ({ ...record, userId: userId || record.userId || record.user_id }));
  const merged = [...supabaseRecords, ...memory, ...localOwned];
  const byEndpoint = new Map();

  merged.forEach((record) => {
    const endpoint = record?.subscription?.endpoint || record?.endpoint;
    if (!endpoint) return;
    byEndpoint.set(endpoint, record);
  });

  return [...byEndpoint.values()];
}

async function deactivateSubscriptionIfNeeded({ supabase, record, error }) {
  if (!supabase || !record?.endpoint) return;
  const statusCode = error?.statusCode || error?.code;
  if (![404, 410].includes(Number(statusCode))) return;

  // Désactiver la subscription pour éviter les envois futurs.
  await supabase.from('push_subscriptions').update({ active: false }).eq('endpoint', record.endpoint);
}

export async function sendPushToSubscriptions({
  payload,
  severity = 'critique',
  localSubscriptions = undefined,
  audienceRecord = null,
  userId = '',
} = {}) {
  const { supabase, records: supabaseRecords } = await loadSupabaseSubscriptions(userId);

  const body = { localSubscriptions };
  let records = normalizeSubscriptions(body, supabaseRecords, userId).filter((record) => channelAllowed(record, severity));

  // Ciblage RACI optionnel : si l'événement porte une gouvernance, on restreint aux
  // appareils du/des rôle(s) concerné(s) ; repli sur tous si aucune correspondance.
  let audience = null;
  if (audienceRecord) {
    audience = selectRaciAudience(audienceRecord, records, { fallbackToAll: true });
    records = audience.subscriptions;
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:contact@horizonfarm.app';

  if (!publicKey || !privateKey) {
    return {
      ok: true,
      simulated: true,
      sent: 0,
      failed: 0,
      total: records.length,
      storage: supabaseRecords.length ? 'supabase' : 'memory_or_local',
      reason: 'vapid_keys_missing',
    };
  }

  // web-push attend des clés base64url (sans padding) — c’est ce que nos env fournissent en pratique.
  webpush.setVapidDetails(subject, publicKey, privateKey);

  if (!records.length) return { ok: true, sent: 0, failed: 0, total: 0 };

  const results = await Promise.allSettled(
    records.map(async (record) => {
      const subscription = record.subscription;
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        throw new Error('Invalid push subscription');
      }

      await webpush.sendNotification(subscription, JSON.stringify(payload));
      return { endpoint: record.endpoint, storage: record.storage || 'unknown', ok: true };
    }),
  );

  // Désactiver en cas 404/410
  await Promise.allSettled(
    results.map(async (r, i) => {
      if (r.status === 'fulfilled') return;
      await deactivateSubscriptionIfNeeded({ supabase, record: records[i], error: r.reason });
    }),
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.length - sent;

  return {
    ok: true,
    native: true,
    sent,
    failed,
    total: results.length,
    simulated: false,
    raci_audience: audience ? { roles: audience.roles, matched: audience.matched, fallback: audience.fallback } : null,
  };
}

// Utilisé par le route /api/push/send
export async function sendPayloadHandler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const cronAuthorization = checkCronAuthorization(req);
    const user = cronAuthorization.ok ? null : await getAuthenticatedPushUser(req);
    if (!cronAuthorization.ok && !user) return json(res, 401, { ok: false, error: 'Votre session a expiré.' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const payload = body.payload || {
      title: body.title,
      body: body.body || body.message || body.title,
      url: body.url,
      module: body.module,
      tag: body.tag,
      alert_id: body.alert_id,
      module_source: body.module_source,
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      renotify: body.renotify,
      requireInteraction: body.requireInteraction,
      icon: body.icon,
      badge: body.badge,
    };
    const severity = body.severity || 'critique';

    const result = await sendPushToSubscriptions({
      payload,
      severity,
      localSubscriptions: body.localSubscriptions,
      audienceRecord: cronAuthorization.ok ? body.audienceRecord || body.audience_record || null : null,
      userId: user?.id || '',
    });

    if (result?.simulated) {
      return json(res, 503, {
        ...result,
        ok: false,
        error: 'Les notifications ne sont pas encore configurées.',
      });
    }
    if (Number(result?.total || 0) > 0 && Number(result?.sent || 0) <= 0) {
      return json(res, 502, {
        ...result,
        ok: false,
        error: 'La notification n’a pas pu être envoyée.',
      });
    }
    return json(res, 200, result);
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || 'Push failed' });
  }
}
