/**
 * Orchestrateur saisie vocale Hey Horizon.
 */

import { parseContextualVoicePhrase } from './contextualVoiceParser.js';
import { journalizeVoiceParse } from './heyHorizonVoiceJournal.js';
import { gatewayDraftToFormRequest, gatewayDraftToLegacyHeyDraft } from './gatewayFormBridge.js';

/**
 * Analyse une phrase (voix ou texte) → brouillons + journal.
 * Aucune écriture métier.
 */
export async function processContextualVoiceInput({
  phrase = '',
  dataMap = {},
  handlers = {},
} = {}) {
  const parsed = parseContextualVoicePhrase(phrase, dataMap);
  const journal = await journalizeVoiceParse({
    phrase: parsed.phrase,
    drafts: parsed.drafts,
    clarify: parsed.clarify,
    handlers,
  });

  const formRequests = parsed.drafts
    .filter((d) => d.meta?.role === 'primary' || d.meta?.role === 'secondary')
    .map((d) => ({
      draftId: d.id,
      ...gatewayDraftToFormRequest(d),
    }));

  return {
    ...parsed,
    journal,
    formRequests,
    primaryDraft: parsed.drafts.find((d) => d.meta?.role === 'primary') || parsed.drafts[0] || null,
  };
}

export function getValidatableDrafts(result = {}) {
  return arr(result.drafts).filter(
    (d) => d.meta?.role !== 'chain' && d.status !== 'chain_info' && d.required_validation !== false,
  );
}

export function getLegacyDraftForValidation(gatewayDraft = {}) {
  return gatewayDraftToLegacyHeyDraft(gatewayDraft);
}

const arr = (v) => (Array.isArray(v) ? v : []);
