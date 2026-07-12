/** Navigation et événements officiels — Élevage > Cycles */

export const CYCLES_PRODUCTION_QUESTION_EVENT = 'horizon-production-question';

const root = typeof globalThis !== 'undefined' ? globalThis : {};

export function dispatchCyclesProductionQuestion(questionId, moduleId = 'elevage') {
  if (!questionId || typeof root.dispatchEvent !== 'function') return;
  root.dispatchEvent(
    new CustomEvent(CYCLES_PRODUCTION_QUESTION_EVENT, {
      detail: { questionId, moduleId },
    }),
  );
}

export function openElevageCyclesWithQuestion({
  questionId,
  setTab,
  onNavigate,
} = {}) {
  if (setTab) setTab('Cycles & Reproduction');
  if (onNavigate) onNavigate('elevage', { tab: 'Cycles & Reproduction', productionQuestion: questionId });
  const schedule = typeof root.setTimeout === 'function' ? root.setTimeout : (fn) => fn();
  schedule(() => dispatchCyclesProductionQuestion(questionId, 'elevage'), 280);
}

export function shouldHandleProductionQuestionEvent(detail = {}) {
  const moduleId = String(detail.moduleId || detail.module || '').toLowerCase();
  if (!moduleId) return true;
  return ['elevage', 'centre_decisionnel', 'objectifs_croissance'].includes(moduleId);
}
