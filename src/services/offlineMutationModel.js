/**
 * Mutations hors ligne versionnées (feuille de route HF-P1-001, sous-lot a).
 *
 * La file hors ligne actuelle rejoue les écritures en « dernier écrivain
 * gagne » : une modification faite hors ligne écrase silencieusement une valeur
 * serveur qui aurait changé entre-temps. Ce module ajoute la brique manquante :
 *
 *  - une clé d'idempotence déterministe par mutation (rejouer la même écriture
 *    ne produit pas deux effets) ;
 *  - une version de base capturée au moment de la mise en file (l'état de la
 *    ligne tel que l'utilisateur l'a vu) ;
 *  - une classification au rejeu : appliquer, conflit, ou sans effet ;
 *  - un cycle de statut explicite (en attente, envoyée, conflit, rejetée,
 *    réparée) et des stratégies de résolution.
 *
 * Fonctions PURES (aucune dépendance React ni stockage) pour être testées
 * directement, y compris en CI (IndexedDB n'y est pas disponible).
 */

export const MUTATION_STATUS = Object.freeze({
  PENDING: 'pending',
  SENT: 'sent',
  CONFLICT: 'conflict',
  REJECTED: 'rejected',
  REPAIRED: 'repaired',
});

export const CONFLICT_STRATEGY = Object.freeze({
  SERVER: 'server', // garder la valeur serveur, abandonner la mutation locale
  CLIENT: 'client', // forcer la valeur locale (écrase le serveur, choix explicite)
  MERGE: 'merge', // fusion sûre : champs locaux modifiés sur base serveur
});

// Nombre d'échecs techniques (hors conflit) avant de marquer la mutation rejetée.
export const MAX_ATTEMPTS = 5;

// Champs volatils ignorés dans la signature de version (ils changent sans que la
// donnée métier change vraiment).
const VOLATILE_KEYS = new Set(['updated_at', 'updatedAt', 'modified_at', 'synced_at', 'last_error']);

const isObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

/** Hash déterministe (djb2) d'une chaîne — suffisant pour une empreinte de version. */
function djb2(text) {
  let hash = 5381;
  const str = String(text);
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

/** Empreinte stable d'une ligne (clés triées, champs volatils exclus). */
export function stableRowDigest(row) {
  if (!isObject(row)) return djb2(JSON.stringify(row ?? null));
  const entries = Object.keys(row)
    .filter((key) => !VOLATILE_KEYS.has(key))
    .sort()
    .map((key) => [key, row[key]]);
  return djb2(JSON.stringify(entries));
}

/**
 * Signature de version d'une ligne : privilégie un horodatage serveur
 * (updated_at) s'il existe, sinon une empreinte stable du contenu.
 * @returns {string} '' si la ligne est absente (rien à comparer).
 */
export function rowVersion(row) {
  if (row == null) return '';
  const stamp = row.updated_at || row.updatedAt || row.modified_at;
  if (stamp) return `t:${String(stamp)}`;
  return `h:${stableRowDigest(row)}`;
}

/** Clé d'idempotence déterministe : même écriture logique => même clé. */
export function buildIdempotencyKey({ moduleKey, action, id, payload }) {
  const digest = action === 'delete' ? '' : stableRowDigest(payload);
  return `${moduleKey}:${action}:${id}:${digest}`;
}

/**
 * Construit une mutation hors ligne versionnée.
 * @param {object} params
 * @param {object} [params.baseRow] état de la ligne connu au moment de la saisie
 *        (permet de détecter un changement serveur au rejeu).
 */
export function buildOfflineMutation({
  moduleKey,
  action,
  id,
  payload = null,
  baseRow = null,
  now = Date.now(),
  device = 'unknown',
}) {
  return {
    moduleKey,
    action,
    id,
    payload,
    idempotency_key: buildIdempotencyKey({ moduleKey, action, id, payload }),
    base_version: rowVersion(baseRow),
    status: MUTATION_STATUS.PENDING,
    attempts: 0,
    client_updated_at: new Date(now).toISOString(),
    device,
  };
}

/**
 * Décide du sort d'une mutation au rejeu, face à l'état serveur courant.
 * Règle conservatrice : en l'absence d'information (pas de version de base ou
 * pas de ligne serveur connue), on applique — le comportement reste identique à
 * l'existant. Un conflit n'est signalé que si l'on est certain que la ligne a
 * changé côté serveur depuis la saisie hors ligne.
 * @returns {{outcome: 'apply'|'conflict'|'noop', reason: string}}
 */
export function classifyReplayOutcome({ mutation = {}, currentServerRow = undefined } = {}) {
  if (mutation.action === 'create') return { outcome: 'apply', reason: 'creation' };

  // Ligne serveur inconnue (non fournie) : on ne peut pas détecter de conflit.
  if (currentServerRow === undefined) return { outcome: 'apply', reason: 'etat_serveur_inconnu' };

  if (mutation.action === 'delete') {
    if (currentServerRow === null) return { outcome: 'noop', reason: 'deja_supprimee' };
    // La ligne existe encore : conflit seulement si elle a changé depuis la base.
    if (mutation.base_version && rowVersion(currentServerRow) !== mutation.base_version) {
      return { outcome: 'conflict', reason: 'suppression_sur_ligne_modifiee' };
    }
    return { outcome: 'apply', reason: 'suppression' };
  }

  // action update
  if (currentServerRow === null) return { outcome: 'apply', reason: 'ligne_absente_recreation' };
  if (!mutation.base_version) return { outcome: 'apply', reason: 'base_inconnue' };
  if (rowVersion(currentServerRow) === mutation.base_version) {
    return { outcome: 'apply', reason: 'inchangee_depuis_saisie' };
  }
  return { outcome: 'conflict', reason: 'ligne_modifiee_cote_serveur' };
}

/**
 * Résout un conflit selon la stratégie choisie.
 * @returns {{payload: object}|{drop: true}} charge à appliquer, ou abandon.
 */
export function resolveConflict(strategy, { mutation = {}, serverRow = null } = {}) {
  if (strategy === CONFLICT_STRATEGY.SERVER) return { drop: true };
  if (strategy === CONFLICT_STRATEGY.CLIENT) return { payload: mutation.payload || {} };
  // MERGE : repartir de la ligne serveur et n'appliquer que les champs de la mutation.
  return { payload: { ...(serverRow || {}), ...(mutation.payload || {}) } };
}

// --- Transitions de statut (pures) --------------------------------------------

export function markSent(mutation) {
  return { ...mutation, status: MUTATION_STATUS.SENT };
}

export function markConflict(mutation, reason = '') {
  return { ...mutation, status: MUTATION_STATUS.CONFLICT, conflict_reason: reason };
}

export function markRepaired(mutation) {
  return { ...mutation, status: MUTATION_STATUS.REPAIRED, conflict_reason: undefined };
}

/** Incrémente le compteur d'échecs techniques ; bascule en rejetée au plafond. */
export function registerFailure(mutation, error = '') {
  const attempts = Number(mutation.attempts || 0) + 1;
  const status = attempts >= MAX_ATTEMPTS ? MUTATION_STATUS.REJECTED : MUTATION_STATUS.PENDING;
  return { ...mutation, attempts, last_error: String(error || ''), status };
}

/** Une mutation est-elle encore à rejouer automatiquement ? */
export function isActionable(mutation) {
  const status = mutation?.status || MUTATION_STATUS.PENDING;
  return status === MUTATION_STATUS.PENDING || status === MUTATION_STATUS.REPAIRED;
}

/**
 * Applique un choix de résolution à une mutation en conflit.
 * - SERVER : on abandonne la mutation locale (drop).
 * - CLIENT / MERGE : on reconstruit la charge et on réaligne base_version sur
 *   l'état serveur courant, pour que le rejeu suivant applique sans reconflit.
 * @returns {{drop: true}|{mutation: object}}
 */
export function resolveQueuedConflict(mutation, strategy, serverRow) {
  const outcome = resolveConflict(strategy, { mutation, serverRow });
  if (outcome.drop) return { drop: true };
  return {
    mutation: {
      ...mutation,
      payload: outcome.payload,
      base_version: rowVersion(serverRow),
      status: MUTATION_STATUS.REPAIRED,
      conflict_reason: undefined,
      attempts: 0,
    },
  };
}
