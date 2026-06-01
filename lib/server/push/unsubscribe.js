function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

const memoryStore = globalThis.__HORIZON_FARM_PUSH_SUBSCRIPTIONS__ || [];
globalThis.__HORIZON_FARM_PUSH_SUBSCRIPTIONS__ = memoryStore;

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const endpoint = String(body?.endpoint || body?.subscription?.endpoint || '').trim();
    if (!endpoint) return json(res, 400, { ok: false, error: 'Missing endpoint' });

    // Fallback mémoire
    const idx = memoryStore.findIndex((r) => r?.subscription?.endpoint === endpoint || r?.endpoint === endpoint);
    if (idx >= 0) memoryStore[idx] = { ...memoryStore[idx], active: false };

    const supabase = await getSupabaseAdmin();
    if (!supabase) return json(res, 200, { ok: true, unsubscribed: true, storage: 'memory_no_supabase' });

    const { error } = await supabase.from('push_subscriptions').update({ active: false }).eq('endpoint', endpoint);
    if (error) return json(res, 200, { ok: true, unsubscribed: false, storage: 'supabase', error: error.message });

    return json(res, 200, { ok: true, unsubscribed: true, storage: 'supabase' });
  } catch (error) {
    return json(res, 200, { ok: true, unsubscribed: false, error: error?.message || 'unsubscribe_failed' });
  }
}

