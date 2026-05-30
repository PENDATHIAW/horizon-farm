import { interpretHorizonCommand } from '../services/aiIntentEngine.js';

/** Mappe une action Accueil → question Hey Horizon. */
export function dashboardActionToHeyHorizonQuery(action = {}) {
  const byIcon = {
    money: 'Quels clients me doivent de l\'argent ?',
    alert: 'Quels risques bloquent la ferme ?',
    stock: 'Quels stocks sont critiques ?',
    health: 'Quels soins sont à traiter ?',
    task: 'Qu\'est-ce que je dois faire aujourd\'hui ?',
    document: 'Afficher les dépenses sans justificatif',
    smart: 'Quels sont mes risques du mois ?',
    sync: 'Quels sont mes risques du mois ?',
  };
  return byIcon[action.iconKey] || null;
}

/** Suggestions Hey Horizon depuis l'Accueil (objectif + priorités du jour). */
export function buildDashboardHeyHorizonSuggestions(actions = [], goal = {}) {
  const suggestions = [];
  const attainment = Number(goal.periodAttainment ?? goal.attainment ?? 0);
  suggestions.push({
    id: 'goal-month',
    label: attainment >= 100 ? 'Objectif atteint — analyser' : 'Objectif du mois',
    query: 'Où en suis-je sur mon objectif du mois ?',
    tone: attainment >= 90 ? 'good' : attainment >= 50 ? 'warn' : 'bad',
    detail: goal.periodSubtitle
      ? `${goal.periodLabel || 'Objectif'} · ${goal.periodSubtitle} · ${attainment}%`
      : `${attainment}% réalisé`,
  });
  actions.slice(0, 3).forEach((action, index) => {
    const query = dashboardActionToHeyHorizonQuery(action);
    if (!query) return;
    suggestions.push({
      id: `action-${action.iconKey}-${index}`,
      label: action.title,
      query,
      tone: action.tone === 'red' ? 'bad' : action.tone === 'amber' ? 'warn' : 'neutral',
      detail: action.detail,
    });
  });
  return suggestions.slice(0, 4);
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
