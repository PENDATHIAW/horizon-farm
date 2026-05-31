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

/** Tâche générée par le Health Engine — ne pas re-traiter comme nouvelle anomalie. */
export function isHealthEngineMirrorTask(task = {}) {
  if (String(task.source_module || '') === 'erp_health_engine') return true;
  if (String(task.source_record_id || '').startsWith('task-critical-')) return true;
  if (String(task.source_record_id || '').startsWith('finance-no-proof-')) return true;
  if (String(task.action_key || '').startsWith('task-critical-')) return true;

  const title = String(task.title || '');
  if (/^(Tâche critique\s*:){2,}/i.test(title)) return true;
  if (/^(Preuve manquante\s*:){2,}/i.test(title)) return true;

  return false;
}

export function shouldSkipCriticalTaskFinding(task = {}) {
  if (isHealthEngineMirrorTask(task)) return true;
  if (String(task.title || '').trim().toLowerCase().startsWith('tâche critique :')) return true;
  return false;
}

const CLOSED_TASK_STATUSES = new Set(['termine', 'terminé', 'done', 'closed', 'resolu', 'résolu', 'annule', 'annulé', 'traitee', 'traitée']);

export function isOpenTaskStatus(task = {}) {
  return !CLOSED_TASK_STATUSES.has(String(task.status || task.statut || '').toLowerCase());
}

/** Tâche miroir IA ou bruit Health Engine — exclure des compteurs et priorités terrain. */
export function isHealthMirrorNoiseTask(task = {}) {
  if (isHealthEngineMirrorTask(task)) return true;
  if (String(task.source_module || '') === 'erp_health_engine') return true;

  const title = String(task.title || '').trim();
  if (/^tâche critique\s*:/i.test(title)) return true;
  if (/^preuve manquante\s*:/i.test(title) && String(task.source_module || '') === 'erp_health_engine') return true;

  return false;
}

export function filterRealOpenTasks(tasks = []) {
  return arr(tasks).filter((task) => isOpenTaskStatus(task) && !isHealthMirrorNoiseTask(task));
}

export function formatTaskTitleForDisplay(task = {}, maxLen = 80) {
  let title = stripRepeatedPrefix(String(task.title || task.nom || task.id || ''), 'Tâche critique');
  title = stripRepeatedPrefix(title, 'Preuve manquante');
  if (title.length <= maxLen) return title;
  return `${title.slice(0, Math.max(0, maxLen - 1))}…`;
}

export function hasOpenTaskForHealthFinding(tasks = [], finding = {}) {
  const key = finding?.id;
  const relatedId = finding?.source_records?.[0]?.id;
  if (!key && !relatedId) return false;

  return arr(tasks).some((task) => {
    if (['termine', 'terminé', 'done', 'closed', 'resolu', 'résolu'].includes(String(task.status || task.statut || '').toLowerCase())) {
      return false;
    }
    if (key && (task.source_record_id === key || task.action_key === key || task.task_dedupe_key === key)) {
      return true;
    }
    if (relatedId && String(task.related_id) === String(relatedId) && String(task.source_module) === 'erp_health_engine') {
      return true;
    }
    return false;
  });
}
