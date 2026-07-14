import { evaluateStockRules } from './stockRules.js';
import { evaluateSalesRules } from './salesRules.js';
import { evaluateFinanceRules } from './financeRules.js';
import { evaluateLivestockRules } from './livestockRules.js';
import { evaluateTaskAlertRules } from './taskAlertRules.js';
import { evaluateCoherenceRules } from './coherenceRules.js';
import { evaluateRiskRules } from './riskRules.js';
import { evaluatePredictiveRules } from './predictiveRules.js';
import { evaluateProfitabilityRules } from './profitabilityRules.js';
import { evaluateModuleDataCoverage } from '../moduleDataCoverageAudit.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const hasRows = (data = {}) => Object.values(data || {}).some((value) => Array.isArray(value) && value.length > 0);

/** Phase 1 - audit automatique sans IA générative. Préférer runErpAuditEngine pour l'audit complet. */
export function computeErpAuditFindings(data = {}) {
  const findings = [
    ...evaluateStockRules(arr(data.stock || data.stocks)),
    ...evaluateSalesRules(arr(data.sales_orders || data.salesOrders), arr(data.payments)),
    ...evaluateFinanceRules(arr(data.finances || data.transactions), arr(data.taches || data.tasks)),
    ...evaluateLivestockRules(arr(data.animaux), arr(data.avicole || data.lots), arr(data.sante)),
    ...evaluateTaskAlertRules(arr(data.taches || data.tasks), arr(data.alertes_center || data.alertes)),
    ...evaluateCoherenceRules(data),
    ...evaluateProfitabilityRules(data),
    ...evaluateModuleDataCoverage(data).findings,
  ];

  if (!findings.length && hasRows(data)) {
    findings.push({
      id: 'erp-audit-data-present',
      module: 'erp_audit',
      severity: 'basse',
      title: 'Données ERP détectées',
      description: 'Le moteur a reçu des données exploitables mais aucune règle critique ne s’est déclenchée.',
      recommended_action: 'Poursuivre le suivi et enrichir les règles métier selon les usages terrain.',
      confidence_score: 0.7,
      source_records: [{ type: 'dataset', id: 'erp' }],
    });
  }

  return findings.sort((a, b) => {
    const rank = { critique: 0, haute: 1, moyenne: 2, basse: 3 };
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
  });
}

export {
  evaluateStockRules,
  evaluateSalesRules,
  evaluateFinanceRules,
  evaluateLivestockRules,
  evaluateTaskAlertRules,
  evaluateCoherenceRules,
  evaluateRiskRules,
  evaluatePredictiveRules,
  evaluateProfitabilityRules,
};
