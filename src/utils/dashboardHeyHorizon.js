import { interpretHorizonCommand } from '../services/aiIntentEngine.js';

const PILOTAGE_ROUTES = {
  money: { module: 'commercial', tab: 'Clients & créances', label: 'Créances clients' },
  alert: { module: 'centre_ia', tab: 'À traiter', label: 'Anomalies techniques' },
  stock: { module: 'achats_stock', tab: 'Stock', label: 'Stocks critiques' },
  health: { module: 'elevage', tab: 'Santé', label: 'Soins à traiter' },
  task: { module: 'activite_suivi', tab: 'Tâches', label: 'Tâches du jour' },
  document: { module: 'documents_rapports', tab: 'Preuves', label: 'Preuves manquantes' },
  smart: { module: 'objectifs_croissance', tab: 'Rentabilité Lot & Cycle', label: 'Rentabilité lots' },
  sync: { module: 'centre_ia', tab: 'Urgences & risques', label: 'Flux & stocks' },
};

/** Suggestions Accueil → pilotage (objectifs, risques, cycles) - pas Hey Horizon. */
export function buildDashboardPilotageSuggestions(actions = [], goal = {}) {
  const suggestions = [];
  const attainment = Number(goal.periodAttainment ?? goal.attainment ?? 0);
  suggestions.push({
    id: 'goal-month',
    label: attainment >= 100 ? 'Objectif atteint' : 'Objectif du mois',
    module: 'objectifs_croissance',
    tab: 'Performance',
    productionQuestion: null,
    tone: attainment >= 90 ? 'good' : attainment >= 50 ? 'warn' : 'bad',
    detail: goal.periodSubtitle
      ? `${goal.periodLabel || 'Objectif'} · ${attainment}%`
      : `${attainment}% réalisé`,
  });
  suggestions.push({
    id: 'cycles-bandes',
    label: 'Quand lancer une bande ?',
    module: 'elevage',
    tab: 'Cycles',
    productionQuestion: 'new_layer_band',
    tone: 'neutral',
    detail: 'Cycles chair, pondeuses, bovins',
  });
  actions.slice(0, 2).forEach((action, index) => {
    const route = PILOTAGE_ROUTES[action.iconKey];
    if (!route) return;
    suggestions.push({
      id: `pilotage-${action.iconKey}-${index}`,
      label: route.label,
      module: route.module,
      tab: route.tab,
      tone: action.tone === 'red' ? 'bad' : action.tone === 'amber' ? 'warn' : 'neutral',
      detail: action.detail,
    });
  });
  return suggestions.slice(0, 4);
}

/** Actions terrain → Hey Horizon (vente, achat…). */
export function buildDashboardActionSuggestions() {
  return [
    { id: 'sale', label: 'Créer une vente', draft: true },
    { id: 'purchase', label: 'Déclarer un achat', text: 'J\'ai acheté ' },
  ];
}

/** @deprecated Utiliser buildDashboardPilotageSuggestions */
export function dashboardActionToHeyHorizonQuery() {
  return null;
}

/** @deprecated Utiliser buildDashboardPilotageSuggestions */
export function buildDashboardHeyHorizonSuggestions(actions = [], goal = {}) {
  return buildDashboardPilotageSuggestions(actions, goal);
}

/** Ouvre le module pilotage avec onglet / question production. */
export function launchPilotageSuggestion({
  module,
  tab,
  productionQuestion,
  onNavigate,
} = {}) {
  onNavigate?.(module, { tab, productionQuestion });
  if (productionQuestion) {
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('horizon-production-question', {
        detail: { questionId: productionQuestion, moduleId: module },
      }));
    }, 320);
  }
}

/** Ouvre Assistant ERP avec une question ou un brouillon préparé. */
export function launchHeyHorizonAssistant({
  query,
  draft,
  sourceLabel = 'Accueil',
  onNavigate,
  onOpenAssistant,
} = {}) {
  if (draft) {
    window.dispatchEvent(new CustomEvent('horizon-open-draft', { detail: { draft, sourceLabel } }));
  } else if (query) {
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('horizon-assistant-query', { detail: { query, sourceLabel } }));
    }, 320);
  }
  onOpenAssistant?.();
  onNavigate?.('assistant_erp');
}

/** Prépare un brouillon vente depuis l'Accueil. */
export function buildDashboardSaleDraft() {
  return interpretHorizonCommand('Créer une vente', {});
}
