import { evaluateStockRules } from './stockRules.js';
import { evaluateSalesRules } from './salesRules.js';
import { evaluateFinanceRules } from './financeRules.js';
import { evaluateLivestockRules } from './livestockRules.js';
import { evaluateDocumentRules } from './documentRules.js';
import { evaluateTaskAlertRules } from './taskAlertRules.js';
import { evaluateCoherenceRules } from './coherenceRules.js';
import { evaluateRiskRules } from './riskRules.js';
import { evaluatePredictiveRules } from './predictiveRules.js';
import { evaluateProfitabilityRules } from './profitabilityRules.js';
import { evaluateModuleDataCoverage } from '../moduleDataCoverageAudit.js';

const arr = (v) => (Array.isArray(v) ? v : []);

/** Phase 1 — audit automatique sans IA générative. Préférer runErpAuditEngine pour l'audit complet. */
export function computeErpAuditFindings(data = {}) {
  return [
    ...evaluateStockRules(arr(data.stock || data.stocks)),
    ...evaluateSalesRules(arr(data.sales_orders || data.salesOrders), arr(data.payments)),
    ...evaluateFinanceRules(arr(data.finances || data.transactions), arr(data.taches || data.tasks)),
    ...evaluateLivestockRules(arr(data.animaux), arr(data.avicole || data.lots), arr(data.sante)),
    ...evaluateDocumentRules(arr(data.finances || data.transactions)),
    ...evaluateTaskAlertRules(arr(data.taches || data.tasks), arr(data.alertes_center || data.alertes)),
    ...evaluateCoherenceRules(data),
    ...evaluateProfitabilityRules(data),
    ...evaluateModuleDataCoverage(data).findings,
  ].sort((a, b) => {
    const rank = { critique: 0, haute: 1, moyenne: 2, basse: 3 };
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
  });
}

export {
  evaluateStockRules,
  evaluateSalesRules,
  evaluateFinanceRules,
  evaluateLivestockRules,
  evaluateDocumentRules,
  evaluateTaskAlertRules,
  evaluateCoherenceRules,
  evaluateRiskRules,
  evaluatePredictiveRules,
  evaluateProfitabilityRules,
};
