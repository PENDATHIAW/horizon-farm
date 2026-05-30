import { CRUD_KEYS, SALES_WORKFLOW_KEYS } from '../config/modules.config.js';

/** Rafraîchit tous les modules CRUD. */
export async function refreshAllModules(refreshModule) {
  return Promise.allSettled(CRUD_KEYS.map((key) => refreshModule(key)));
}

/** Rafraîchit la chaîne vente → stock → finance → documents. */
export async function refreshSalesWorkflow(crud = {}) {
  return Promise.allSettled(
    SALES_WORKFLOW_KEYS.map((key) => crud[key]?.refresh?.()).filter(Boolean),
  );
}

/** Rafraîchit un module métier et ses dépendances croisées. */
export async function refreshModuleCluster(moduleId, crud = {}) {
  const clusters = {
    elevage: ['animaux', 'avicole', 'sante', 'alimentation_logs', 'production_oeufs_logs', 'business_events'],
    commercial: SALES_WORKFLOW_KEYS,
    achats_stock: ['stock', 'fournisseurs', 'finances', 'alimentation_logs', 'alertes_center'],
    finance_pilotage: ['finances', 'investissements', 'business_plans', 'documents', 'payments'],
    activite_suivi: ['alertes_center', 'taches', 'tracabilite', 'business_events', 'audit_logs'],
    documents_rapports: ['documents', 'rapports', 'finances', 'business_events'],
    objectifs_croissance: ['business_plans', 'investissements', 'finances', 'sales_orders', 'alertes_center', 'taches'],
  };
  const keys = clusters[moduleId] || [moduleId];
  return Promise.allSettled(keys.map((key) => crud[key]?.refresh?.()).filter(Boolean));
}
