/**
 * Centre de santé ERP (feuille de route HF-P0-007).
 *
 * Moteur PUR d'évaluation : à partir d'un instantané observable côté client
 * (stockage, réseau, file hors ligne, données chargées, mode de données,
 * services externes), il produit un rapport de santé lisible. Objectif : rendre
 * visibles les dégradations silencieuses (échecs muets, sync bloquée, module non
 * chargé) au lieu de renvoyer des listes vides sans signal.
 *
 * Les contrôles profonds (RLS, schéma non migré) relèvent du backend/CI
 * (HF-P0-004/005) et ne sont pas simulables ici : ce moteur ne prétend pas les
 * couvrir, il évalue ce qui est réellement observable depuis le client.
 */

export const HEALTH_STATUS = Object.freeze({ ok: 'ok', info: 'info', warn: 'warn', degraded: 'degraded', down: 'down' });

const RANK = { ok: 0, info: 1, warn: 2, degraded: 3, down: 4 };

/** Statut le plus grave d'une liste de contrôles. */
export function worstStatus(checks = []) {
  return checks.reduce((worst, check) => (RANK[check?.status] > RANK[worst] ? check.status : worst), HEALTH_STATUS.ok);
}

// Collections métier attendues dans un ERP chargé (sous-ensemble représentatif).
export const EXPECTED_COLLECTIONS = Object.freeze([
  'animaux', 'avicole', 'cultures', 'stock', 'finances', 'sales_orders', 'clients', 'business_events',
]);

const SYNC_STALE_MS = 24 * 60 * 60 * 1000; // 24 h sans synchronisation = signal
const SYNC_BLOCKED_QUEUE = 25; // file volumineuse = synchronisation probablement bloquée

const num = (v) => Number(v || 0) || 0;

/**
 * @param {object} input
 * @param {object} input.dataMap        data map courant (par collection)
 * @param {Array}  input.offlineQueue   mutations hors ligne en attente
 * @param {number|null} input.lastSyncAt timestamp ms de la dernière sync réussie
 * @param {boolean} input.online        navigateur en ligne
 * @param {boolean} input.storageAvailable localStorage utilisable
 * @param {boolean} input.simulatedMode mode démonstration actif
 * @param {object} input.services       statuts externes { weather, assistant, push } ∈ HEALTH_STATUS
 * @param {number} input.now            horloge (injectable pour les tests)
 */
export function evaluateErpHealth({
  dataMap = {},
  offlineQueue = [],
  lastSyncAt = null,
  online = true,
  storageAvailable = true,
  simulatedMode = false,
  services = {},
  now = Date.now(),
} = {}) {
  const checks = [];

  checks.push(storageAvailable
    ? { id: 'storage', label: 'Stockage local', status: HEALTH_STATUS.ok, message: 'Disponible.' }
    : { id: 'storage', label: 'Stockage local', status: HEALTH_STATUS.down, message: 'Indisponible : les saisies hors ligne ne seront pas conservées.', action: 'Vérifier le navigateur (mode privé, quota, cookies bloqués).' });

  checks.push(online
    ? { id: 'network', label: 'Connexion réseau', status: HEALTH_STATUS.ok, message: 'En ligne.' }
    : { id: 'network', label: 'Connexion réseau', status: HEALTH_STATUS.warn, message: 'Hors ligne : les saisies sont mises en file et rejouées au retour du réseau.' });

  const pending = Array.isArray(offlineQueue) ? offlineQueue.length : num(offlineQueue);
  if (pending === 0) {
    checks.push({ id: 'sync_queue', label: 'File de synchronisation', status: HEALTH_STATUS.ok, message: 'Aucune mutation en attente.' });
  } else if (pending >= SYNC_BLOCKED_QUEUE) {
    checks.push({ id: 'sync_queue', label: 'File de synchronisation', status: HEALTH_STATUS.degraded, message: `${pending} mutations en attente : synchronisation lente ou bloquée.`, action: 'Vérifier le réseau et forcer une synchronisation.' });
  } else {
    checks.push({ id: 'sync_queue', label: 'File de synchronisation', status: HEALTH_STATUS.warn, message: `${pending} mutation(s) en attente de synchronisation.` });
  }

  if (lastSyncAt == null) {
    checks.push({ id: 'sync_freshness', label: 'Dernière synchronisation', status: HEALTH_STATUS.info, message: 'Aucune synchronisation enregistrée pour cette session.' });
  } else {
    const age = now - num(lastSyncAt);
    checks.push(age > SYNC_STALE_MS
      ? { id: 'sync_freshness', label: 'Dernière synchronisation', status: HEALTH_STATUS.warn, message: `Dernière synchronisation il y a plus de ${Math.floor(age / (60 * 60 * 1000))} h.` }
      : { id: 'sync_freshness', label: 'Dernière synchronisation', status: HEALTH_STATUS.ok, message: 'Récente.' });
  }

  const missing = EXPECTED_COLLECTIONS.filter((key) => !Array.isArray(dataMap?.[key]));
  checks.push(missing.length === 0
    ? { id: 'collections', label: 'Données métier chargées', status: HEALTH_STATUS.ok, message: 'Toutes les collections attendues sont chargées.' }
    : { id: 'collections', label: 'Données métier chargées', status: HEALTH_STATUS.degraded, message: `Collection(s) non chargée(s) : ${missing.join(', ')}.`, action: 'Table absente, base non à jour ou service en erreur : vérifier la base et les droits d’accès.' });

  checks.push(simulatedMode
    ? { id: 'data_mode', label: 'Mode de données', status: HEALTH_STATUS.info, message: 'Mode démonstration actif : les données affichées sont fictives.' }
    : { id: 'data_mode', label: 'Mode de données', status: HEALTH_STATUS.ok, message: 'Mode données réelles.' });

  const SERVICE_LABELS = { weather: 'Service météo', assistant: 'Assistant ERP', push: 'Notifications push' };
  Object.entries(services || {}).forEach(([key, status]) => {
    const normalized = RANK[status] != null ? status : HEALTH_STATUS.ok;
    checks.push({
      id: `service_${key}`,
      label: SERVICE_LABELS[key] || `Service ${key}`,
      status: normalized,
      message: normalized === HEALTH_STATUS.ok ? 'Disponible.' : 'Indisponible ou dégradé : fonction en mode réduit.',
    });
  });

  const status = worstStatus(checks);
  const summary = {
    ok: checks.filter((c) => c.status === HEALTH_STATUS.ok).length,
    warn: checks.filter((c) => c.status === HEALTH_STATUS.warn).length,
    degraded: checks.filter((c) => c.status === HEALTH_STATUS.degraded).length,
    down: checks.filter((c) => c.status === HEALTH_STATUS.down).length,
    total: checks.length,
  };
  return { status, checks, summary, generatedAt: now };
}

export default evaluateErpHealth;
