/**
 * ASSISTANT_BUSINESS_COVERAGE_MATRIX — couverture métier par module sidebar.
 */

import { MODULE_BUSINESS_QUESTIONS } from './assistantBusinessQuestions.js';
import { FARM_NAV_SECTIONS } from './assistantFarmNavigation.js';

const CANONICAL_ENGINES = Object.freeze([
  'consolidateFinance',
  'buildConsolidatedCommercialKpis',
  'summarizeSalesMargins',
  'buildObjectifsCroissanceData',
  'computeFarmHeadcount',
  'computeCultureSummary',
  'computeStockSummary',
  'buildCarnetDomainCards',
  'buildDashboardSummary',
]);

const MODULE_ENGINES = Object.freeze({
  dashboard: ['buildDashboardSummary', 'buildCarnetDomainCards'],
  elevage: ['computeFarmHeadcount', 'buildCarnetDomainCards'],
  cultures: ['computeCultureSummary', 'buildCarnetDomainCards'],
  commercial: ['buildConsolidatedCommercialKpis', 'summarizeSalesMargins'],
  achats_stock: ['computeStockSummary'],
  finance_pilotage: ['consolidateFinance'],
  objectifs_croissance: ['buildObjectifsCroissanceData', 'buildConsolidatedCommercialKpis'],
  investisseurs_forums: ['consolidateFinance', 'buildConsolidatedCommercialKpis', 'summarizeSalesMargins', 'buildObjectifsCroissanceData'],
  centre_ia: ['buildCarnetDomainCards'],
  activite_suivi: ['buildCarnetDomainCards'],
  documents_rapports: ['business_events'],
  rh: ['taches'],
  sync_activity: ['buildCarnetDomainCards'],
  gestion_systeme: [],
  assistant_erp: ['buildCarnetDomainCards'],
});

function coverageStatus(moduleId) {
  const questions = MODULE_BUSINESS_QUESTIONS[moduleId] || [];
  if (!questions.length) return 'navigation_only';
  if (questions.length >= 4) return 'strong';
  if (questions.length >= 2) return 'partial';
  return 'minimal';
}

export function buildBusinessCoverageMatrix() {
  const rows = [];
  for (const [sectionKey, section] of Object.entries(FARM_NAV_SECTIONS)) {
    for (const moduleId of section.modules) {
      const questions = MODULE_BUSINESS_QUESTIONS[moduleId] || [];
      rows.push({
        section: section.label,
        sectionKey,
        moduleId,
        questionCount: questions.length,
        intents: questions.map((q) => q.intent),
        engines: MODULE_ENGINES[moduleId] || [],
        coverage: coverageStatus(moduleId),
      });
    }
  }
  return rows;
}

export const ASSISTANT_BUSINESS_COVERAGE_MATRIX = Object.freeze({
  sections: FARM_NAV_SECTIONS,
  engines: CANONICAL_ENGINES,
  modules: buildBusinessCoverageMatrix(),
});

export default ASSISTANT_BUSINESS_COVERAGE_MATRIX;
