/**
 * Réponses progressives V7 — synthèse d'abord, détail sur demande.
 */

import { formatConversationalHorizonAnswer, stripTechnicalLeaks } from './assistantResponseFormatter.js';

const DETAIL_CHAR_THRESHOLD = 260;
const SUMMARY_MAX_SENTENCES = 2;

const DETAIL_YES = /^(oui|yes|ok|d accord|detail|détail|vas y|go|continue|suite|plus|elaborer|en savoir)/i;

export function isDetailFollowUp(text = '') {
  const q = String(text || '').trim().toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return DETAIL_YES.test(q) || /^donne(?:z)? (?:moi )?le detail/.test(q);
}

/**
 * @returns {{ text: string, fullText: string, hasDetail: boolean }}
 */
export function buildProgressiveChatPayload(answer = {}) {
  const fullText = stripTechnicalLeaks(formatConversationalHorizonAnswer(answer));
  if (!fullText) return { text: '', fullText: '', hasDetail: false };

  if (fullText.length <= DETAIL_CHAR_THRESHOLD) {
    return { text: fullText, fullText, hasDetail: false };
  }

  const sentences = fullText.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= SUMMARY_MAX_SENTENCES) {
    return { text: fullText, fullText, hasDetail: false };
  }

  const summary = sentences.slice(0, SUMMARY_MAX_SENTENCES).join(' ');
  return {
    text: `${summary}\n\nSouhaitez-vous le détail ?`,
    fullText,
    hasDetail: true,
  };
}

export default {
  buildProgressiveChatPayload,
  isDetailFollowUp,
};
