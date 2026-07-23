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

function resolveActionTarget(row = {}) {
  const text = lower(`${row.title || ''} ${row.message || ''} ${row.action_recommandee || ''} ${row.entity_type || ''} ${row.module_source || ''}`);
  const source = lower(row.module_source || row.module || row.entity_type || 'alertes');

  if (text.includes('stock') || text.includes('réappro') || text.includes('reappro') || text.includes('commander')) {
    return { module: 'stock', action: 'reapprovisionnement', focus: 'stock_critique' };
  }
  if (text.includes('créance') || text.includes('creance') || text.includes('relancer') || text.includes('impay')) {
    return { module: 'clients', action: 'relance_creance', focus: 'client_a_relancer' };
  }
  if (text.includes('fournisseur') || text.includes('achat') || text.includes('commande fournisseur')) {
    return { module: 'fournisseurs', action: 'contacter_fournisseur', focus: 'achat_reapprovisionnement' };
  }
  if (text.includes('mortalité') || text.includes('mortalite') || text.includes('biosécurité') || text.includes('biosecurite') || text.includes('lot')) {
    return { module: 'avicole', action: 'suivi_sante_biosecurite', focus: 'lot_a_risque' };
  }
  if (text.includes('animal') || text.includes('malade') || text.includes('vétérinaire') || text.includes('veterinaire')) {
    return { module: 'sante', action: 'suivi_sante', focus: 'animal_malade' };
  }
  if (text.includes('culture') || text.includes('récolte') || text.includes('recolte') || text.includes('perdue')) {
    return { module: 'cultures', action: 'correction_culture', focus: 'culture_a_risque' };
  }
  if (text.includes('capteur') || text.includes('offline') || text.includes('smart')) {
    return { module: 'smartfarm', action: 'verifier_capteur', focus: 'capteur_offline' };
  }
  if (text.includes('équipement') || text.includes('equipement') || text.includes('panne') || text.includes('maintenance')) {
    return { module: 'equipements', action: 'maintenance', focus: 'equipement_a_traiter' };
  }

  return { module: source || 'alertes', action: 'ouvrir_alerte', focus: 'alerte' };
}

function buildUrl(target = {}, row = {}) {
  const params = new URLSearchParams();
  params.set('module', target.module || 'alertes');
  params.set('action', target.action || 'ouvrir_alerte');
  if (target.focus) params.set('focus', target.focus);
  if (row.id) params.set('alert_id', row.id);
  if (row.entity_id || row.related_id) params.set('entity_id', row.entity_id || row.related_id);
  return `/?${params.toString()}`;
}

function normalizeAlert(row = {}) {
  const severity = lower(row.severity || row.gravite || 'critique') || 'critique';
  const prefix = severity === 'urgence' ? '🚨 Urgence' : '⚠️ Alerte critique';
  const rawTitle = clean(row.title || row.titre || row.nom) || 'Horizon Farm';
  const message = clean(row.message || row.description || 'Une action est nécessaire.');
  const actionText = clean(row.action_recommandee || row.action || row.recommandation || 'Vérifier dans Horizon Farm.');
  const target = resolveActionTarget(row);
  const entityId = clean(row.entity_id || row.related_id || row.id || '');
  const url = buildUrl(target, row);

  return {
    ok: true,
    id: row.id || entityId || `alert-${Date.now()}`,
    title: `${prefix} — ${rawTitle}`,
    body: `${message}${actionText ? `\nAction : ${actionText}` : ''}`,
    severity,
    module: target.module,
    action: target.action,
    focus: target.focus,
    alert_id: row.id || '',
    entity_id: entityId,
    tag: row.id || entityId || `horizon-farm-${severity}`,
    url,
    requireInteraction: severity === 'urgence' || severity === 'critique',
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Method not allowed' });
  const authorization = checkCronAuthorization(req);
  if (!authorization.ok) return json(res, authorization.status, { ok: false, error: authorization.error });
  try {
    const supabase = await getSupabaseAdmin();
    if (!supabase) {
      return json(res, 503, { ok: false, error: 'Le service de notifications n’est pas disponible.' });
    }

    const { data, error } = await supabase
      .from('alertes_center')
      .select('*')
      .in('severity', ['urgence', 'critique'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !Array.isArray(data)) {
      return json(res, 502, { ok: false, error: 'Les alertes n’ont pas pu être lues.' });
    }

    const active = data.find((row) => !closedStatuses.includes(lower(row.status || row.statut)));
    if (!active) return json(res, 200, { ok: false, reason: 'no_active_critical_alert' });
    return json(res, 200, normalizeAlert(active));
  } catch (error) {
    console.error('latest-alert', error);
    return json(res, 500, { ok: false, error: 'Les alertes n’ont pas pu être lues.' });
  }
}
import { checkCronAuthorization } from './auth.js';
