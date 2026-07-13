/**
 * Hey Horizon AI Core - socle central lecture seule pour futures fonctionnalités IA.
 *
 * Règles :
 * - Aucune écriture Supabase depuis ce module.
 * - Les propositions IA futures doivent passer par aiGateway (createAiActionDraft → validateAiDraftByUser → executeValidatedDraft).
 * - Les synthèses s'appuient sur composeDecisionDataMap / composeReportData quand un contexte CRUD est fourni.
 */

import { composeDecisionDataMap, composeReportData } from '../moduleDataComposer.js';
import { AI_DRAFT_SOURCES, TARGET_WORKFLOWS } from '../aiGateway/aiActionDrafts.js';
import {  metaBase } from './coreUtils.js';
import { getFarmSummary } from './farmSummaryService.js';
import { getFinancialSummary } from './financeSummaryService.js';
import { getPoultrySummary } from './poultrySummaryService.js';
import { getLivestockSummary } from './livestockSummaryService.js';
import { getInventorySummary } from './inventorySummaryService.js';
import { getSalesSummary } from './salesSummaryService.js';
import { getRiskSummary } from './riskSummaryService.js';

export {
  HEY_HORIZON_CORE_SOURCE,
  HEY_HORIZON_CORE_VERSION,
} from './coreUtils.js';

export { getFarmSummary } from './farmSummaryService.js';
export { getFinancialSummary } from './financeSummaryService.js';
export { getPoultrySummary } from './poultrySummaryService.js';
export { getLivestockSummary } from './livestockSummaryService.js';
export { getInventorySummary } from './inventorySummaryService.js';
export { getSalesSummary } from './salesSummaryService.js';
export { getRiskSummary } from './riskSummaryService.js';

/** Contrat AI Gateway réexporté pour les futurs connecteurs Core → Gateway. */
export { AI_DRAFT_SOURCES, TARGET_WORKFLOWS };

/**
 * Normalise un dataMap depuis le contexte App (CRUD + dataMap + météo).
 */
export function buildHeyHorizonCoreDataMap({ crud = {}, dataMap = {}, liveMeteo = null } = {}) {
  const decision = composeDecisionDataMap({ crud, dataMap, liveMeteo });
  const report = composeReportData(crud);
  return {
    ...report,
    ...decision,
    ...dataMap,
    meteo: liveMeteo ?? dataMap.meteo ?? null,
  };
}

/**
 * Agrège toutes les synthèses Core (sans écriture).
 */
export function getHeyHorizonCoreSnapshot(dataMap = {}) {
  return {
    farm: getFarmSummary(dataMap),
    finance: getFinancialSummary(dataMap),
    poultry: getPoultrySummary(dataMap),
    livestock: getLivestockSummary(dataMap),
    inventory: getInventorySummary(dataMap),
    sales: getSalesSummary(dataMap),
    risk: getRiskSummary(dataMap),
  };
}

/**
 * Synthèse « dossier financeur / investisseur » - indicateurs réels uniquement.
 */
export function getInvestorReadySummary(dataMap = {}) {
  const snapshot = getHeyHorizonCoreSnapshot(dataMap);
  const gaps = [];

  if (!snapshot.farm.counts.business_plans) gaps.push('Aucun business plan enregistré');
  if (snapshot.finance.transactions.sans_justificatif > 0) {
    gaps.push(`${snapshot.finance.transactions.sans_justificatif} transaction(s) sans justificatif`);
  }
  if (snapshot.finance.treasury.creances_clients > 0 && snapshot.sales.creances.commandes_impayees > 0) {
    gaps.push('Créances clients ouvertes à documenter');
  }
  if (snapshot.inventory.stock.sous_seuil > 0) {
    gaps.push(`${snapshot.inventory.stock.sous_seuil} produit(s) sous seuil stock`);
  }
  if (snapshot.risk.health_score < 70) {
    gaps.push(`Score santé ERP ${snapshot.risk.health_score}/100`);
  }
  if (snapshot.risk.counts.critical > 0) {
    gaps.push(`${snapshot.risk.counts.critical} finding(s) critique(s)`);
  }
  if (snapshot.farm.headcount.total === 0) {
    gaps.push('Effectifs exploitation non renseignés');
  }

  const readinessScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (snapshot.risk.health_score * 0.45)
        + (snapshot.finance.transactions.sans_justificatif === 0 ? 20 : Math.max(0, 20 - snapshot.finance.transactions.sans_justificatif * 2))
        + (snapshot.farm.counts.business_plans > 0 ? 15 : 0)
        + (snapshot.finance.business_plans_count > 0 ? 10 : 0)
        + (snapshot.sales.ventes.ca_cumul > 0 ? 10 : 0),
      ),
    ),
  );

  return {
    ...metaBase({ module: 'investor_ready' }),
    readiness_score: readinessScore,
    readiness_label: readinessScore >= 80 ? 'Solide' : readinessScore >= 55 ? 'En progression' : 'À renforcer',
    gaps,
    highlights: {
      effectif_total: snapshot.farm.headcount.total,
      ca_cumul: snapshot.sales.ventes.ca_cumul,
      tresorerie_resultat: snapshot.finance.treasury.resultat,
      creances_clients: snapshot.finance.treasury.creances_clients,
      valeur_stock: snapshot.inventory.stock.valeur_estimee,
      investissements_montant: snapshot.finance.investissements.montant_total,
      business_plans: snapshot.farm.counts.business_plans,
      health_score: snapshot.risk.health_score,
    },
    sections: {
      farm: snapshot.farm,
      finance: snapshot.finance,
      sales: snapshot.sales,
      inventory: snapshot.inventory,
      risk: {
        health_score: snapshot.risk.health_score,
        counts: snapshot.risk.counts,
        top_findings: snapshot.risk.top_findings,
      },
    },
  };
}

export default {
  buildHeyHorizonCoreDataMap,
  getFarmSummary,
  getFinancialSummary,
  getPoultrySummary,
  getLivestockSummary,
  getInventorySummary,
  getSalesSummary,
  getRiskSummary,
  getInvestorReadySummary,
  getHeyHorizonCoreSnapshot,
};
