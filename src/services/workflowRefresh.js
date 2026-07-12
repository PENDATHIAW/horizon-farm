import { CRUD_KEYS, ROUTE_TO_MODULE, SALES_WORKFLOW_KEYS } from '../config/modules.config.js';
import { BUSINESS_EVENT_REFRESH_CLUSTERS } from '../config/businessInterconnections.config.js';

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

export const MODULE_REFRESH_CLUSTERS = Object.freeze({
  dashboard: ['sales_orders', 'payments', 'finances', 'stock', 'avicole', 'animaux', 'cultures', 'alertes_center', 'taches', 'business_events'],
  assistant_erp: ['business_events', 'alertes_center', 'taches', 'documents', 'rapports', 'audit_logs'],
  centre_decisionnel: ['alertes_center', 'taches', 'business_events', 'stock', 'sales_orders', 'payments', 'finances', 'avicole', 'animaux', 'cultures', 'alimentation_logs', 'production_oeufs_logs', 'equipements', 'sensor_devices'],
  elevage: ['animaux', 'avicole', 'sante', 'veterinaires', 'alimentation_logs', 'production_oeufs_logs', 'stock', 'stock_movements', 'finances', 'taches', 'alertes_center', 'business_events', 'documents'],
  cultures: ['cultures', 'stock', 'stock_movements', 'finances', 'taches', 'alertes_center', 'business_events', 'documents', 'sensor_devices'],
  commercial: SALES_WORKFLOW_KEYS,
  achats_stock: ['stock', 'stock_movements', 'fournisseurs', 'finances', 'documents', 'alimentation_logs', 'alertes_center', 'business_events'],
  finance_pilotage: ['finances', 'payments', 'sales_orders', 'investissements', 'business_plans', 'bp_investment_lines', 'bp_recurring_costs', 'bp_revenue_projections', 'bp_funding_sources', 'documents', 'rapports', 'business_events', 'alertes_center'],
  activite_suivi: ['alertes_center', 'taches', 'tracabilite', 'business_events', 'audit_logs', 'documents'],
  documents_rapports: ['documents', 'rapports', 'finances', 'payments', 'sales_orders', 'stock', 'avicole', 'animaux', 'cultures', 'business_events', 'audit_logs'],
  objectifs_croissance: ['business_plans', 'investissements', 'finances', 'sales_orders', 'payments', 'stock', 'avicole', 'animaux', 'cultures', 'alertes_center', 'taches'],
  financements: [
    'funding_opportunities', 'funding_contacts', 'funding_applications',
    'funding_document_library', 'funding_agreements', 'funding_expense_allocations',
    'funding_reports', 'funding_project_journal', 'funder_accounts', 'funder_access_logs',
    'rapports', 'documents', 'finances', 'investissements', 'business_plans',
    'sales_orders', 'payments', 'business_events', 'audit_logs',
  ],
  equipe: ['taches', 'business_events', 'equipements', 'documents', 'alertes_center'],
  equipements: ['equipements', 'finances', 'investissements', 'taches', 'business_events', 'documents', 'alertes_center', 'sensor_devices'],
  smartfarm: ['sensor_devices', 'camera_devices', 'business_events', 'alertes_center', 'taches', 'equipements', 'cultures', 'avicole', 'animaux'],
  agri_feeds: ['feed_raw_materials', 'feed_raw_batches', 'feed_formulas', 'feed_formula_versions', 'feed_formula_ingredients', 'feed_facility_zones', 'feed_production_orders', 'feed_finished_batches', 'feed_quality_checks', 'feed_trials', 'feed_phase1_comparisons', 'stock', 'stock_movements', 'finances', 'fournisseurs', 'clients', 'sales_orders', 'sales_order_items', 'payments', 'business_events', 'alertes_center', 'audit_logs', 'rapports'],
  gestion_systeme: ['audit_logs', 'business_events', 'alertes_center', 'taches'],
});

/** Rafraîchit un module métier et ses dépendances croisées. */
export async function refreshModuleCluster(moduleId, crud = {}) {
  const resolvedModuleId = ROUTE_TO_MODULE[moduleId] || moduleId;
  const keys = MODULE_REFRESH_CLUSTERS[resolvedModuleId] || MODULE_REFRESH_CLUSTERS[moduleId] || [resolvedModuleId];
  return Promise.allSettled(keys.map((key) => crud[key]?.refresh?.()).filter(Boolean));
}

/** Rafraîchit les tables touchées par un événement métier précis. */
export async function refreshBusinessEventCluster(eventId, crud = {}) {
  const keys = BUSINESS_EVENT_REFRESH_CLUSTERS[eventId] || ['business_events', 'alertes_center', 'taches'];
  return Promise.allSettled(keys.map((key) => crud[key]?.refresh?.()).filter(Boolean));
}
