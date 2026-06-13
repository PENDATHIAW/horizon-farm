import { navigateForIaFinding } from '../../utils/commercialNavigation.js';

/** Onglet par défaut lors d'une navigation depuis le Centre décisionnel. */
export const VISION_MODULE_TABS = {
  activite_suivi: 'Alertes',
  commercial: 'Résumé',
  finance_pilotage: 'Trésorerie',
  achats_stock: 'Stock',
  elevage: 'Résumé',
  documents_rapports: 'Preuves',
  objectifs_croissance: 'Suivi du Business Plan',
  centre_ia: 'Urgences & risques',
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
  const module = risk.module || 'dashboard';
  let tab = risk.navTab || null;
  if (!tab) {
    if (risk.id === 'receivable') tab = 'Clients';
    else if (risk.id === 'cash-negative') tab = 'Trésorerie';
    else if (risk.id === 'missing-proof') tab = 'Preuves';
    else if (module === 'activite_suivi') tab = risk.domain === 'Alerte' ? 'Alertes' : 'Tâches';
    else if (module === 'achats_stock') tab = 'Stock';
    else if (module === 'elevage') tab = 'Santé';
    else tab = VISION_MODULE_TABS[module] || null;
  }
  navigateVision(onNavigate, module, tab);
}

export function navigateVisionPriority(onNavigate, item = {}) {
  if (!onNavigate) return;
  if (item.finding) {
    navigateVisionFinding(onNavigate, item.finding);
    return;
  }
  const module = item.navModule || item.sourceModule;
  if (item.tab && ['Performance', 'Prévisions', 'Plans', 'Financeurs'].includes(item.tab)) {
    navigateVision(onNavigate, 'objectifs_croissance', item.tab);
    return;
  }
  if (module) navigateVision(onNavigate, module, item.navTab || VISION_MODULE_TABS[module]);
}
