import { MODULE_TARGET_TABS } from '../../config/horizonVision.config.js';
import { isOpportunityOpen } from '../commercial/commercialMetrics.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const isClosedGoal = (row = {}) => ['termine', 'terminé', 'closed', 'clos', 'done'].includes(low(row.status || row.statut || row.state));

const TAB_ALIASES = {
  Performance: 'Rentabilité Lot & Cycle',
  Prévisions: 'Efficacité Technique',
  Plans: 'Flux & Équilibres',
  Financeurs: 'Flux & Équilibres',
  Graphiques: 'Recommandations',
  Opportunités: 'Cycles',
  'Opportunités & cycles': 'Cycles',
};

const STRATEGIC_TABS = new Set([
  'Rentabilité Lot & Cycle',
  'Efficacité Technique',
  'Flux & Équilibres',
  'Maraîchage & Diversification',
  'Performance',
  'Prévisions',
  'Plans',
  'Financeurs',
]);
const OPERATIONAL_TABS = new Set(['À traiter', 'Recommandations', 'Risques', 'Cycles', 'Historique', 'Opportunités']);

/** Onglet demandé → onglet valide pour ce module, ou redirection vers le module jumeau. */
export function resolveVisionTab(moduleId, requestedTab, onNavigate) {
  const tabs = MODULE_TARGET_TABS[moduleId] || [];
  const fallback = tabs[0] || 'À traiter';
  const mapped = requestedTab ? (TAB_ALIASES[requestedTab] || requestedTab) : null;
  if (!mapped || tabs.includes(mapped)) {
    return mapped && tabs.includes(mapped) ? mapped : fallback;
  }
  const sibling = moduleId === 'centre_ia' ? 'objectifs_croissance' : 'centre_ia';
  const siblingTabs = MODULE_TARGET_TABS[sibling] || [];
  const siblingMapped = TAB_ALIASES[mapped] || mapped;
  if (siblingTabs.includes(siblingMapped)) {
    onNavigate?.(sibling, { tab: siblingMapped });
    return fallback;
  }
  return fallback;
}

/** Ouvre l'onglet priorité sur le bon module (Centre vs Objectifs). */
export function openVisionPriority(item = {}, moduleId = 'centre_ia', { setTab, onNavigate } = {}) {
  const targetTab = item.tab || item.targetTab;
  const targetModule = item.navModule || item.sourceModule;
  const mappedTab = targetTab ? (TAB_ALIASES[targetTab] || targetTab) : null;

  if (mappedTab && STRATEGIC_TABS.has(mappedTab)) {
    onNavigate?.('objectifs_croissance', { tab: TAB_ALIASES[mappedTab] || mappedTab });
    return;
  }
  if (mappedTab && OPERATIONAL_TABS.has(mappedTab)) {
    const localTabs = MODULE_TARGET_TABS[moduleId] || [];
    if (localTabs.includes(mappedTab)) {
      setTab?.(mappedTab);
    } else {
      onNavigate?.('centre_ia', { tab: mappedTab });
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
    const cycleSignals = n(data.criticalStockCount) + n(data.openAlertsCount);
    if (cycleSignals > 0) tabs.Cycles = cycleSignals;
  } else {
    if (unreliableMargins > 0) tabs['Rentabilité Lot & Cycle'] = unreliableMargins;
    if (predictionsCount > 0) tabs['Efficacité Technique'] = predictionsCount;
    if (openPlans > 0) tabs['Flux & Équilibres'] = openPlans;
    if (missingProof > 0) tabs['Maraîchage & Diversification'] = missingProof;
  }

  return { tabs, treatCount, risksCount, openOpportunities: openOpportunities.length };
}
