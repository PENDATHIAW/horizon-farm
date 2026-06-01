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

  // Familles prioritaires (supporte warning si le “type” est important)
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

function computeIssueTag(alert = {}) {
  // issue_key → alert_dedupe_key → dedupe_key → fallback
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

  // fallback
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
  if (!authorized(req)) return json(res, 401, { ok: false, error: 'Unauthorized' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const alertId = clean(body.alert_id || body.alertId || req.query?.alert_id || req.query?.alertId);
    if (!alertId) return json(res, 400, { ok: false, error: 'Missing alert_id' });

    const supabase = await getSupabaseAdmin();
    if (!supabase) return json(res, 200, { ok: true, dispatched: false, reason: 'missing_supabase_service_role' });

    const { data: alertRow } = await supabase
      .from('alertes_center')
      .select('*')
      .eq('id', alertId)
      .maybeSingle();

    if (!alertRow) return json(res, 200, { ok: true, dispatched: false, reason: 'alert_not_found' });
    if (!alertRow.push_notified_at && isImportantAlert(alertRow)) {
      // OK
    } else {
      return json(res, 200, { ok: true, dispatched: false, reason: 'not_eligible' });
    }

    const now = new Date();

    // Dedup récents
    const alreadyDeduped = await isDedupedRecently({ supabase, alert: alertRow, now });
    if (alreadyDeduped) return json(res, 200, { ok: true, dispatched: false, reason: 'deduped_recently' });

    const claimNowIso = now.toISOString();
    const { data: claimed, error: claimErr } = await supabase
      .from('alertes_center')
      .update({
        push_status: alertRow.push_status || 'queued',
        last_push_attempt_at: claimNowIso,
      })
      .eq('id', alertId)
      .is('push_notified_at', null)
      .select('*')
      .maybeSingle();

    if (claimErr) return json(res, 200, { ok: true, dispatched: false, reason: 'claim_failed', error: claimErr.message });
    if (!claimed) return json(res, 200, { ok: true, dispatched: false, reason: 'already_notified_by_another_worker' });

    const { buildNotificationPayloadFromAlert } = await import('../../../src/services/notificationPayloads.js');
    const payload = buildNotificationPayloadFromAlert(claimed);
    const severity = normalizeSeverity(claimed.severity || claimed.gravite || payload.severity);

    const { sendPushToSubscriptions } = await import('./sendToSubscriptions.js');
    const sendResult = await sendPushToSubscriptions({ payload, severity });

    if (sendResult?.simulated || (sendResult?.sent || 0) <= 0) {
      const nextError = sendResult?.reason ? clean(sendResult.reason) : 'send_failed';
      await supabase.from('alertes_center').update({
        push_status: 'error',
        push_error: nextError,
        push_notification_count: Number(claimed.push_notification_count || 0) + 1,
        last_push_attempt_at: claimNowIso,
      }).eq('id', claimed.id);
      return json(res, 200, { ok: true, dispatched: false, reason: 'send_failed', send: sendResult });
    }

    await supabase.from('alertes_center').update({
      push_status: 'sent',
      push_notified_at: claimNowIso,
      push_error: null,
      push_notification_count: Number(claimed.push_notification_count || 0) + 1,
      last_push_attempt_at: claimNowIso,
    }).eq('id', claimed.id);

    return json(res, 200, { ok: true, dispatched: true, alert_id: claimed.id, send: sendResult });
  } catch (error) {
    return json(res, 200, { ok: true, dispatched: false, error: error?.message || 'send_alert_failed' });
  }
}

