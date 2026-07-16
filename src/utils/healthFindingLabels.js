const arr = (value) => (Array.isArray(value) ? value : []);
const low = (value) => String(value || '').trim().toLowerCase();
const isoDay = (value) => String(value || '').match(/\d{4}-\d{2}-\d{2}/)?.[0] || '';
const dayOffset = (referenceDate, offset) => {
  const date = new Date(referenceDate);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

const INTERNAL_DIAGNOSTIC_TITLE = /^(récursion ux formulaire|recursion ux formulaire|doublons fonctionnels|module sans onglets cibles)/i;
const SEASONAL_TITLE = /\b(tabaski|korité|korite|ramadan|magal|gamou|fin d['’ ]année)\b/i;
const STALE_STRATEGY_TITLE = /^lancement suspendu\b/i;

/** Retire un préfixe répété (« Tâche critique : Tâche critique : … » → libellé de base). */
export function stripRepeatedPrefix(value = '', prefix = '') {
  const normalizedPrefix = String(prefix || '').trim().toLowerCase();
  if (!normalizedPrefix) return String(value || '').trim();

  let text = String(value || '').trim();
  const needle = `${normalizedPrefix} :`;

  while (text.toLowerCase().startsWith(needle)) {
    text = text.slice(needle.length).trim();
  }

  return text || String(value || '').trim();
}

export function formatFindingLabel(prefix, value = '') {
  return `${prefix} : ${stripRepeatedPrefix(value, prefix)}`;
}

/** Libellé de base sans préfixes IA répétés. */
export function sanitizeHealthTaskTitle(value = '') {
  let title = stripRepeatedPrefix(String(value || '').trim(), 'Tâche critique');
  title = stripRepeatedPrefix(title, 'Preuve manquante');
  return title.trim();
}

const HEALTH_MIRROR_TITLE = /^(tâche critique|preuve manquante)\s*:/i;

/** Tâche générée par le Health Engine - ne pas re-traiter comme nouvelle anomalie. */
export function isHealthEngineMirrorTask(task = {}) {
  if (String(task.source_module || '') === 'erp_health_engine') return true;
  if (String(task.source_module || '') === 'alertes' && String(task.source_record_id || '').startsWith('alert-')) return true;
  if (String(task.source_record_id || '').startsWith('task-critical-')) return true;
  if (String(task.source_record_id || '').startsWith('finance-no-proof-')) return true;
  if (String(task.action_key || '').startsWith('task-critical-')) return true;
  if (String(task.task_dedupe_key || '').startsWith('finance-no-proof-')) return true;

  const title = String(task.title || '');
  if (/^(Tâche critique\s*:){2,}/i.test(title)) return true;
  if (/^(Preuve manquante\s*:){2,}/i.test(title)) return true;
  if (HEALTH_MIRROR_TITLE.test(title) && String(task.source_module || '') !== 'taches') return true;

  return false;
}

export function shouldSkipCriticalTaskFinding(task = {}) {
  if (isHealthEngineMirrorTask(task)) return true;
  const title = String(task.title || '').trim().toLowerCase();
  if (title.startsWith('tâche critique :')) return true;
  if (title.startsWith('preuve manquante :')) return true;
  return false;
}

const CLOSED_TASK_STATUSES = new Set(['termine', 'terminé', 'done', 'closed', 'resolu', 'résolu', 'annule', 'annulé', 'expiree', 'expirée', 'traitee', 'traitée']);
const CLOSED_ALERT_STATUSES = new Set(['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'expiree', 'expirée', 'done', 'closed']);

export function isOpenTaskStatus(task = {}) {
  return !CLOSED_TASK_STATUSES.has(low(task.status || task.statut));
}

export function isOpenAlertStatus(alert = {}) {
  return !CLOSED_ALERT_STATUSES.has(low(alert.status || alert.statut));
}

export function isInternalDiagnosticRecord(record = {}) {
  const categories = [record.category, record.entity_type, record.origin_type].map(low);
  return categories.includes('audit_erp')
    || categories.includes('surveillance_ux')
    || INTERNAL_DIAGNOSTIC_TITLE.test(String(record.title || record.titre || ''));
}

export function isStaleSeasonalRecord(record = {}, referenceDate = new Date()) {
  const title = String(record.title || record.titre || '');
  if (!SEASONAL_TITLE.test(title)) return false;
  const deadline = isoDay(record.expires_at || record.target_date || record.event_date || record.due_date);
  return Boolean(deadline && deadline < new Date(referenceDate).toISOString().slice(0, 10));
}

export function isStaleGeneratedStrategyRecord(record = {}, referenceDate = new Date()) {
  if (!STALE_STRATEGY_TITLE.test(String(record.title || record.titre || ''))) return false;
  const generated = /centre_decisionnel|centre_strategique|erp_health_engine|alertes|team-ferme/i.test([
    record.source_module,
    record.module_source,
    record.module_lie,
    record.entity_type,
    record.task_dedupe_key,
    record.alert_dedupe_key,
    record.assigned_to,
  ].filter(Boolean).join(':'));
  const created = isoDay(record.due_date || record.created_at || record.event_date);
  return generated && Boolean(created && created < dayOffset(referenceDate, -7));
}

export function isObsoleteOperationalRecord(record = {}, referenceDate = new Date()) {
  return isInternalDiagnosticRecord(record)
    || isStaleSeasonalRecord(record, referenceDate)
    || isStaleGeneratedStrategyRecord(record, referenceDate);
}

/** Tâche miroir IA ou bruit Health Engine - exclure des compteurs et priorités terrain. */
export function isHealthMirrorNoiseTask(task = {}) {
  if (isHealthEngineMirrorTask(task)) return true;

  const title = String(task.title || '').trim();
  if (HEALTH_MIRROR_TITLE.test(title)) return true;
  if (isInternalDiagnosticRecord(task)) return true;

  return false;
}

export function filterRealOpenTasks(tasks = []) {
  return arr(tasks).filter((task) => isOpenTaskStatus(task)
    && !isHealthMirrorNoiseTask(task)
    && !isObsoleteOperationalRecord(task));
}

export function filterRealOpenAlerts(alerts = []) {
  return arr(alerts).filter((alert) => isOpenAlertStatus(alert)
    && !isObsoleteOperationalRecord(alert));
}

export function formatTaskTitleForDisplay(task = {}, maxLen = 80) {
  const title = sanitizeHealthTaskTitle(task.title || task.nom || task.id || '');
  if (title.length <= maxLen) return title;
  return `${title.slice(0, Math.max(0, maxLen - 1))}…`;
}

export function hasOpenTaskForHealthFinding(tasks = [], finding = {}) {
  const key = finding?.id;
  const relatedId = finding?.source_records?.[0]?.id;
  const findingBase = sanitizeHealthTaskTitle(finding?.title || '').toLowerCase();
  if (!key && !relatedId && !findingBase) return false;

  return arr(tasks).some((task) => {
    if (['termine', 'terminé', 'done', 'closed', 'resolu', 'résolu'].includes(String(task.status || task.statut || '').toLowerCase())) {
      return false;
    }
    if (key && (task.source_record_id === key || task.action_key === key || task.task_dedupe_key === key)) {
      return true;
    }
    if (relatedId && String(task.related_id) === String(relatedId) && ['erp_health_engine', 'alertes', 'finances'].includes(String(task.source_module || ''))) {
      return true;
    }
    if (findingBase && sanitizeHealthTaskTitle(task.title || '').toLowerCase() === findingBase) {
      return true;
    }
    return false;
  });
}
