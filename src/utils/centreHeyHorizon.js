/**
 * Questions rapides Centre — alignées sur les 3 onglets (navigation, pas doublon Hey Horizon).
 */

export const CENTRE_HEY_HORIZON_QUESTIONS = [
  { id: 'urgences', label: 'Urgences', query: 'Que dois-je faire aujourd hui ?', moduleId: 'centre_decisionnel', tab: 'Urgences & risques' },
  { id: 'croissance', label: 'Croissance', query: 'Quelles recommandations pour la ferme ?', moduleId: 'centre_decisionnel', tab: 'Croissance & opportunités' },
  { id: 'saisons', label: 'Saisons', query: 'Quand lancer une nouvelle bande ?', moduleId: 'centre_decisionnel', tab: 'Saisons & marchés' },
];

/** @deprecated — alias legacy pour tests / liens externes */
export const CENTRE_TAB_SHORTCUTS = CENTRE_HEY_HORIZON_QUESTIONS;

export function launchCentreHeyHorizonQuestion({ questionId = '', onNavigate, onOpenAssistant, mode = 'tab' } = {}) {
  const item = CENTRE_HEY_HORIZON_QUESTIONS.find((q) => q.id === questionId)
    || CENTRE_HEY_HORIZON_QUESTIONS[0];

  if (mode === 'assistant' && onOpenAssistant) {
    onOpenAssistant(item.query);
    return;
  }

  if (onNavigate) {
    onNavigate(item.moduleId, { tab: item.tab, heyHorizonQuery: item.query });
    return;
  }

  onOpenAssistant?.(item.query);
}

export function centreHeyHorizonPresets() {
  return CENTRE_HEY_HORIZON_QUESTIONS;
}

export default {
  CENTRE_HEY_HORIZON_QUESTIONS,
  launchCentreHeyHorizonQuestion,
  centreHeyHorizonPresets,
};
