/** Ouvre Élevage ou Centre décisionnel sur l'onglet Cycles avec une question présélectionnée. */
export function launchProductionQuestion({
  questionId,
  moduleId = 'elevage',
  onNavigate,
} = {}) {
  onNavigate?.(moduleId, { tab: 'Cycles', productionQuestion: questionId });
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent('horizon-production-question', {
      detail: { questionId, moduleId },
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
