import { buildIdempotencyKey, MUTATION_STATUS, resolveQueuedConflict, rowVersion } from './offlineMutationModel.js';

const QUEUE_KEY = 'horizon_farm_offline_queue';

const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v) => Number(v || 0);

function isTelemetryItem(item = {}) {
  const type = String(item.type || '').toUpperCase();
  const moduleKey = String(item.moduleKey || '').toLowerCase();
  const action = String(item.action || '').toLowerCase();
  return type === 'SYNC_TELEMETRY'
    || type === 'SYNC_TELEMETRY_BULK'
    || moduleKey === 'smartfarm_events'
    || action.includes('telemetry');
}

function hourKey(dateLike = '') {
  const d = new Date(dateLike || Date.now());
  if (Number.isNaN(d.getTime())) return 'unknown';
  return `${d.toISOString().slice(0, 13)}:00`;
}

function computeHourlyAverageTelemetry(items = []) {
  const buckets = new Map();
  arr(items).forEach((item) => {
    const payload = item.payload || item.data || item;
    const key = hourKey(item.createdAt || item.created_at || payload.timestamp);
    if (!buckets.has(key)) buckets.set(key, { temps: [], hums: [], count: 0 });
    const bucket = buckets.get(key);
    bucket.count += 1;
    const temp = num(payload.temperature ?? payload.temp ?? payload.event_value);
    const hum = num(payload.humidity ?? payload.humidite ?? payload.hum);
    if (temp) bucket.temps.push(temp);
    if (hum) bucket.hums.push(hum);
  });
  return [...buckets.entries()].map(([hour, bucket]) => ({
    hour,
    samples: bucket.count,
    temperature_avg: bucket.temps.length ? bucket.temps.reduce((s, v) => s + v, 0) / bucket.temps.length : null,
    humidity_avg: bucket.hums.length ? bucket.hums.reduce((s, v) => s + v, 0) / bucket.hums.length : null,
  }));
}

/** Réduit la file offline quand les trames IoT saturent la zone blanche. */
export function optimizeOfflineQueue(queue = []) {
  const items = arr(queue);
  const telemetryActions = items.filter(isTelemetryItem);
  if (telemetryActions.length <= 100) return items;

  const condensedData = computeHourlyAverageTelemetry(telemetryActions);
  const rest = items.filter((item) => !telemetryActions.includes(item));
  return [
    ...rest,
    {
      id: `BULK-TEL-${Date.now().toString(36).toUpperCase()}`,
      type: 'SYNC_TELEMETRY_BULK',
      moduleKey: 'smartfarm_events',
      action: 'telemetry_bulk',
      data: condensedData,
      payload: { condensed: condensedData, source_count: telemetryActions.length },
      status: 'pending',
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ];
}

export const readOfflineQueue = () => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return optimizeOfflineQueue(Array.isArray(parsed) ? parsed.filter(Boolean) : []);
  } catch {
    return [];
  }
};

export const saveOfflineQueue = (items = []) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(optimizeOfflineQueue(Array.isArray(items) ? items.filter(Boolean) : [])));
};

export function getOfflineRecordId(item = {}) {
  return String(item.recordId || item.payload?.id || item.id || '').trim();
}

export const enqueueOfflineMutation = ({
  moduleKey,
  action,
  id,
  payload,
  type,
  baseRow = null,
  previousRow = baseRow,
}) => {
  const queue = readOfflineQueue();
  // `id` reste l'identifiant unique de l'entrée de file (clé React, traçabilité) ;
  // `recordId` porte l'identifiant réel de l'enregistrement (cible du rejeu et de
  // la déduplication). base_version capture l'état vu à la saisie pour détecter
  // un conflit au rejeu. idempotency_key rend le rejeu idempotent.
  const item = {
    id: `OFF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    type: type || (moduleKey === 'smartfarm_events' ? 'SYNC_TELEMETRY' : undefined),
    moduleKey,
    action,
    recordId: id,
    payload,
    idempotency_key: buildIdempotencyKey({ moduleKey, action, id, payload }),
    base_version: rowVersion(baseRow || previousRow),
    previousRow: previousRow || baseRow,
    status: MUTATION_STATUS.PENDING,
    attempts: 0,
    createdAt: new Date().toISOString(),
    created_at: new Date().toISOString(),
    client_updated_at: new Date().toISOString(),
    device: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : 'unknown',
  };
  saveOfflineQueue([...queue, item]);
  return item;
};

export const clearOfflineQueue = () => saveOfflineQueue([]);

export const isBrowserOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/** Mutations actuellement en conflit (à résoudre par l'utilisateur). */
export const listOfflineConflicts = () => readOfflineQueue().filter((item) => item.status === MUTATION_STATUS.CONFLICT);

/**
 * Applique un choix de résolution à une mutation en conflit et met à jour la file.
 * @param {string} queueUid identifiant unique de l'entrée de file (item.id)
 * @param {'server'|'client'|'merge'} strategy
 * @param {object|null} serverRow état serveur courant de la ligne
 * @returns {{ok: boolean, dropped?: boolean}}
 */
export const resolveOfflineConflict = (queueUid, strategy, serverRow = null) => {
  const queue = readOfflineQueue();
  const item = queue.find((entry) => entry.id === queueUid);
  if (!item) return { ok: false };
  const outcome = resolveQueuedConflict(item, strategy, serverRow);
  const next = outcome.drop
    ? queue.filter((entry) => entry.id !== queueUid)
    : queue.map((entry) => (entry.id === queueUid ? outcome.mutation : entry));
  saveOfflineQueue(next);
  return { ok: true, dropped: Boolean(outcome.drop) };
};
