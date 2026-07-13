import { buildSmartFarmDeviceFollowUp } from '../utils/smartFarmWorkflows.js';

const arr = (v) => (Array.isArray(v) ? v : []);

/** Crée alertes + événements pour les capteurs critiques, sans doublon. */
export async function syncSmartFarmCriticalSignals({
  sensors = [],
  tasks = [],
  alertes = [],
  onCreateTask,
  onCreateAlert,
  onCreateBusinessEvent,
  onRefreshTasks,
  onRefreshAlertes,
  onRefreshBusinessEvents,
} = {}) {
  if (!onCreateAlert) return { created: 0 };

  const openTasks = arr(tasks).filter((t) => !['termine', 'terminé', 'done', 'closed'].includes(String(t.status || t.statut).toLowerCase()));
  const openAlerts = arr(alertes).filter((a) => !['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée'].includes(String(a.status || a.statut).toLowerCase()));

  let created = 0;
  for (const device of arr(sensors)) {
    const followUp = buildSmartFarmDeviceFollowUp({ device });
    if (!followUp) continue;

    const key = followUp.task.task_dedupe_key;
    const hasTask = openTasks.some((t) => t.task_dedupe_key === key || t.action_key === key);
    const hasAlert = openAlerts.some((a) => a.alert_dedupe_key === key);
    if (hasAlert) continue;

    await onCreateAlert(followUp.alert);
    if (!hasTask && onCreateTask) await onCreateTask(followUp.task);
    if (onCreateBusinessEvent) await onCreateBusinessEvent(followUp.event);
    created += 1;
  }

  await Promise.allSettled([onRefreshTasks?.(), onRefreshAlertes?.(), onRefreshBusinessEvents?.()]);
  return { created };
}

export function countSmartFarmCriticalDevices(sensors = []) {
  return devicesWithFollowUp(sensors).length;
}

function devicesWithFollowUp(sensors = []) {
  return arr(sensors).filter((device) => Boolean(buildSmartFarmDeviceFollowUp({ device })));
}

export default syncSmartFarmCriticalSignals;
