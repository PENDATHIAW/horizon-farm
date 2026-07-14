const arr = (value) => (Array.isArray(value) ? value : []);

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

const CLOSED_TASK_STATUSES = new Set(['termine', 'terminé', 'done', 'closed', 'resolu', 'résolu', 'annule', 'annulé', 'traitee', 'traitée']);

export function isOpenTaskStatus(task = {}) {
  return !CLOSED_TASK_STATUSES.has(String(task.status || task.statut || '').toLowerCase());
}

/** Tâche miroir IA ou bruit Health Engine - exclure des compteurs et priorités terrain. */
export function isHealthMirrorNoiseTask(task = {}) {
  if (isHealthEngineMirrorTask(task)) return true;

  const title = String(task.title || '').trim();
  if (HEALTH_MIRROR_TITLE.test(title)) return true;

  return false;
}

export function filterRealOpenTasks(tasks = []) {
  return arr(tasks).filter((task) => isOpenTaskStatus(task) && !isHealthMirrorNoiseTask(task));
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
