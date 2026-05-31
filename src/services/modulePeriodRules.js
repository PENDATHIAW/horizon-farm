/**
 * Règles période globale : quelles données sont filtrées par mois vs cumul global.
 * Complète applyPeriodScope.js — référence pour modules et Annexe.
 */

/** Données qui restent en cumul global même quand une période est sélectionnée. */
export const PERIOD_ALWAYS_GLOBAL = [
  { key: 'stocks', label: 'Stock actuel', reason: 'Inventaire physique du jour' },
  { key: 'clients', label: 'Clients', reason: 'Référentiel complet' },
  { key: 'animaux', label: 'Animaux actifs', reason: 'Effectif courant' },
  { key: 'lots', label: 'Lots avicoles', reason: 'Bandes en cours' },
  { key: 'fournisseurs', label: 'Fournisseurs', reason: 'Solde cumulé' },
  { key: 'salesOrdersAll', label: 'Créances totales', reason: 'Reste à payer global client' },
  { key: 'paymentsAll', label: 'Encaissements cumulés', reason: 'Comparaison KPI Accueil' },
  { key: 'transactionsAll', label: 'Finances cumulées', reason: 'Trésorerie globale' },
  { key: 'businessPlans', label: 'Business plan', reason: 'Vision stratégique' },
  { key: 'investissements', label: 'Investissements', reason: 'Patrimoine' },
];

/** Données filtrées par période sélectionnée. */
export const PERIOD_FILTERED = [
  { key: 'salesOrders', label: 'Ventes du mois', modules: ['commercial', 'dashboard', 'finance_pilotage'] },
  { key: 'payments', label: 'Encaissements du mois', modules: ['finance_pilotage', 'dashboard'] },
  { key: 'transactions', label: 'Dépenses du mois', modules: ['finance_pilotage', 'dashboard'] },
  { key: 'productionLogs', label: 'Ponte du mois', modules: ['elevage', 'dashboard'] },
  { key: 'taches', label: 'Tâches du mois', modules: ['activite_suivi'] },
  { key: 'alertes', label: 'Alertes ouvertes', modules: ['activite_suivi', 'centre_ia'], note: 'Ouvertes = non filtrées par date de clôture' },
  { key: 'documents', label: 'Documents récents', modules: ['documents_rapports'] },
];

export function isGlobalDataKey(key = '') {
  return PERIOD_ALWAYS_GLOBAL.some((row) => row.key === key);
}

export function filteredDataKeysForModule(moduleId = '') {
  return PERIOD_FILTERED.filter((row) => !moduleId || row.modules?.includes(moduleId)).map((row) => row.key);
}

export default { PERIOD_ALWAYS_GLOBAL, PERIOD_FILTERED };
