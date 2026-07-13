import { buildTaskFromAlert, hasOpenTaskForAlert } from './taskWorkflows.js';


const lower = (value = '') => String(value || '').trim().toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);

export const CRITICAL_ALERT_SEVERITIES = new Set(['critique', 'urgence', 'critical']);

export function isCriticalAlert(alert = {}) {
  return CRITICAL_ALERT_SEVERITIES.has(lower(alert.severity));
}

/** Crée une tâche terrain si alerte critique et aucune tâche ouverte liée. */
export async function ensureCriticalAlertTask(alert = {}, {
  existingTasks = [],
  onCreateTask,
  onUpdateAlert,
} = {}) {
  if (!alert?.id || !onCreateTask || !isCriticalAlert(alert)) return null;
  if (hasOpenTaskForAlert(existingTasks, alert)) return null;

  const workflow = buildTaskFromAlert({
    ...alert,
    task_intent: 'a_creer',
    title: alert.title || alert.message || 'Traiter alerte critique',
  }, existingTasks, today());

  await onCreateTask({
    ...workflow.task,
    created_from: 'critical_alert_auto',
    side_effects_managed: true,
  });

  if (onUpdateAlert && alert.id) {
    await onUpdateAlert(alert.id, workflow.alertPatch).catch(() => undefined);
  }

  return workflow.task;
}
