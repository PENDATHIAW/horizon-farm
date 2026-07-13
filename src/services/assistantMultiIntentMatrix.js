/**
 * ASSISTANT_MULTI_INTENT_MATRIX - questions composées (plusieurs demandes dans une phrase).
 */

import {
  classifyAllUniversalIntents,
  classifyUniversalIntent,
  isQuestionIntent,
} from './assistantUniversalIntents.js';

/** Séparateurs de sous-questions naturelles. */
const COMPOSITE_SPLITTERS = [
  /\s+et\s+que\s+/i,
  /\s+et\s+quel(?:le)?s?\s+/i,
  /\s+et\s+combien\s+/i,
  /\s+et\s+quelle\s+/i,
  /\s+et\s+comment\s+/i,
  /\s+et\s+qui\s+/i,
  /\s+ainsi que\s+/i,
  /\s+puis\s+/i,
  /\s+aussi\s+/i,
  /\s+en plus\s+/i,
  /\?\s+et\s+/i,
  /\?\s+que\s+/i,
];

/**
 * Découpe une phrase composée en segments analysables.
 * @returns {string[]}
 */
export function splitCompositeQuery(text = '') {
  const raw = String(text || '').trim();
  if (!raw) return [];

  const connectorSplit = /\s+et\s+(?=(?:que|quel|quelle|qui|combien|qu|mon|ma|mes)\b)/i;
  const parts = raw.split(connectorSplit).map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) return parts;

  for (const splitter of COMPOSITE_SPLITTERS) {
    const split = raw.split(splitter).map((part) => part.trim()).filter(Boolean);
    if (split.length > 1) return split;
  }

  return [raw];
}

/**
 * Classifie une phrase simple ou composée.
 * @returns {{ segments: string[], intents: import('./assistantUniversalIntents.js').UniversalIntentMatch[], isComposite: boolean }}
 */
export function classifyCompositeQuery(text = '', options = {}) {
  const segments = splitCompositeQuery(text);
  const isComposite = segments.length > 1;

  const intents = [];
  const seen = new Set();

  for (const segment of segments) {
    const primary = classifyUniversalIntent(segment, options);
    const hits = primary
      ? [primary]
      : (isComposite ? [] : classifyAllUniversalIntents(segment, options));

    for (const hit of hits) {
      const key = `${hit.family}:${hit.intent}`;
      if (!seen.has(key) && isQuestionIntent(hit)) {
        seen.add(key);
        intents.push({ ...hit, segment });
      }
    }
  }

  if (!intents.length) {
    const fallback = classifyUniversalIntent(text, options);
    if (fallback) intents.push({ ...fallback, segment: text });
  }

  return {
    segments,
    intents: intents.filter(isQuestionIntent),
    isComposite,
  };
}

/** Matrice documentée des exemples composés. */
export const ASSISTANT_MULTI_INTENT_MATRIX = Object.freeze([
  {
    query: 'quels clients me doivent de l\'argent et que puis-je leur vendre ?',
    intents: ['receivables', 'sell_today'],
  },
  {
    query: 'combien ai-je de poulets et quel est mon stock d\'aliment ?',
    intents: ['headcount_poulets', 'stock_aliment'],
  },
  {
    query: 'quelle est ma trésorerie et mon objectif du mois ?',
    intents: ['treasury', 'month_goal'],
  },
  {
    query: 'que dois-je vendre aujourd\'hui pour améliorer ma trésorerie ?',
    intents: ['sell_today', 'treasury'],
  },
]);

export default ASSISTANT_MULTI_INTENT_MATRIX;
