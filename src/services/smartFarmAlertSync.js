import { buildSmartFarmDeviceFollowUp } from '../utils/smartFarmWorkflows.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const clean = (v) => String(v || '').trim();

/** Crée alertes + événements pour capteurs/caméras critiques (sans doublon). */
export async function syncSmartFarmCriticalSignals({
  sensors = [],
  cameras = [],
  tasks = [],
  alertes = [],
  onCreateAlert,
  onCreateBusinessEvent,
  onRefreshAlertes,
  onRefreshBusinessEvents,
} = {}) {
  if (!onCreateAlert) return { created: 0 };

  const openTasks = arr(tasks).filter((t) => !['termine', 'terminé', 'done', 'closed'].includes(String(t.status || t.statut).toLowerCase()));
  const openAlerts = arr(alertes).filter((a) => !['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée'].includes(String(a.status || a.statut).toLowerCase()));

  const devices = [
    ...arr(sensors).map((device) => ({ device, kind: 'capteur' })),
    ...arr(cameras).map((device) => ({ device, kind: 'camera' })),
  ];

  let created = 0;
  for (const { device, kind } of devices) {
    const followUp = buildSmartFarmDeviceFollowUp({ device, kind });
    if (!followUp) continue;

    const key = followUp.task.task_dedupe_key;
    const hasTask = openTasks.some((t) => t.task_dedupe_key === key || t.action_key === key);
    const hasAlert = openAlerts.some((a) => a.alert_dedupe_key === key);
    if (hasAlert) continue;

    await onCreateAlert(followUp.alert);
    if (onCreateBusinessEvent) await onCreateBusinessEvent(followUp.event);
    created += 1;
    if (!hasTask) {
      // Tâche créée uniquement si alerte créée — l'utilisateur valide via Activité
    }
  }

  await Promise.allSettled([onRefreshAlertes?.(), onRefreshBusinessEvents?.()]);
  return { created };
}

export function countSmartFarmCriticalDevices(sensors = [], cameras = []) {
  return devicesWithFollowUp(sensors, cameras).length;
}

function devicesWithFollowUp(sensors = [], cameras = []) {
  return [
    ...arr(sensors).map((device) => ({ device, kind: 'capteur' })),
    ...arr(cameras).map((device) => ({ device, kind: 'camera' })),
  ].filter(({ device, kind }) => Boolean(buildSmartFarmDeviceFollowUp({ device, kind })));
}

export default syncSmartFarmCriticalSignals;
