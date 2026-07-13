import { matchModuleTab, resolveModuleTab } from '../../config/moduleTabs/index.js';
import { isOpportunityOpen } from '../commercial/commercialMetrics.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0) || 0;
const low = (v) => String(v || '').toLowerCase();
const isClosedGoal = (row = {}) => ['termine', 'terminé', 'closed', 'clos', 'done'].includes(low(row.status || row.statut || row.state));

const canonicalVisionModule = (moduleId) => (moduleId === 'centre_ia' ? 'centre_decisionnel' : moduleId);
const siblingVisionModule = (moduleId) => (canonicalVisionModule(moduleId) === 'centre_decisionnel' ? 'objectifs_croissance' : 'centre_decisionnel');
const tabComponent = (moduleId, value) => matchModuleTab(moduleId, value)?.component || null;
const defaultTabComponent = (moduleId) => resolveModuleTab(moduleId, '')?.component || '';

/** Onglet demandé → onglet valide pour ce module, ou redirection vers le module jumeau. */
export function resolveVisionTab(moduleId, requestedTab, onNavigate) {
  const fallback = defaultTabComponent(moduleId);
  if (!requestedTab) return fallback;
  const localTab = tabComponent(moduleId, requestedTab);
  if (localTab) return localTab;
  const sibling = siblingVisionModule(moduleId);
  const siblingTab = tabComponent(sibling, requestedTab);
  if (siblingTab) {
    onNavigate?.(sibling, { tab: siblingTab });
    return fallback;
  }
  return fallback;
}

/** Ouvre l'onglet priorité sur le bon module (Centre vs Objectifs). */
export function openVisionPriority(item = {}, moduleId = 'centre_ia', { setTab, onNavigate } = {}) {
  const requestedTab = item.navTab || item.tab || item.targetTab;
  const explicitModule = item.navModule;
  if (explicitModule) {
    const destination = canonicalVisionModule(explicitModule);
    const destinationTab = requestedTab ? (tabComponent(destination, requestedTab) || requestedTab) : null;
    onNavigate?.(destination, destinationTab ? { tab: destinationTab } : undefined);
    return;
  }

  const localTab = requestedTab ? tabComponent(moduleId, requestedTab) : null;
  if (localTab) {
    setTab?.(localTab);
    return;
  }

  const sibling = siblingVisionModule(moduleId);
  const siblingTab = requestedTab ? tabComponent(sibling, requestedTab) : null;
  if (siblingTab) {
    onNavigate?.(sibling, { tab: siblingTab });
    return;
  }

  if (item.sourceModule) onNavigate?.(canonicalVisionModule(item.sourceModule));
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
    const urgentBadge = treatCount + criticalRisks;
    if (urgentBadge > 0) tabs['Urgences & risques'] = urgentBadge;
    const cycleSignals = n(data.criticalStockCount) + n(data.openAlertsCount);
    if (cycleSignals > 0) tabs['Saisons & marchés'] = cycleSignals;
    if (openOpportunities.length > 0) tabs['Croissance & opportunités'] = openOpportunities.length;
  } else {
    if (unreliableMargins > 0) tabs['Efficacité Technique & Zootechnique'] = unreliableMargins;
    if (predictionsCount > 0) tabs['Efficacité Technique & Zootechnique'] = (tabs['Efficacité Technique & Zootechnique'] || 0) + predictionsCount;
    if (openPlans > 0) tabs['Sécurisation des Flux'] = openPlans;
    if (missingProof > 0) tabs['Simulateur Sandbox'] = missingProof;
  }

  return { tabs, treatCount, risksCount, openOpportunities: openOpportunities.length };
}
