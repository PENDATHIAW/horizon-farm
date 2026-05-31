import { MODULE_TARGET_TABS } from '../../config/horizonVision.config.js';
import { isOpportunityOpen } from '../commercial/commercialMetrics.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const isClosedGoal = (row = {}) => ['termine', 'terminé', 'closed', 'clos', 'done'].includes(low(row.status || row.statut || row.state));

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

/** Onglet demandé → onglet valide pour ce module, ou redirection vers le module jumeau. */
export function resolveVisionTab(moduleId, requestedTab, onNavigate) {
  const tabs = MODULE_TARGET_TABS[moduleId] || [];
  const fallback = tabs[0] || 'À traiter';
  let normalizedTab = requestedTab;
  if (moduleId === 'objectifs_croissance' && requestedTab) {
    normalizedTab = OBJECTIFS_TAB_ALIASES[requestedTab] || requestedTab;
  }
  if (moduleId === 'centre_ia' && requestedTab) {
    normalizedTab = CENTRE_TAB_ALIASES[requestedTab] || requestedTab;
  }
  if (!normalizedTab || tabs.includes(normalizedTab)) {
    return normalizedTab && tabs.includes(normalizedTab) ? normalizedTab : fallback;
  }
  const sibling = moduleId === 'centre_ia' ? 'objectifs_croissance' : 'centre_ia';
  const siblingTabs = MODULE_TARGET_TABS[sibling] || [];
  const siblingMapped = sibling === 'objectifs_croissance'
    ? (OBJECTIFS_TAB_ALIASES[requestedTab] || requestedTab)
    : (CENTRE_TAB_ALIASES[requestedTab] || requestedTab);
  if (siblingTabs.includes(siblingMapped)) {
    onNavigate?.(sibling, { tab: siblingMapped });
    return fallback;
  }
  return fallback;
}

const STRATEGIC_TABS = new Set([
  'Performance', 'Prévisions', 'Plans', 'Financeurs',
  'Objectifs & Écarts', 'Croissance économique & Capacités', 'Tableau de bord graphique',
]);
const OPERATIONAL_TABS = new Set([
  'À traiter', 'Risques', 'Opportunités', 'Cycles',
  'Recommandations', 'Opportunités & cycles', 'Historique',
]);

/** Ouvre l'onglet priorité sur le bon module (Centre vs Objectifs). */
export function openVisionPriority(item = {}, moduleId = 'centre_ia', { setTab, onNavigate } = {}) {
  const targetTab = item.tab || item.targetTab;
  const targetModule = item.navModule || item.sourceModule;

  if (targetTab && STRATEGIC_TABS.has(targetTab)) {
    const mapped = OBJECTIFS_TAB_ALIASES[targetTab] || targetTab;
    onNavigate?.('objectifs_croissance', { tab: mapped });
    return;
  }
  if (targetTab && OPERATIONAL_TABS.has(targetTab)) {
    const mapped = CENTRE_TAB_ALIASES[targetTab] || targetTab;
    const localTabs = MODULE_TARGET_TABS[moduleId] || [];
    if (localTabs.includes(mapped)) {
      setTab?.(mapped);
    } else {
      onNavigate?.('centre_ia', { tab: mapped });
    }
    return;
  }
  if (targetModule) onNavigate?.(targetModule);
}

export function buildVisionBadges(data = {}, moduleId = 'centre_ia') {
  const treatCount = arr(data.priorities).length;
  const risksCount = arr(data.risks).length;
  const criticalRisks = arr(data.risks).filter((r) => r.tone === 'bad').length;
  const openOpportunities = arr(data.openOpportunities).length ? arr(data.openOpportunities) : arr(data.opportunities).filter(isOpportunityOpen);
  const predictionsCount = arr(data.predictions).length;
  const missingProof = n(data.missingProof);
  const unreliableMargins = n(data.unreliableMargins);
  const openPlans = arr(data.goals).filter((g) => !isClosedGoal(g)).length;

  const tabs = {};
  if (moduleId === 'centre_ia') {
    if (treatCount > 0) tabs['À traiter'] = treatCount;
    if (risksCount > 0) tabs.Risques = criticalRisks || risksCount;
    if (openOpportunities.length > 0) tabs['Opportunités & cycles'] = openOpportunities.length;
    const cycleSignals = n(data.criticalStockCount) + n(data.openAlertsCount);
    if (cycleSignals > 0) tabs['Opportunités & cycles'] = (tabs['Opportunités & cycles'] || 0) + cycleSignals;
  } else {
    if (unreliableMargins > 0) tabs['Objectifs & Écarts'] = unreliableMargins;
    if (predictionsCount > 0) tabs['Croissance économique & Capacités'] = predictionsCount;
    if (openPlans > 0) tabs['Croissance économique & Capacités'] = (tabs['Croissance économique & Capacités'] || 0) + openPlans;
    if (missingProof > 0) tabs['Croissance économique & Capacités'] = (tabs['Croissance économique & Capacités'] || 0) + missingProof;
  }

  return { tabs, treatCount, risksCount, openOpportunities: openOpportunities.length };
}
