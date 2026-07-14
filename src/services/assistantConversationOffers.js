/**
 * Offres conversationnelles - l'assistant propose, l'exploitant accepte (vas-y, oui…).
 * Comportement IA métier : mémoire de l'offre + exécution au tour suivant.
 */

import { isAffirmativeFollowUp } from './assistantProgressiveResponse.js';

/** @typedef {{ kind: 'intent', intent: string, label?: string } | { kind: 'progressive', fullText: string } | null} PendingFollowUp */

const OFFER_RULES = Object.freeze([
  {
    test: (t) => /detail(?:ler|le)?\s+(?:le\s+)?client|client\s+(?:le\s+)?plus\s+urgent|relancer\s+.+\s+aujourd/i.test(t),
    followUp: { kind: 'intent', intent: 'receivable_follow_up', label: 'Client prioritaire' },
  },
  {
    test: (t) => /clients?\s+(?:a|à)\s+relancer|detail(?:ler|le)?\s+(?:les\s+)?clients?|qui\s+relancer/i.test(t),
    followUp: { kind: 'intent', intent: 'relances', label: 'Relances clients' },
  },
  {
    test: (t) => /priorit|que\s+faire\s+aujourd|urgences?\s+du\s+jour/i.test(t) && /peux|puis|voulez|souhaitez|detail/i.test(t),
    followUp: { kind: 'intent', intent: 'priorites_du_jour', label: 'Priorités du jour' },
  },
  {
    test: (t) => /objectif/i.test(t) && /peux|puis|voulez|souhaitez|detail|avancement/i.test(t),
    followUp: { kind: 'intent', intent: 'objectif_status', label: 'Objectifs' },
  },
  {
    test: (t) => /risques?/i.test(t) && /peux|puis|voulez|souhaitez|detail|approfond/i.test(t),
    followUp: { kind: 'intent', intent: 'farm_risks', label: 'Risques détaillés' },
  },
  {
    test: (t) => /opportunit/i.test(t) && /peux|puis|voulez|souhaitez|detail/i.test(t),
    followUp: { kind: 'intent', intent: 'farm_opportunities', label: 'Opportunités' },
  },
  {
    test: (t) => /tendance|evolue|compar/i.test(t) && /peux|puis|voulez|souhaitez|detail/i.test(t),
    followUp: { kind: 'intent', intent: 'farm_trends', label: 'Tendances' },
  },
  {
    test: (t) => /souhaitez-vous le detail|voulez-vous le detail|plus de details/i.test(t),
    followUp: { kind: 'progressive', intent: 'progressive_detail', label: 'Détail complet' },
  },
]);

function normalizeOfferText(answer = {}) {
  return `${answer.action || ''} ${answer.situation || ''} ${answer.title || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, "'");
}

/**
 * Déduit une offre de suite à partir de la réponse assistant.
 * @returns {{ kind: string, intent?: string, label?: string } | null}
 */
export function inferOfferFromAnswer(answer = {}) {
  const text = normalizeOfferText(answer);
  if (!text.trim()) return null;

  for (const rule of OFFER_RULES) {
    if (rule.test(text)) return { ...rule.followUp };
  }

  if (/peux detail|puis detail|je peux detail|si vous voulez/i.test(text)) {
    return { kind: 'intent', intent: answer.intent || null, label: 'Approfondir' };
  }

  return null;
}

/**
 * Construit pendingFollowUp persistant pour le tour suivant.
 * @returns {PendingFollowUp}
 */
export function buildPendingFollowUp(answer = {}, progressiveFullText = '') {
  if (answer?.meta?.topReceivable) {
    return { kind: 'intent', intent: 'receivable_follow_up', label: 'Client prioritaire' };
  }

  const offer = inferOfferFromAnswer(answer);
  if (!offer) return null;

  if (offer.kind === 'progressive' && progressiveFullText) {
    return { kind: 'progressive', fullText: progressiveFullText, label: offer.label };
  }

  if (offer.kind === 'intent' && offer.intent) {
    return { kind: 'intent', intent: offer.intent, label: offer.label };
  }

  return null;
}

/**
 * Résout une acceptation (vas-y, oui…) vers une action concrète.
 */
export function resolveAffirmativeOffer(query = '', context = null) {
  if (!isAffirmativeFollowUp(query)) return null;
  const pending = context?.pendingFollowUp;
  if (!pending) {
    if (context?.memory?.topReceivable) {
      return { type: 'intent', intent: 'receivable_follow_up' };
    }
    return null;
  }

  if (pending.kind === 'progressive' && pending.fullText) {
    return { type: 'text', text: pending.fullText, label: pending.label || 'Détail' };
  }

  if (pending.kind === 'intent' && pending.intent) {
    return { type: 'intent', intent: pending.intent, label: pending.label };
  }

  return null;
}

export default {
  inferOfferFromAnswer,
  buildPendingFollowUp,
  resolveAffirmativeOffer,
};
