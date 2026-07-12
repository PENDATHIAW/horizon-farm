import { DATA_SOURCES_OF_TRUTH } from './dataSourcesOfTruth.js';

const ENRICHED_MODULES = [
  'dashboard',
  'centre_decisionnel',
  'objectifs_croissance',
  'commercial',
  'finance_pilotage',
  'documents_rapports',
  'assistant_erp',
  'elevage',
  'cultures',
  'achats_stock',
  'activite_suivi',
  'financements',
  'equipements',
  'smartfarm',
  'agri_feeds',
];

const REQUIRED_DATA_KEYS = [
  'sales_orders',
  'sales_order_items',
  'payments',
  'finances',
  'stock',
  'stock_movements',
  'avicole',
  'animaux',
  'production_oeufs_logs',
  'alimentation_logs',
  'sante',
  'cultures',
  'taches',
  'alertes_center',
  'documents',
  'rapports',
  'business_events',
  'sales_opportunities',
  'clients',
  'fournisseurs',
  'investissements',
  'business_plans',
  'equipements',
  'sensor_devices',
  'feed_raw_materials',
  'feed_raw_batches',
  'feed_formulas',
  'feed_production_orders',
  'feed_finished_batches',
  'feed_quality_checks',
  'feed_trials',
  'feed_phase1_comparisons',
];

const CRITICAL_DATA_KEYS = new Set([
  'sales_orders',
  'payments',
  'finances',
  'stock',
  'stock_movements',
  'avicole',
  'production_oeufs_logs',
  'alimentation_logs',
  'cultures',
  'business_events',
  'documents',
]);

const arr = (value) => (Array.isArray(value) ? value : []);

function resolveDataKey(data = {}, key = '') {
  const aliases = {
    sales_orders: ['sales_orders', 'salesOrders'],
    sales_order_items: ['sales_order_items', 'orderItems'],
    payments: ['payments'],
    finances: ['finances', 'transactions'],
    stock: ['stock', 'stocks'],
    stock_movements: ['stock_movements', 'stockMovements'],
    avicole: ['avicole', 'lots'],
    animaux: ['animaux', 'animals'],
    alertes_center: ['alertes_center', 'alertes'],
    taches: ['taches', 'tasks'],
    production_oeufs_logs: ['production_oeufs_logs', 'productionLogs'],
    alimentation_logs: ['alimentation_logs', 'alimentationLogs'],
    business_events: ['business_events', 'businessEvents'],
    sales_opportunities: ['sales_opportunities', 'opportunities'],
    equipements: ['equipements', 'equipment'],
    sensor_devices: ['sensor_devices', 'sensors'],
    feed_raw_materials: ['feed_raw_materials', 'feedRawMaterials'],
    feed_raw_batches: ['feed_raw_batches', 'feedRawBatches'],
    feed_formulas: ['feed_formulas', 'feedFormulas'],
    feed_production_orders: ['feed_production_orders', 'feedProductionOrders'],
    feed_finished_batches: ['feed_finished_batches', 'feedFinishedBatches'],
    feed_quality_checks: ['feed_quality_checks', 'feedQualityChecks'],
    feed_trials: ['feed_trials', 'feedTrials'],
    feed_phase1_comparisons: ['feed_phase1_comparisons', 'feedPhase1Comparisons'],
  };
  const keys = aliases[key] || [key];
  for (const alias of keys) {
    const rows = arr(data[alias]);
    if (rows.length) return { key, count: rows.length, present: true };
  }
  return { key, count: 0, present: false };
}

/** Vérifie que les modules enrichis disposent des données sources nécessaires. */
export function evaluateModuleDataCoverage(data = {}, { modules = ENRICHED_MODULES } = {}) {
  const coverage = REQUIRED_DATA_KEYS.map((key) => resolveDataKey(data, key));
  const missing = coverage.filter((row) => !row.present).map((row) => row.key);
  const findings = missing.map((key) => ({
    id: `coverage-missing-${key}`,
    module: 'erp_audit',
    severity: CRITICAL_DATA_KEYS.has(key) ? 'haute' : 'moyenne',
    title: `Donnée source absente : ${key}`,
    description: `Aucun enregistrement ${key} — KPI, interconnexions ou rapports potentiellement incomplets`,
    recommended_action: `Alimenter ${DATA_SOURCES_OF_TRUTH[key.replace(/s$/, '')]?.table || key} depuis le module source ou vérifier le mapping`,
    category: 'coverage',
    source_records: [{ type: 'dataset', id: key }],
  }));

  const businessEventsCount = coverage.find((row) => row.key === 'business_events')?.count || 0;
  if (businessEventsCount === 0) {
    findings.push({
      id: 'coverage-missing-business-event-spine',
      module: 'erp_audit',
      severity: 'haute',
      title: 'Colonne vertébrale événements métier absente',
      description: 'Aucun événement métier n’est disponible pour relier automatiquement terrain, stock, finance, tâches et reporting.',
      recommended_action: 'Créer les workflows d’événements métier et enregistrer chaque geste terrain important dans business_events.',
      category: 'coverage',
      source_records: [{ type: 'dataset', id: 'business_events' }],
    });
  }

  return {
    modules,
    coverage,
    missing,
    complete: missing.length === 0,
    findings,
  };
}

export default evaluateModuleDataCoverage;
