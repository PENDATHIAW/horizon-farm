const norm = (value = '') => String(value || '').trim().toLowerCase().replace(/\s+/g, '_');

/** Identifiant stable pour regrouper alertes, tâches et suggestions sur le même sujet. */
export function buildIssueKey(domain = 'general', sourceModule = 'system', sourceRecordId = 'unknown', kind = 'default') {
  return [norm(domain), norm(sourceModule), norm(sourceRecordId), norm(kind)].join(':');
}

export function issueKeyFromFinding(finding = {}) {
  const record = finding.source_records?.[0] || {};
  return finding.issue_key
    || buildIssueKey(
      finding.category || finding.type || finding.module || 'audit',
      finding.module || record.type || 'erp',
      record.id || finding.id || 'unknown',
      finding.id || 'finding',
    );
}

export function issueKeyFromAlert(alert = {}) {
  return alert.issue_key
    || buildIssueKey(
      alert.alert_type || alert.type || alert.entity_type || 'alert',
      alert.module_source || alert.source_module || 'activite_suivi',
      alert.entity_id || alert.source_record_id || alert.id || 'unknown',
      alert.title || 'open',
    );
}

export function issueKeyFromTask(task = {}) {
  return task.issue_key
    || buildIssueKey(
      task.task_type || task.type || 'task',
      task.module_lie || task.source_module || 'activite_suivi',
      task.source_record_id || task.linked_alert_id || task.id || 'unknown',
      task.title || 'open',
    );
}

export function dedupeByIssueKey(items = [], resolver = issueKeyFromFinding) {
  const map = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const key = resolver(item);
    if (!map.has(key)) map.set(key, item);
  });
  return [...map.values()];
}
