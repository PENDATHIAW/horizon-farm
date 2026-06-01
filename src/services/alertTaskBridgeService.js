import { buildTaskFromAlert, completeTaskWorkflow, hasOpenTaskForAlert, isAlertClosed, isTaskClosed } from '../utils/taskWorkflows';

const arr = (v) => (Array.isArray(v) ? v : []);
const openAlert = (row = {}) => !isAlertClosed(row);
const openTask = (row = {}) => !isTaskClosed(row);

export function findOpenAlertsWithoutTask(alertes = [], tasks = []) {
  return arr(alertes)
    .filter(openAlert)
    .filter((alert) => !hasOpenTaskForAlert(tasks, alert))
    .map((alert) => ({
      id: alert.id,
      alertId: alert.id,
      title: alert.title || alert.titre || alert.message || 'Alerte à traiter',
      detail: alert.message || alert.action_recommandee || 'Action à planifier',
      module: alert.module_source || alert.module || 'alertes',
      alert,
    }));
}

export function findOpenTasksWithLinkedAlerts(tasks = [], alertes = []) {
  const alertsById = new Map(arr(alertes).map((alert) => [String(alert.id), alert]));
  return arr(tasks)
    .filter(openTask)
    .map((task) => {
      const alertId = String(task.alert_id || task.linked_alert_id || (task.source_module === 'alertes' ? task.source_record_id : '') || '');
      const alert = alertsById.get(alertId);
      if (!alert || !openAlert(alert)) return null;
      return { id: task.id, taskId: task.id, alertId, title: task.title || task.id, detail: alert.title || alert.message || '', task, alert };
    })
    .filter(Boolean);
}

export function findCompletedTasksWithOpenAlerts(tasks = [], alertes = []) {
  const alertsById = new Map(arr(alertes).map((alert) => [String(alert.id), alert]));
  return arr(tasks)
    .filter((task) => isTaskClosed(task))
    .map((task) => {
      const alertId = String(task.alert_id || task.linked_alert_id || (task.source_module === 'alertes' ? task.source_record_id : '') || '');
      const alert = alertsById.get(alertId);
      if (!alert || !openAlert(alert)) return null;
      return { id: `${task.id}-${alertId}`, taskId: task.id, alertId, title: task.title || task.id, detail: alert.title || alert.message || '', task, alert };
    })
    .filter(Boolean);
}

export async function bridgeCreateTaskFromAlert(alert = {}, { tasks = [], onCreateTask, onUpdateAlert, onRefreshTasks, onRefreshAlertes } = {}) {
  const workflow = buildTaskFromAlert(alert, tasks);
  await onCreateTask?.({ ...workflow.task, created_from: 'alerte' });
  await onUpdateAlert?.(alert.id, { ...workflow.alertPatch, task_status: 'tache_creee', linked_task_status: 'created' });
  await Promise.allSettled([onRefreshTasks?.(), onRefreshAlertes?.()]);
  return workflow;
}

export async function bridgeCloseAlertFromCompletedTask(task = {}, { onUpdateAlert, onRefreshAlertes, onCreateBusinessEvent } = {}) {
  const workflow = completeTaskWorkflow(task);
  if (workflow.alertPatch?.id) {
    await onUpdateAlert?.(workflow.alertPatch.id, workflow.alertPatch.patch);
    await onRefreshAlertes?.();
  }
  if (workflow.event && onCreateBusinessEvent) await onCreateBusinessEvent(workflow.event);
  return workflow;
}

export async function bridgeCloseTaskFromResolvedAlert(alert = {}, tasks = [], { onUpdateTask, onRefreshTasks } = {}) {
  const linked = arr(tasks).find((task) => openTask(task) && (
    String(task.source_record_id || '') === String(alert.id || '')
    || String(task.linked_alert_id || '') === String(alert.id || '')
  ));
  if (!linked?.id) return null;
  await onUpdateTask?.(linked.id, { status: 'termine', statut: 'termine', completed_at: new Date().toISOString(), closed_from: 'alerte_resolue' });
  await onRefreshTasks?.();
  return linked;
}

export function summarizeAlertTaskBridge(alertes = [], tasks = []) {
  const withoutTask = findOpenAlertsWithoutTask(alertes, tasks);
  const linkedOpen = findOpenTasksWithLinkedAlerts(tasks, alertes);
  const staleAlerts = findCompletedTasksWithOpenAlerts(tasks, alertes);
  return {
    withoutTask,
    linkedOpen,
    staleAlerts,
    withoutTaskCount: withoutTask.length,
    staleAlertCount: staleAlerts.length,
  };
}
