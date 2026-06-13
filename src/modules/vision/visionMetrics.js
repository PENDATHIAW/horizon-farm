import { MODULE_TARGET_TABS } from '../../config/horizonVision.config.js';
import { isOpportunityOpen } from '../commercial/commercialMetrics.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0) || 0;
const low = (v) => String(v || '').toLowerCase();
const isClosedGoal = (row = {}) => ['termine', 'terminé', 'closed', 'clos', 'done'].includes(low(row.status || row.statut || row.state));

const TAB_ALIASES = {
  Performance: 'Suivi du Business Plan',
  Prévisions: 'Efficacité Technique & Zootechnique',
  Plans: 'Sécurisation des Flux',
  Financeurs: 'Sécurisation des Flux',
  Graphiques: 'Suivi du Business Plan',
  Annexe: 'Suivi du Business Plan',
  'Rentabilité Lot & Cycle': 'Suivi du Business Plan',
  'Efficacité Technique': 'Efficacité Technique & Zootechnique',
  'Flux & Équilibres': 'Sécurisation des Flux',
  'Maraîchage & Diversification': 'Simulateur Sandbox',
  Opportunités: 'Croissance & opportunités',
  'Opportunités & cycles': 'Croissance & opportunités',
  'À traiter': 'Urgences & risques',
  Priorités: 'Urgences & risques',
  'Priorités & risques': 'Urgences & risques',
  Recommandations: 'Croissance & opportunités',
  Risques: 'Urgences & risques',
  Cycles: 'Saisons & marchés',
  Historique: 'Saisons & marchés',
  Annexe: 'Saisons & marchés',
};

const STRATEGIC_TABS = new Set([
  'Suivi du Business Plan',
  'Efficacité Technique & Zootechnique',
  'Simulateur Sandbox',
  'Sécurisation des Flux',
  'Rentabilité Lot & Cycle',
  'Efficacité Technique',
  'Flux & Équilibres',
  'Maraîchage & Diversification',
  'Performance',
  'Prévisions',
  'Plans',
  'Financeurs',
]);
const OPERATIONAL_TABS = new Set([
  'Urgences & risques',
  'Croissance & opportunités',
  'Saisons & marchés',
  'À traiter',
  'Recommandations',
  'Risques',
  'Cycles',
  'Historique',
  'Opportunités',
]);

/** Onglet demandé → onglet valide pour ce module, ou redirection vers le module jumeau. */
export function resolveVisionTab(moduleId, requestedTab, onNavigate) {
  const tabs = MODULE_TARGET_TABS[moduleId] || [];
  const fallback = tabs[0] || 'Urgences & risques';
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
    const resolvedTab = TAB_ALIASES[mappedTab] || mappedTab;
    const localTabs = MODULE_TARGET_TABS[moduleId] || [];
    if (localTabs.includes(resolvedTab)) {
      setTab?.(resolvedTab);
    } else if (localTabs.includes(mappedTab)) {
      setTab?.(mappedTab);
    } else {
      onNavigate?.('centre_ia', { tab: resolvedTab });
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
