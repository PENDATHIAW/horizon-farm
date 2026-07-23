import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedPushUser } from './auth.js';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
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
    const endpoint = String(body?.endpoint || body?.subscription?.endpoint || '').trim();
    if (!endpoint) return json(res, 400, { ok: false, error: 'Cet appareil est introuvable.' });

    const supabase = getSupabaseAdmin();
    if (!supabase) return json(res, 503, { ok: false, error: 'Les notifications ne sont pas disponibles pour le moment.' });

    const { error } = await supabase
      .from('push_subscriptions')
      .update({ active: false })
      .eq('endpoint', endpoint)
      .eq('user_id', user.id);
    if (error) return json(res, 502, { ok: false, error: 'Cet appareil n’a pas pu être désactivé.' });
    return json(res, 200, { ok: true, unsubscribed: true });
  } catch (error) {
    console.error('push-unsubscribe', error);
    return json(res, 500, { ok: false, error: 'Cet appareil n’a pas pu être désactivé.' });
  }
}
