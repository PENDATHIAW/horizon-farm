import { generateSequentialId, makeId } from './ids';
import { buildIssueKey } from '../services/issueLinkingService';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

export const closedTaskStatuses = ['termine', 'terminé', 'annule', 'annulé', 'done', 'closed'];
export const closedAlertStatuses = ['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done', 'closed'];

export function normalizeTaskChecklist(checklist = '', title = '') {
  const titleText = lower(title);
  const rows = (Array.isArray(checklist) ? checklist : String(checklist || '').split(/[\n;]/))
    .map(clean)
    .filter(Boolean)
    .filter((item) => lower(item) !== titleText)
    .filter((item) => !['à faire', 'a faire', 'vérifier', 'verifier', 'clôturer', 'cloturer'].includes(lower(item)));
  return Array.from(new Set(rows));
}

export function alertDedupeKey(alert = {}) {
  return `${alert.module_source || alert.module || 'alertes'}:${alert.entity_type || 'alerte'}:${alert.entity_id || alert.id}:${alert.action_recommandee || alert.title || alert.message || 'action'}`;
}

export function taskDedupeKey(task = {}) {
  return task.alert_dedupe_key || task.task_dedupe_key || `${task.module_lie || task.source_module || 'alertes'}:${task.entity_type || 'alerte'}:${task.related_id || task.source_record_id || task.id}:${task.action_key || task.title || 'action'}`;
}

export function isTaskClosed(task = {}) {
  return closedTaskStatuses.includes(lower(task.status || task.statut));
}

export function isAlertClosed(alert = {}) {
  return closedAlertStatuses.includes(lower(alert.status || alert.statut));
}

export function hasOpenTaskForAlert(tasks = [], alert = {}) {
  const key = alertDedupeKey(alert);
  return arr(tasks).some((task) => !isTaskClosed(task) && (String(task.source_record_id || '') === String(alert.id || '') || taskDedupeKey(task) === key));
}

export function buildTaskFromAlert(alert = {}, rows = [], date = today()) {
  const id = generateSequentialId('taches', rows);
  const key = alertDedupeKey(alert);
  const title = alert.title || alert.message || 'Action alerte';
  const checklist = normalizeTaskChecklist(alert.checklist || alert.action_recommandee || alert.message || '', title);
  const issueKey = clean(alert.issue_key) || buildIssueKey({
    domain: 'alert_task',
    sourceModule: alert.source_module || alert.module_source || alert.module || 'alertes',
    sourceRecordId: alert.source_record_id || alert.entity_id || alert.id || 'unknown',
    kind: alert.action_recommandee || alert.title || 'action',
  });
  return {
    task: {
      id,
      title,
      module_lie: alert.module_source || alert.module || 'alertes',
      entity_type: alert.entity_type || 'alerte',
      related_id: alert.entity_id || alert.id,
      assigned_to: alert.responsable || alert.assigned_to || 'TEAM-FERME',
      due_date: date,
      priority: ['critical', 'critique', 'urgence'].includes(lower(alert.severity)) ? 'critique' : 'haute',
      status: 'a_faire',
      notes: alert.message || alert.action_recommandee || '',
      checklist,
      source_module: 'alertes',
      source_record_id: alert.id,
      issue_key: issueKey,
      related_module: alert.module_source || alert.module || 'alertes',
      related_record_id: alert.entity_id || alert.id || '',
      workflow_id: clean(alert.workflow_id) || null,
      origin_type: clean(alert.origin_type) || 'workflow',
      action_key: alert.action_recommandee || alert.title || 'action',
      alert_dedupe_key: key,
      task_dedupe_key: key,
    },
    alertPatch: { linked_task_id: id, status: alert.status === 'nouvelle' ? 'lue' : alert.status || 'lue' },
    event: {
      id: makeId('EVT'),
      event_type: 'tache_creee_depuis_alerte',
      module_source: 'taches',
      entity_type: alert.entity_type || 'alerte',
      entity_id: alert.entity_id || alert.id,
      title: `Tâche créée: ${title}`,
      description: alert.action_recommandee || alert.message || '',
      event_date: date,
      severity: alert.severity || 'info',
      linked_task_id: id,
      linked_alert_id: alert.id,
      issue_key: issueKey,
      source_module: 'alertes',
      source_record_id: alert.id || '',
      related_module: alert.module_source || alert.module || 'alertes',
      related_record_id: alert.entity_id || alert.id || '',
      workflow_id: clean(alert.workflow_id) || null,
      origin_type: 'workflow',
      saisies_evitees: 2,
    },
  };
}

export function completeTaskWorkflow(task = {}, date = today(), timestamp = now()) {
  const alertId = task.alert_id || (task.source_module === 'alertes' ? task.source_record_id : '') || task.linked_alert_id;
  return {
    taskPatch: { status: 'termine', statut: 'termine', completed_at: timestamp },
    alertPatch: alertId ? { id: alertId, patch: { status: 'traitee', statut: 'traitee', completed_task_id: task.id, treated_at: timestamp } } : null,
    event: {
      id: makeId('EVT'),
      event_type: 'tache_terminee',
      module_source: 'taches',
      entity_type: task.module_lie || task.entity_type || 'tache',
      entity_id: task.related_id || task.id,
      title: `Tâche terminée: ${task.title || task.id}`,
      description: task.notes || '',
      event_date: date,
      severity: 'info',
      linked_task_id: task.id,
      linked_alert_id: alertId || '',
    },
  };
}
