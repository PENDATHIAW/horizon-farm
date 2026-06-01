import { resolveAlertTag } from '../../src/services/notificationPayloads.js';

const clean = (value) => String(value ?? '').trim();
const lower = (value) => clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const CLOSED_STATUSES = new Set(['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done', 'closed']);

export function isClosedAlertStatus(status) {
  if (!status) return false;
  return CLOSED_STATUSES.has(lower(status));
}

export function normalizeSeverity(severity = '') {
  const s = lower(severity);
  if (s === 'urgence' || s === 'critique') return s;
  if (s === 'warning' || s === 'avertissement') return 'warning';
  if (!s) return 'info';
  if (s.includes('urgence')) return 'urgence';
  if (s.includes('critique')) return 'critique';
  return s;
}

export function getAlertIssueKey(alert = {}) {
  // Règle demandée : issue_key → alert_dedupe_key → dedupe_key → fallback module_source+entity+action
  const tag = resolveAlertTag(alert);
  // resolveAlertTag renvoie aussi un fallback stable basé sur id/entity/ etc.
  return tag || `alert:${alert.id || 'unknown'}`;
}

function amountNumber(alert = {}) {
  const raw = alert.amount ?? alert.montant ?? alert.amount_value ?? 0;
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

function titleOrMessageIncludes(alert = {}, ...terms) {
  const haystack = lower(`${alert.title || ''} ${alert.message || ''} ${alert.action_recommandee || ''}`);
  return terms.some((t) => haystack.includes(lower(t)));
}

export function isPushEligibleForAlert(alert = {}) {
  const status = lower(alert.status || alert.statut);
  const severity = normalizeSeverity(alert.severity || alert.gravite);

  // Push uniquement pour alertes persistées et "nouvelle"
  if (status !== 'nouvelle') return false;
  if (alert.push_notified_at) return false;

  // Règle principale : critique/urgence
  if (severity === 'urgence' || severity === 'critique') return true;

  // Familles prioritaires (même si pas strictement critique/urgence)
  const moduleSource = lower(alert.module_source || alert.module || alert.source || '');

  // 1) Soin/vaccin imminent/en retard
  if (moduleSource === 'sante' && titleOrMessageIncludes(alert, 'soin a preparer', 'rappel', 'vaccin')) return true;

  // 2) Lot prêt à vendre
  if ((moduleSource === 'avicole' || moduleSource === 'animaux') && titleOrMessageIncludes(alert, 'pret a vendre', 'prêt a vendre', 'j+40', 'j+90')) return true;

  // 3) Capteur smart farm critique
  if (moduleSource === 'smartfarm' && titleOrMessageIncludes(alert, 'capteur', 'hors ligne', 'offline')) return true;

  // 4) Équipement critique en panne
  if (moduleSource === 'equipements' && titleOrMessageIncludes(alert, 'panne', 'maintenance')) return true;

  // 5) Créance / impayé (seuil)
  if ((moduleSource === 'finances' || moduleSource === 'clients') && titleOrMessageIncludes(alert, 'impaye', 'impa', 'creance', 'créance') && amountNumber(alert) >= 50000) return true;

  // 6) Justificatif manquant important (seuil)
  if ((moduleSource === 'documents' || moduleSource === 'documents_rapports') && titleOrMessageIncludes(alert, 'justificatif', 'preuve', 'facture') && amountNumber(alert) >= 50000) return true;

  // 7) Stock critique “familial” si jamais la sévérité est warning
  if (moduleSource === 'stock' && titleOrMessageIncludes(alert, 'stock critique', 'rupture', 'sous seuil')) return true;

  return false;
}

export async function isAlreadyDeducedRecently({ supabase, alert, sinceIso }) {
  // Dedup “par famille” côté serveur : on vérifie s’il existe déjà un push pour la même issueKey
  const key = getAlertIssueKey(alert);
  const status = lower(alert.status || alert.statut);
  if (!key || status !== 'nouvelle') return false;

  // On préfère interroger sur colonnes présentes : issue_key/alert_dedupe_key/dedupe_key si disponibles
  const alertDedupeKey = clean(alert.alert_dedupe_key);
  const dedupeKey = clean(alert.dedupe_key);
  const issueKey = clean(alert.issue_key);

  const query = supabase.from('alertes_center').select('id,push_notified_at').not('push_notified_at', 'is', null).limit(20);

  if (issueKey) {
    query.eq('issue_key', issueKey);
  } else if (alertDedupeKey) {
    query.eq('alert_dedupe_key', alertDedupeKey);
  } else if (dedupeKey) {
    query.eq('dedupe_key', dedupeKey);
  } else {
    // fallback : module_source + entity + action
    query.eq('module_source', alert.module_source || alert.module || '')
      .eq('entity_type', alert.entity_type || alert.entity_type || '')
      .eq('entity_id', alert.entity_id || '')
      .eq('action_recommandee', alert.action_recommandee || '');
  }

  const { data } = await query.gt('push_notified_at', sinceIso);
  return Array.isArray(data) && data.length > 0;
}

