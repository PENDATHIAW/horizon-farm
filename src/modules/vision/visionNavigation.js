import { navigateForIaFinding } from '../../utils/commercialNavigation.js';
import { navigateFromPilotageItem, PILOTAGE_NAV_TARGETS } from '../../utils/centreDecisionWorkflow.js';

/** Onglet par défaut lors d'une navigation depuis le Centre décisionnel. */
export const VISION_MODULE_TABS = {
  activite_suivi: 'Alertes',
  commercial: 'Résumé',
  finance_pilotage: 'Trésorerie',
  achats_stock: 'Stock',
  elevage: 'Santé',
  documents_rapports: 'Preuves',
  objectifs_croissance: 'Performance',
  centre_ia: 'À traiter',
  ...Object.fromEntries(Object.entries(PILOTAGE_NAV_TARGETS).map(([key, value]) => [key, value.tab])),
};

export function navigateVision(onNavigate, module = '', tab = null) {
  if (!onNavigate || !module) return;
  if (tab) onNavigate(module, { tab });
  else onNavigate(module);
}

export function navigateVisionFinding(onNavigate, finding = {}) {
  if (!onNavigate) return;
  navigateForIaFinding(finding, onNavigate);
}

export function navigateVisionRisk(onNavigate, risk = {}) {
  if (!onNavigate) return;
  navigateFromPilotageItem(onNavigate, risk);
}

export function navigateVisionPriority(onNavigate, item = {}) {
  if (!onNavigate) return;
  if (item.finding) {
    navigateVisionFinding(onNavigate, item.finding);
    return;
  }
  if (item.tab && ['Performance', 'Prévisions', 'Plans', 'Financeurs'].includes(item.tab)) {
    navigateVision(onNavigate, 'objectifs_croissance', item.tab);
    return;
  }
  navigateFromPilotageItem(onNavigate, item);
}
