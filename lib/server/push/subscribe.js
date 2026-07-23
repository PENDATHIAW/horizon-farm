import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedPushUser } from './auth.js';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function isValidSubscription(subscription = {}) {
  return Boolean(subscription.endpoint && subscription.keys?.p256dh && subscription.keys?.auth);
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const user = await getAuthenticatedPushUser(req);
    if (!user) return json(res, 401, { ok: false, error: 'Votre session a expiré.' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (!isValidSubscription(body.subscription)) {
      return json(res, 400, { ok: false, error: 'Cet appareil ne peut pas recevoir de notifications.' });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) return json(res, 503, { ok: false, error: 'Les notifications ne sont pas disponibles pour le moment.' });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const record = {
      user_id: user.id,
      label: body.label || 'Appareil Horizon Farm',
      role: profile?.role || '',
      channels: Array.isArray(body.channels) ? body.channels : ['urgence', 'critique'],
      endpoint: body.subscription.endpoint,
      subscription: body.subscription,
      active: true,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('push_subscriptions').upsert(record, { onConflict: 'endpoint' });
    if (error) return json(res, 502, { ok: false, error: 'Cet appareil n’a pas pu être enregistré.' });
    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('push-subscribe', error);
    return json(res, 500, { ok: false, error: 'Cet appareil n’a pas pu être enregistré.' });
  }
}
