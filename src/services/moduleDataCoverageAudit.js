import { DATA_SOURCES_OF_TRUTH } from './dataSourcesOfTruth.js';

const ENRICHED_MODULES = [
  'dashboard',
  'centre_ia',
  'objectifs_croissance',
  'commercial',
  'finance_pilotage',
  'documents_rapports',
  'assistant_erp',
];

const REQUIRED_DATA_KEYS = [
  'sales_orders',
  'payments',
  'finances',
  'stock',
  'avicole',
  'animaux',
  'production_oeufs_logs',
  'alimentation_logs',
  'sante',
  'taches',
  'alertes_center',
  'documents',
  'business_events',
  'sales_opportunities',
  'clients',
  'fournisseurs',
];

const arr = (value) => (Array.isArray(value) ? value : []);

function resolveDataKey(data = {}, key = '') {
  const aliases = {
    sales_orders: ['sales_orders', 'salesOrders'],
    payments: ['payments'],
    finances: ['finances', 'transactions'],
    stock: ['stock', 'stocks'],
    avicole: ['avicole', 'lots'],
    alertes_center: ['alertes_center', 'alertes'],
    taches: ['taches', 'tasks'],
    production_oeufs_logs: ['production_oeufs_logs', 'productionLogs'],
    alimentation_logs: ['alimentation_logs', 'alimentationLogs'],
    business_events: ['business_events', 'businessEvents'],
    sales_opportunities: ['sales_opportunities', 'opportunities'],
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
    severity: ['sales_orders', 'payments', 'finances', 'stock'].includes(key) ? 'haute' : 'moyenne',
    title: `Donnée source absente : ${key}`,
    description: `Aucun enregistrement ${key} — KPI enrichis potentiellement incomplets`,
    recommended_action: `Alimenter ${DATA_SOURCES_OF_TRUTH[key.replace(/s$/, '')]?.table || key} depuis le module source`,
    category: 'coverage',
    source_records: [{ type: 'dataset', id: key }],
  }));

  return {
    modules,
    coverage,
    missing,
    complete: missing.length === 0,
    findings,
  };
}

export default evaluateModuleDataCoverage;
