import { makeId } from '../utils/ids.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const clean = (v) => String(v || '').trim().toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);

const CRITICAL_EVENT_TYPES = new Set([
  'intrusion', 'humain_detecte', 'fuite_eau', 'capteur_offline', 'camera_offline',
]);
const WARNING_EVENT_TYPES = new Set([
  'temperature', 'humidite', 'humidite_sol', 'mouvement', 'batterie_faible', 'signal_faible',
]);

function severityFromEvent(event = {}) {
  const sev = clean(event.severity);
  if (sev === 'urgence' || sev === 'critique' || sev === 'critical') return 'urgence';
  if (sev === 'warning' || sev === 'haute') return 'warning';
  const type = clean(event.event_type);
  if (CRITICAL_EVENT_TYPES.has(type)) return 'warning';
  if (WARNING_EVENT_TYPES.has(type)) return 'info';
  return 'info';
}

function eventLabel(event = {}) {
  return event.message || event.title || `${event.event_type || 'signal'} · ${event.zone || 'zone'}`;
}

/** Convertit un événement Smart Farm non traité en alerte + événement métier. */
export function buildSmartFarmEventFollowUp(event = {}) {
  if (!event?.id || event.handled) return null;
  const type = clean(event.event_type);
  if (!type) return null;
  const kind = clean(event.device_type) === 'camera' ? 'camera' : 'capteur';
  const deviceId = event.device_id || event.id;
  const key = `smartfarm:event:${event.id}`;
  const priority = severityFromEvent(event) === 'urgence' ? 'haute' : 'moyenne';
  const taskId = makeId('TSK');
  const alertId = makeId('ALT');
  const label = eventLabel(event);

  return {
    task: {
      id: taskId,
      title: `Smart Farm · ${event.event_type || 'signal'}`,
      module_lie: 'smartfarm',
      source_module: 'smartfarm',
      source_record_id: deviceId,
      related_id: deviceId,
      task_dedupe_key: key,
      action_key: key,
      due_date: today(),
      priority,
      status: 'a_faire',
      notes: label,
    },
    alert: {
      id: alertId,
      title: `IoT · ${event.event_type || 'événement'}`,
      message: label,
      module_source: 'smartfarm',
      entity_type: kind,
      entity_id: deviceId,
      severity: priority === 'haute' ? 'warning' : 'info',
      status: 'nouvelle',
      action_recommandee: 'Vérifier sur le terrain ou confirmer automatisation.',
      alert_dedupe_key: key,
      linked_task_id: taskId,
    },
    event: {
      id: makeId('EVT'),
      event_type: 'smartfarm_event_alerte',
      module_source: 'smartfarm',
      entity_type: kind,
      entity_id: deviceId,
      title: `Événement IoT · ${event.event_type}`,
      description: label,
      event_date: today(),
      severity: priority === 'haute' ? 'warning' : 'info',
      linked_task_id: taskId,
      linked_alert_id: alertId,
      saisies_evitees: 2,
    },
    sourceEventId: event.id,
  };
}

/** Crée alertes pour événements IoT non traités (sans doublon). */
export async function syncSmartFarmEventSignals({
  events = [],
  alertes = [],
  onCreateAlert,
  onCreateBusinessEvent,
  onRefreshAlertes,
  onRefreshBusinessEvents,
} = {}) {
  if (!onCreateAlert) return { created: 0 };

  const openAlerts = arr(alertes).filter((a) => !['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée'].includes(clean(a.status || a.statut)));
  let created = 0;

  for (const rawEvent of arr(events)) {
    const followUp = buildSmartFarmEventFollowUp(rawEvent);
    if (!followUp) continue;
    const key = followUp.alert.alert_dedupe_key;
    if (openAlerts.some((a) => a.alert_dedupe_key === key)) continue;

    await onCreateAlert(followUp.alert);
    if (onCreateBusinessEvent) await onCreateBusinessEvent(followUp.event);
    created += 1;
  }

  await Promise.allSettled([onRefreshAlertes?.(), onRefreshBusinessEvents?.()]);
  return { created };
}

export default syncSmartFarmEventSignals;
