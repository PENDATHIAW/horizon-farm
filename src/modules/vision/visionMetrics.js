import { MODULE_TARGET_TABS } from '../../config/horizonVision.config.js';
import { isOpportunityOpen } from '../commercial/commercialMetrics.js';
import { buildDecisionCenterData } from './decisionCenterMetrics.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const isClosedGoal = (row = {}) => ['termine', 'terminé', 'closed', 'clos', 'done'].includes(low(row.status || row.statut || row.state));

const LEGACY_CENTRE_TAB_MAP = {
  'À traiter': 'Rentabilité lots',
  Risques: 'Efficacité',
  Opportunités: 'Rentabilité lots',
  Cycles: 'Flux & stocks',
};

/** Onglet demandé → onglet valide pour ce module, ou redirection vers le module jumeau. */
export function resolveVisionTab(moduleId, requestedTab, onNavigate) {
  const tabs = MODULE_TARGET_TABS[moduleId] || [];
  const fallback = tabs[0] || 'Rentabilité lots';
  const normalizedTab = moduleId === 'centre_ia' && requestedTab ? (LEGACY_CENTRE_TAB_MAP[requestedTab] || requestedTab) : requestedTab;
  if (!normalizedTab || tabs.includes(normalizedTab)) {
    return normalizedTab && tabs.includes(normalizedTab) ? normalizedTab : fallback;
  }
  const sibling = moduleId === 'centre_ia' ? 'objectifs_croissance' : 'centre_ia';
  const siblingTabs = MODULE_TARGET_TABS[sibling] || [];
  if (siblingTabs.includes(normalizedTab)) {
    onNavigate?.(sibling, { tab: normalizedTab });
    return fallback;
  }
  return fallback;
}

const STRATEGIC_TABS = new Set(['Performance', 'Prévisions', 'Plans', 'Financeurs']);
const OPERATIONAL_TABS = new Set(['Rentabilité lots', 'Efficacité', 'Flux & stocks', 'Maraîchage', 'Graphiques', 'À traiter', 'Risques', 'Opportunités', 'Cycles']);

/** Ouvre l'onglet priorité sur le bon module (Centre vs Objectifs). */
export function openVisionPriority(item = {}, moduleId = 'centre_ia', { setTab, onNavigate } = {}) {
  const targetTab = item.tab || item.targetTab;
  const targetModule = item.navModule || item.sourceModule;
  const mappedTab = moduleId === 'centre_ia' && targetTab ? (LEGACY_CENTRE_TAB_MAP[targetTab] || targetTab) : targetTab;

  if (mappedTab && STRATEGIC_TABS.has(mappedTab)) {
    onNavigate?.('objectifs_croissance', { tab: mappedTab });
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

export function buildVisionBadges(data = {}, moduleId = 'centre_ia', sourceProps = {}) {
  const openOpportunities = arr(data.openOpportunities).length ? arr(data.openOpportunities) : arr(data.opportunities).filter(isOpportunityOpen);
  const predictionsCount = arr(data.predictions).length;
  const missingProof = n(data.missingProof);
  const unreliableMargins = n(data.unreliableMargins);
  const openPlans = arr(data.goals).filter((g) => !isClosedGoal(g)).length;

  const tabs = {};
  if (moduleId === 'centre_ia') {
    const dc = buildDecisionCenterData({
      lots: data.lots,
      animaux: data.animaux,
      stocks: data.stocks,
      alimentationLogs: sourceProps.alimentationLogs,
      productionLogs: sourceProps.productionLogs,
      salesOrders: sourceProps.salesOrdersAll || sourceProps.salesOrders,
      payments: sourceProps.paymentsAll || sourceProps.payments,
      sante: sourceProps.sante,
      businessEvents: sourceProps.businessEvents,
      marketPrices: sourceProps.marketPrices,
    });
    if (dc.alertCounts.rentabilite > 0) tabs['Rentabilité lots'] = dc.alertCounts.rentabilite;
    if (dc.alertCounts.efficacite > 0) tabs.Efficacité = dc.alertCounts.efficacite;
    if (dc.alertCounts.flux > 0) tabs['Flux & stocks'] = dc.alertCounts.flux;
  } else {
    if (unreliableMargins > 0) tabs.Performance = unreliableMargins;
    if (predictionsCount > 0) tabs.Prévisions = predictionsCount;
    if (openPlans > 0) tabs.Plans = openPlans;
    if (missingProof > 0) tabs.Financeurs = missingProof;
  }

  return { tabs, openOpportunities: openOpportunities.length };
}
