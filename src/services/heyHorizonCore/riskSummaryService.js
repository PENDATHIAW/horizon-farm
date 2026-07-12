import { runErpHealthEngine } from '../erpHealthEngine.js';
import { filterRealOpenTasks } from '../../utils/healthFindingLabels.js';
import { arr, low, metaBase, pickRows } from './coreUtils.js';

const isOpenAlert = (row = {}) => !['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'clos', 'closed'].includes(
  low(row.status || row.statut),
);
const isOpenTask = (row = {}) => !['termine', 'terminé', 'done', 'closed', 'clos'].includes(low(row.status || row.statut));

function buildEngineInput(dataMap = {}) {
  return {
    ...dataMap,
    animaux: pickRows(dataMap, 'animaux'),
    avicole: pickRows(dataMap, 'lots', 'avicole'),
    lots: pickRows(dataMap, 'lots', 'avicole'),
    cultures: pickRows(dataMap, 'cultures'),
    stock: pickRows(dataMap, 'stocks', 'stock'),
    stocks: pickRows(dataMap, 'stocks', 'stock'),
    clients: pickRows(dataMap, 'clients'),
    fournisseurs: pickRows(dataMap, 'fournisseurs'),
    sales_orders: pickRows(dataMap, 'sales_orders', 'salesOrders'),
    salesOrders: pickRows(dataMap, 'sales_orders', 'salesOrders'),
    payments: pickRows(dataMap, 'payments'),
    finances: pickRows(dataMap, 'finances', 'transactions'),
    transactions: pickRows(dataMap, 'finances', 'transactions'),
    documents: pickRows(dataMap, 'documents'),
    alertes_center: pickRows(dataMap, 'alertes_center', 'alertes'),
    taches: pickRows(dataMap, 'taches', 'tasks'),
    business_plans: pickRows(dataMap, 'business_plans'),
    investissements: pickRows(dataMap, 'investissements'),
    alimentation_logs: pickRows(dataMap, 'alimentation_logs', 'alimentationLogs'),
    production_oeufs_logs: pickRows(dataMap, 'production_oeufs_logs', 'productionLogs'),
    sales_opportunities: pickRows(dataMap, 'sales_opportunities'),
  };
}

/**
 * Synthèse risques — moteur ERP Health en lecture seule (aucune écriture).
 */
export function getRiskSummary(dataMap = {}) {
  const alertes = pickRows(dataMap, 'alertes_center', 'alertes').filter(isOpenAlert);
  const taches = filterRealOpenTasks(pickRows(dataMap, 'taches', 'tasks').filter(isOpenTask));

  const health = runErpHealthEngine(buildEngineInput(dataMap));

  const topFindings = arr(health.findings).slice(0, 8).map((finding) => ({
    id: finding.id || null,
    title: finding.title || 'Non renseigné',
    severity: finding.severity || 'moyenne',
    module: finding.module || null,
    category: finding.category || finding.type || null,
    recommended_action: finding.recommended_action || finding.description || null,
  }));

  return {
    ...metaBase({ module: 'centre_decisionnel' }),
    health_score: health.score ?? 0,
    counts: {
      findings_total: health.counts?.total ?? arr(health.findings).length,
      critical: health.counts?.critical ?? 0,
      coherence: health.counts?.coherence ?? 0,
      predictions: health.counts?.predictions ?? 0,
      alertes_ouvertes: alertes.length,
      taches_ouvertes: taches.length,
    },
    top_findings: topFindings,
    predictions_count: arr(health.predictions).length,
    auto_actions_pending: {
      tasks: arr(health.autoTasks).length,
      alerts: arr(health.autoAlerts).length,
    },
  };
}

export default getRiskSummary;
