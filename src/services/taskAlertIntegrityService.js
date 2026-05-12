const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const todayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

export const closedTask = (task = {}) => ['termine', 'terminé', 'terminee', 'terminée', 'annule', 'annulé', 'annulee', 'annulée', 'done', 'closed'].includes(lower(task.status || task.statut));
export const closedAlert = (alert = {}) => ['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done', 'closed'].includes(lower(alert.status || alert.statut));
export const criticalAlert = (alert = {}) => ['urgence', 'critique', 'critical', 'danger'].includes(lower(alert.severity || alert.priorite || alert.priority));
export const criticalTask = (task = {}) => ['urgence', 'critique', 'critical', 'danger'].includes(lower(task.priority || task.priorite));
export const lateTask = (task = {}) => !closedTask(task) && (lower(task.status || task.statut) === 'retard' || (task.due_date && new Date(task.due_date) < todayStart()));

export function alertKey(alert = {}) {
  return `${alert.module_source || alert.module || 'alertes'}:${alert.entity_type || 'alerte'}:${alert.entity_id || alert.id}:${alert.action_recommandee || alert.title || alert.message || 'action'}`;
}

export function taskKey(task = {}) {
  return task.alert_dedupe_key || `${task.module_lie || task.source_module || 'alertes'}:${task.entity_type || 'alerte'}:${task.related_id || task.source_record_id || task.id}:${task.action_key || task.title || 'action'}`;
}

export function linkedTaskForAlert(tasks = [], alert = {}) {
  return arr(tasks).find((task) => String(task.source_record_id || '') === String(alert.id || '') || String(task.linked_alert_id || '') === String(alert.id || '') || taskKey(task) === alertKey(alert)) || null;
}

export function duplicateTaskIds(tasks = []) {
  const seen = new Map();
  const duplicates = new Set();
  arr(tasks).forEach((task) => {
    if (closedTask(task)) return;
    const key = taskKey(task);
    if (!key) return;
    if (seen.has(key)) { duplicates.add(task.id); duplicates.add(seen.get(key)); }
    else seen.set(key, task.id);
  });
  return duplicates;
}

export function analyzeTaskAlertIntegrity({ tasks = [], alerts = [] } = {}) {
  const issues = [];
  const dupIds = duplicateTaskIds(tasks);

  arr(alerts).forEach((alert) => {
    const task = linkedTaskForAlert(tasks, alert);
    if (!closedAlert(alert) && criticalAlert(alert) && !task) issues.push({ id: alert.id, type: 'Alerte critique sans tâche', alert, severity: 'danger' });
    if (closedAlert(alert) && task && !closedTask(task)) issues.push({ id: task.id, type: 'Alerte traitée mais tâche ouverte', task, alert, severity: 'warning' });
    if (!closedAlert(alert) && task && closedTask(task)) issues.push({ id: alert.id, type: 'Tâche terminée mais alerte ouverte', task, alert, severity: 'warning' });
  });

  arr(tasks).forEach((task) => {
    if (dupIds.has(task.id)) issues.push({ id: task.id, type: 'Tâche doublon potentielle', task, severity: 'warning' });
    if (!clean(task.module_lie || task.source_module) || !clean(task.related_id || task.source_record_id)) issues.push({ id: task.id, type: 'Tâche sans source claire', task, severity: 'warning' });
    if (lateTask(task)) issues.push({ id: task.id, type: 'Tâche en retard', task, severity: criticalTask(task) ? 'danger' : 'warning' });
    if (!closedTask(task) && criticalTask(task) && !clean(task.assigned_to || task.responsable)) issues.push({ id: task.id, type: 'Tâche critique sans responsable', task, severity: 'danger' });
  });

  return {
    issues,
    issueCount: issues.length,
    criticalWithoutTask: issues.filter((i) => i.type === 'Alerte critique sans tâche').length,
    duplicateTasks: issues.filter((i) => i.type === 'Tâche doublon potentielle').length,
    lateTasks: issues.filter((i) => i.type === 'Tâche en retard').length,
    orphanTasks: issues.filter((i) => i.type === 'Tâche sans source claire').length,
  };
}
