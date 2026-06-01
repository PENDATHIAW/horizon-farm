/** Ouvre Élevage → Cycles avec une question présélectionnée (source opérationnelle unique). */
export function launchProductionQuestion({
  questionId,
  onNavigate,
} = {}) {
  onNavigate?.('elevage', { tab: 'Cycles', productionQuestion: questionId });
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent('horizon-production-question', {
      detail: { questionId, moduleId: 'elevage' },
    }));
  }, 280);
}

/** Ouvre le pilotage stratégique (objectifs, performance, risques). */
export function launchPilotageModule({
  moduleId = 'centre_ia',
  tab = 'À traiter',
  onNavigate,
} = {}) {
  onNavigate?.(moduleId, { tab });
}
