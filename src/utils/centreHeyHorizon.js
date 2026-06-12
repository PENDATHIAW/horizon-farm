/**
 * Questions rapides Hey Horizon — Centre décisionnel.
 */

export const CENTRE_HEY_HORIZON_QUESTIONS = [
  { id: 'priorities', label: 'Priorités du jour', query: 'Que dois-je faire aujourd hui ?', moduleId: 'centre_ia', tab: 'Urgences & risques' },
  { id: 'main_risk', label: 'Risque principal', query: 'Quel est le principal risque ?', moduleId: 'centre_ia', tab: 'Urgences & risques' },
  { id: 'recommendations', label: 'Recommandations', query: 'Quelles recommandations pour la ferme ?', moduleId: 'centre_ia', tab: 'Croissance & opportunités' },
  { id: 'cycles', label: 'Cycles / lancement', query: 'Quand lancer une nouvelle bande ?', moduleId: 'centre_ia', tab: 'Saisons & marchés' },
  { id: 'opportunities', label: 'Opportunités', query: 'Quelles opportunités de vente ?', moduleId: 'centre_ia', tab: 'Croissance & opportunités' },
  { id: 'farm_status', label: 'Comment va la ferme', query: 'Comment va la ferme ?', moduleId: 'centre_ia', tab: 'Urgences & risques' },
];

export function launchCentreHeyHorizonQuestion({ questionId = '', onNavigate, onOpenAssistant } = {}) {
  const item = CENTRE_HEY_HORIZON_QUESTIONS.find((q) => q.id === questionId)
    || CENTRE_HEY_HORIZON_QUESTIONS[0];
  if (onOpenAssistant) {
    onOpenAssistant(item.query);
    return;
  }
  onNavigate?.(item.moduleId, { tab: item.tab, heyHorizonQuery: item.query });
}

export function centreHeyHorizonPresets() {
  return CENTRE_HEY_HORIZON_QUESTIONS.slice(0, 6);
}

export default {
  CENTRE_HEY_HORIZON_QUESTIONS,
  launchCentreHeyHorizonQuestion,
  centreHeyHorizonPresets,
};
