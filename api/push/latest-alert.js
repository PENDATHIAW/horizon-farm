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

const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const closedStatuses = ['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done', 'closed'];

function normalizeAlert(row = {}) {
  const severity = lower(row.severity || row.gravite || 'critique') || 'critique';
  const prefix = severity === 'urgence' ? '🚨 Urgence' : '⚠️ Alerte critique';
  const rawTitle = clean(row.title || row.titre || row.nom) || 'Horizon Farm';
  const message = clean(row.message || row.description || 'Une action est nécessaire.');
  const action = clean(row.action_recommandee || row.action || row.recommandation || 'Vérifier dans Horizon Farm.');
  const moduleName = clean(row.module_source || row.module || 'alertes');
  const entityId = clean(row.entity_id || row.related_id || row.id || '');
  return {
    ok: true,
    id: row.id || entityId || `alert-${Date.now()}`,
    title: `${prefix} — ${rawTitle}`,
    body: `${message}${action ? `\nAction : ${action}` : ''}`,
    severity,
    module: moduleName,
    alert_id: row.id || '',
    entity_id: entityId,
    tag: row.id || entityId || `horizon-farm-${severity}`,
    url: `/?module=${moduleName || 'alertes'}`,
    requireInteraction: severity === 'urgence' || severity === 'critique',
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const supabase = await getSupabaseAdmin();
    if (!supabase) {
      return json(res, 200, {
        ok: true,
        title: '🚨 Urgence — Horizon Farm',
        body: 'Une urgence nécessite votre attention.\nAction : ouvrir Horizon Farm.',
        severity: 'urgence',
        module: 'alertes',
        tag: 'horizon-farm-urgence',
        url: '/?module=alertes',
        requireInteraction: true,
        fallback: true,
      });
    }

    const { data, error } = await supabase
      .from('alertes_center')
      .select('*')
      .in('severity', ['urgence', 'critique'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !Array.isArray(data)) {
      return json(res, 200, {
        ok: true,
        title: '⚠️ Alerte critique — Horizon Farm',
        body: 'Une alerte critique est disponible.\nAction : ouvrir le Centre Alertes.',
        severity: 'critique',
        module: 'alertes',
        tag: 'horizon-farm-critique',
        url: '/?module=alertes',
        requireInteraction: true,
        fallback: true,
        warning: error?.message,
      });
    }

    const active = data.find((row) => !closedStatuses.includes(lower(row.status || row.statut)));
    if (!active) return json(res, 200, { ok: false, reason: 'no_active_critical_alert' });
    return json(res, 200, normalizeAlert(active));
  } catch (error) {
    return json(res, 200, {
      ok: true,
      title: '🚨 Urgence — Horizon Farm',
      body: 'Une alerte nécessite votre attention.\nAction : ouvrir Horizon Farm.',
      severity: 'urgence',
      module: 'alertes',
      tag: 'horizon-farm-urgence',
      url: '/?module=alertes',
      requireInteraction: true,
      fallback: true,
      error: error.message,
    });
  }
}
