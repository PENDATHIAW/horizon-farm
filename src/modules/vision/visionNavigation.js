import { navigateForIaFinding } from '../../utils/commercialNavigation.js';

/** Onglet par défaut lors d'une navigation depuis le Centre décisionnel. */
export const VISION_MODULE_TABS = {
  activite_suivi: 'Alertes',
  commercial: 'Résumé',
  finance_pilotage: 'Trésorerie',
  achats_stock: 'Stock',
  elevage: 'Résumé',
  documents_rapports: 'Preuves',
  objectifs_croissance: 'Objectifs & Écarts',
  centre_ia: 'À traiter',
};

const OBJECTIFS_TAB_ALIASES = {
  Performance: 'Objectifs & Écarts',
  Prévisions: 'Croissance économique & Capacités',
  Plans: 'Croissance économique & Capacités',
  Financeurs: 'Croissance économique & Capacités',
  Graphiques: 'Tableau de bord graphique',
};

const CENTRE_TAB_ALIASES = {
  Graphiques: 'Recommandations',
  Cycles: 'Opportunités & cycles',
  Opportunités: 'Opportunités & cycles',
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
  const strategicTabs = ['Performance', 'Prévisions', 'Plans', 'Financeurs', 'Objectifs & Écarts', 'Croissance économique & Capacités', 'Tableau de bord graphique'];
  const centreTabs = ['Graphiques', 'Cycles', 'Opportunités', 'Recommandations', 'Opportunités & cycles', 'Historique'];
  if (item.tab && strategicTabs.includes(item.tab)) {
    navigateVision(onNavigate, 'objectifs_croissance', OBJECTIFS_TAB_ALIASES[item.tab] || item.tab);
    return;
  }
  if (item.tab && centreTabs.includes(item.tab)) {
    navigateVision(onNavigate, 'centre_ia', CENTRE_TAB_ALIASES[item.tab] || item.tab);
    return;
  }
  const module = item.navModule || item.sourceModule;
  if (module) navigateVision(onNavigate, module, item.navTab || VISION_MODULE_TABS[module]);
}
