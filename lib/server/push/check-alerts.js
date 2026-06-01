function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return token === secret || req.query?.secret === secret;
}

function clean(value) { return String(value ?? '').trim(); }
function lower(value) { return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
function normalizeSeverity(severity = '') {
  const s = lower(severity);
  if (s === 'urgence' || s === 'critique') return s;
  if (s.includes('urgence')) return 'urgence';
  if (s.includes('critique')) return 'critique';
  if (s.includes('warning') || s.includes('avert')) return 'warning';
  return s || 'info';
}

function isClosedAlertStatus(status) {
  return new Set(['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done', 'closed']).has(lower(status));
}

function amountNumber(alert = {}) {
  const raw = alert.amount ?? alert.montant ?? 0;
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

function titleOrMessageIncludes(alert = {}, ...terms) {
  const haystack = lower(`${alert.title || ''} ${alert.message || ''} ${alert.action_recommandee || ''}`);
  return terms.some((t) => haystack.includes(lower(t)));
}

function isImportantAlert(alert = {}) {
  const status = lower(alert.status || alert.statut);
  if (status !== 'nouvelle') return false;
  if (isClosedAlertStatus(alert.status || alert.statut)) return false;

  const severity = normalizeSeverity(alert.severity || alert.gravite);
  if (severity === 'urgence' || severity === 'critique') return true;

  const moduleSource = lower(alert.module_source || alert.module || '');

  // Familles prioritaires
  if (moduleSource === 'sante' && titleOrMessageIncludes(alert, 'soin a preparer', 'rappel', 'vaccin')) return true;
  if ((moduleSource === 'avicole' || moduleSource === 'animaux') && titleOrMessageIncludes(alert, 'pret a vendre', 'prêt a vendre', 'j+40', 'j+90')) return true;
  if (moduleSource === 'smartfarm' && titleOrMessageIncludes(alert, 'capteur', 'hors ligne', 'offline')) return true;
  if (moduleSource === 'equipements' && titleOrMessageIncludes(alert, 'panne', 'maintenance')) return true;
  if ((moduleSource === 'finances' || moduleSource === 'clients') && titleOrMessageIncludes(alert, 'impaye', 'impa', 'creance', 'créance') && amountNumber(alert) >= 50000) return true;
  if ((moduleSource === 'documents' || moduleSource === 'documents_rapports') && titleOrMessageIncludes(alert, 'justificatif', 'preuve', 'facture') && amountNumber(alert) >= 50000) return true;
  if (moduleSource === 'stock' && titleOrMessageIncludes(alert, 'stock critique', 'rupture', 'sous seuil')) return true;

  return false;
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

function issueTag(alert = {}) {
  return clean(alert.issue_key)
    || clean(alert.alert_dedupe_key)
    || clean(alert.dedupe_key)
    || clean(alert.id)
    || 'horizon-farm-alert';
}

async function isDedupedRecently({ supabase, alert, now }) {
  const sinceIso = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 60 minutes
  const alertDedupeKey = clean(alert.alert_dedupe_key);
  const dedupeKey = clean(alert.dedupe_key);

  if (alertDedupeKey) {
    const { data } = await supabase
      .from('alertes_center')
      .select('id,push_notified_at')
      .eq('alert_dedupe_key', alertDedupeKey)
      .not('push_notified_at', 'is', null)
      .gt('push_notified_at', sinceIso)
      .limit(1);
    return Array.isArray(data) && data.length > 0;
  }
  if (dedupeKey) {
    const { data } = await supabase
      .from('alertes_center')
      .select('id,push_notified_at')
      .eq('dedupe_key', dedupeKey)
      .not('push_notified_at', 'is', null)
      .gt('push_notified_at', sinceIso)
      .limit(1);
    return Array.isArray(data) && data.length > 0;
  }

  const { data } = await supabase
    .from('alertes_center')
    .select('id,push_notified_at')
    .eq('module_source', alert.module_source || alert.module || '')
    .eq('entity_type', alert.entity_type || '')
    .eq('entity_id', alert.entity_id || '')
    .eq('action_recommandee', alert.action_recommandee || '')
    .not('push_notified_at', 'is', null)
    .gt('push_notified_at', sinceIso)
    .limit(1);

  return Array.isArray(data) && data.length > 0;
}

async function claimAndSend({ supabase, alert, nowIso, now }) {
  // Pré-check
  if (!alert?.id) return { ok: true, skipped: true, reason: 'missing_alert_id' };
  if (alert.push_notified_at) return { ok: true, skipped: true, reason: 'already_notified' };
  if (!isImportantAlert(alert)) return { ok: true, skipped: true, reason: 'not_eligible' };

  // Dédoublonnage récent
  const deduped = await isDedupedRecently({ supabase, alert, now });
  if (deduped) return { ok: true, skipped: true, reason: 'deduped_recently' };

  // Claim atomique
  const { data: claimed } = await supabase
    .from('alertes_center')
    .update({ push_status: 'queued', last_push_attempt_at: nowIso })
    .eq('id', alert.id)
    .is('push_notified_at', null)
    .select('*')
    .maybeSingle();

  if (!claimed) return { ok: true, skipped: true, reason: 'already_claimed' };

  const { buildNotificationPayloadFromAlert } = await import('../../../src/services/notificationPayloads.js');
  const { sendPushToSubscriptions } = await import('./sendToSubscriptions.js');

  const payload = buildNotificationPayloadFromAlert(claimed);
  const severity = normalizeSeverity(claimed.severity || claimed.gravite || payload.severity);
  const sendResult = await sendPushToSubscriptions({ payload, severity });

  if (sendResult?.simulated || (sendResult?.sent || 0) <= 0) {
    await supabase.from('alertes_center').update({
      push_status: 'error',
      push_error: sendResult?.reason ? clean(sendResult.reason) : 'send_failed',
      push_notification_count: Number(claimed.push_notification_count || 0) + 1,
      last_push_attempt_at: nowIso,
    }).eq('id', claimed.id);
    return { ok: true, skipped: false, reason: 'send_failed', send: sendResult };
  }

  await supabase.from('alertes_center').update({
    push_status: 'sent',
    push_notified_at: nowIso,
    push_error: null,
    push_notification_count: Number(claimed.push_notification_count || 0) + 1,
    last_push_attempt_at: nowIso,
  }).eq('id', claimed.id);

  return { ok: true, skipped: false, reason: 'sent', send: sendResult };
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return json(res, 405, { ok: false, error: 'Method not allowed' });
  if (!authorized(req)) return json(res, 401, { ok: false, error: 'Unauthorized' });

  try {
    const supabase = await getSupabaseAdmin();
    if (!supabase) return json(res, 200, { ok: true, sent: 0, reason: 'missing_supabase_service_role' });

    const now = new Date();
    const nowIso = now.toISOString();

    // On charge “large” puis filtre côté serveur pour gérer la règle famille/threshold.
    const { data, error } = await supabase
      .from('alertes_center')
      .select('id,title,message,module_source,severity,status,action_recommandee,entity_type,entity_id,alert_dedupe_key,dedupe_key,amount,montant,created_at,push_notified_at,push_status')
      .eq('status', 'nouvelle')
      .is('push_notified_at', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !Array.isArray(data)) return json(res, 200, { ok: true, sent: 0, reason: error?.message || 'no_data' });

    const eligible = data.filter((a) => isImportantAlert(a));

    // Dedup “par situation” dans cette exécution : 1 alert max par tag.
    const byTag = new Map();
    eligible.forEach((a) => {
      const key = issueTag(a);
      const prev = byTag.get(key);
      if (!prev) byTag.set(key, a);
      else {
        const prevDate = new Date(prev.created_at || prev.createdAt || 0).getTime();
        const nextDate = new Date(a.created_at || a.createdAt || 0).getTime();
        if (nextDate >= prevDate) byTag.set(key, a);
      }
    });

    const candidates = [...byTag.values()].slice(0, 15);
    let sent = 0;
    let failed = 0;

    for (const alert of candidates) {
      const result = await claimAndSend({ supabase, alert, nowIso, now });
      if (result?.reason === 'sent') sent += 1;
      else if (result?.reason === 'send_failed') failed += 1;
    }

    return json(res, 200, { ok: true, sent, failed, total_checked: candidates.length });
  } catch (error) {
    return json(res, 200, { ok: true, sent: 0, error: error?.message || 'check_alerts_failed' });
  }
}

