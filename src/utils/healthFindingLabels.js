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
