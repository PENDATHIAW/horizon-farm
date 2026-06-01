import { MODULE_TARGET_TABS } from '../../config/horizonVision.config.js';
import { isOpportunityOpen } from '../commercial/commercialMetrics.js';
import { buildCycleOverview } from '../elevage/cycleSummary.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const isClosedGoal = (row = {}) => ['termine', 'terminé', 'closed', 'clos', 'done'].includes(low(row.status || row.statut || row.state));

/** Onglet demandé → onglet valide pour ce module, ou redirection vers le module jumeau. */
export function resolveVisionTab(moduleId, requestedTab, onNavigate) {
  const tabs = MODULE_TARGET_TABS[moduleId] || [];
  const fallback = tabs[0] || 'À traiter';
  if (!requestedTab || tabs.includes(requestedTab)) {
    return requestedTab && tabs.includes(requestedTab) ? requestedTab : fallback;
  }
  const sibling = moduleId === 'centre_ia' ? 'objectifs_croissance' : 'centre_ia';
  const siblingTabs = MODULE_TARGET_TABS[sibling] || [];
  if (siblingTabs.includes(requestedTab)) {
    onNavigate?.(sibling, { tab: requestedTab });
    return fallback;
  }
  return fallback;
}

const STRATEGIC_TABS = new Set(['Performance', 'Prévisions', 'Plans', 'Financeurs']);
const OPERATIONAL_TABS = new Set(['À traiter', 'Risques', 'Opportunités', 'Cycles']);

/** Ouvre l'onglet priorité sur le bon module (Centre vs Objectifs). */
export function openVisionPriority(item = {}, moduleId = 'centre_ia', { setTab, onNavigate } = {}) {
  const targetTab = item.tab || item.targetTab;
  const targetModule = item.navModule || item.sourceModule;

  if (targetTab && STRATEGIC_TABS.has(targetTab)) {
    onNavigate?.('objectifs_croissance', { tab: targetTab });
    return;
  }
  if (targetTab && OPERATIONAL_TABS.has(targetTab)) {
    const localTabs = MODULE_TARGET_TABS[moduleId] || [];
    if (localTabs.includes(targetTab)) {
      setTab?.(targetTab);
    } else {
      onNavigate?.('centre_ia', { tab: targetTab });
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
    if (openOpportunities.length > 0) tabs.Opportunités = openOpportunities.length;
    const cycleSignals = n(data.cycleWarningCount) || (n(data.criticalStockCount) + n(data.openAlertsCount));
    if (cycleSignals > 0) tabs.Cycles = cycleSignals;
  } else {
    if (unreliableMargins > 0) tabs.Performance = unreliableMargins;
    if (predictionsCount > 0) tabs.Prévisions = predictionsCount;
    if (openPlans > 0) tabs.Plans = openPlans;
    if (missingProof > 0) tabs.Financeurs = missingProof;
  }

  return { tabs, treatCount, risksCount, openOpportunities: openOpportunities.length };
}
