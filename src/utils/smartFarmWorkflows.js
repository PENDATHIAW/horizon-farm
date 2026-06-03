import { makeId } from './ids.js';

const today = () => new Date().toISOString().slice(0, 10);
const clean = (value = '') => String(value || '').trim();
const norm = (value = '') => clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const num = (value = 0) => Number(value || 0) || 0;

const problemStatuses = ['alerte', 'offline', 'hors_ligne', 'hors ligne', 'maintenance', 'panne', 'batterie_faible'];

export const smartDeviceLabel = (device = {}, kind = 'capteur') => device.name || device.nom || device.label || device.id || (kind === 'camera' ? 'Caméra' : 'Capteur');
export const smartDeviceZone = (device = {}) => device.zone || device.location || device.emplacement || 'Zone non renseignée';
export const smartDeviceSource = (device = {}) => (norm(device.source_type || device.source || device.type) === 'simulation' || norm(device.status || device.statut) === 'simulation' ? 'simulation' : 'reel');
export const smartFarmActionKey = (device = {}, kind = 'capteur') => `smartfarm:${kind}:${clean(device.id)}`;

export function isSmartFarmDeviceCritical(device = {}) {
  const status = norm(device.status || device.statut);
  const battery = num(device.battery_level ?? device.batterie);
  const value = num(device.value ?? device.valeur ?? device.last_value ?? device.derniere_valeur);
  const min = num(device.seuil_min ?? device.min_threshold);
  const max = num(device.seuil_max ?? device.max_threshold);
  const hasThreshold = min > 0 || max > 0;
  const thresholdCritical = hasThreshold && ((min > 0 && value < min) || (max > 0 && value > max));
  return problemStatuses.includes(status) || (battery > 0 && battery <= 20) || thresholdCritical;
}

export function smartFarmDeviceReason(device = {}, kind = 'capteur') {
  const status = clean(device.status || device.statut);
  const battery = num(device.battery_level ?? device.batterie);
  const value = num(device.value ?? device.valeur ?? device.last_value ?? device.derniere_valeur);
  const min = num(device.seuil_min ?? device.min_threshold);
  const max = num(device.seuil_max ?? device.max_threshold);
  if (status && norm(status) !== 'simulation' && problemStatuses.includes(norm(status))) return `${status} · ${smartDeviceZone(device)}`;
  if (battery > 0 && battery <= 20) return `Batterie ${battery}% · ${smartDeviceZone(device)}`;
  if (max > 0 && value > max) return `Mesure ${value} au-dessus du seuil ${max} · ${smartDeviceZone(device)}`;
  if (min > 0 && value < min) return `Mesure ${value} sous le seuil ${min} · ${smartDeviceZone(device)}`;
  return `${kind === 'camera' ? 'Caméra' : 'Capteur'} à vérifier · ${smartDeviceZone(device)}`;
}

export function buildSmartFarmDeviceFollowUp({ device = {}, kind = 'capteur', date = today(), source = smartDeviceSource(device) } = {}) {
  if (!device?.id || !isSmartFarmDeviceCritical(device)) return null;
  const key = smartFarmActionKey(device, kind);
  const taskId = makeId('TSK');
  const alertId = makeId('ALT');
  const label = smartDeviceLabel(device, kind);
  const reason = smartFarmDeviceReason(device, kind);
  const priority = norm(device.status || device.statut).includes('panne') || num(device.battery_level ?? device.batterie) <= 10 ? 'haute' : 'moyenne';
  return {
    task: {
      id: taskId,
      title: `Vérifier ${kind === 'camera' ? 'caméra' : 'capteur'} · ${label}`,
      module_lie: 'smartfarm',
      source_module: 'smartfarm',
      source_record_id: device.id,
      related_id: device.id,
      task_dedupe_key: key,
      action_key: key,
      due_date: date,
      priority,
      status: 'a_faire',
      checklist: 'Vérifier sur place; Corriger le seuil ou la panne; Confirmer retour normal',
      notes: `${reason}. Source: ${source === 'simulation' ? 'données simulées' : 'données réelles'}.`,
    },
    alert: {
      id: alertId,
      title: `Smart Farm à traiter: ${label}`,
      message: reason,
      module_source: 'smartfarm',
      entity_type: kind,
      entity_id: device.id,
      severity: priority === 'haute' ? 'warning' : 'info',
      status: 'nouvelle',
      action_recommandee: 'Vérifier la zone et clôturer la tâche terrain.',
      alert_dedupe_key: key,
      linked_task_id: taskId,
    },
    event: {
      id: makeId('EVT'),
      event_type: 'smartfarm_signal_critique',
      module_source: 'smartfarm',
      entity_type: kind,
      entity_id: device.id,
      title: `Signal Smart Farm · ${label}`,
      description: reason,
      event_date: date,
      severity: priority === 'haute' ? 'warning' : 'info',
      source_type: source,
      linked_task_id: taskId,
      linked_alert_id: alertId,
      saisies_evitees: 2,
    },
  };
}
