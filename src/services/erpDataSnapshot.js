/**
 * Instantané des données ERP courantes (lecture seule) pour le préremplissage.
 *
 * Le fournisseur de données (AppContext) publie ici, à chaque changement, le data
 * map filtré et l'utilisateur connecté. Les ouvreurs de formulaires
 * (openFormModal, openDailyQuickEntry…) peuvent ainsi appliquer le préremplissage
 * même quand l'appelant ne transmet pas explicitement les données - « tant que
 * l'info existe, on ne la resaisit pas », partout et sans câblage par composant.
 *
 * Purement en mémoire, remis à zéro à chaque session. Ne stocke aucun secret.
 */

let snapshot = { data: {}, user: '' };

/** Publie l'instantané courant (appelé par le fournisseur de données). */
export function setErpDataSnapshot({ data = {}, user = '' } = {}) {
  snapshot = { data: data || {}, user: String(user || '') };
}

/** Lit l'instantané courant (data map + utilisateur). */
export function getErpDataSnapshot() {
  return snapshot;
}

/** Data map courant (ou {} si non publié). */
export function getErpData() {
  return snapshot.data || {};
}

/** Utilisateur connecté courant (ou '' si inconnu). */
export function getErpUser() {
  return snapshot.user || '';
}

export default getErpDataSnapshot;
