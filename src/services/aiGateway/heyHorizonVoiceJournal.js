/**
 * Journalisation saisie vocale → business_events + journal local assistant.
 */

import { saveLocalRecommendation } from '../aiRecommendationsService.js';
import { makeId } from '../../utils/ids.js';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Enregistre une session de parsing vocal (aucune écriture métier).
 */
export async function journalizeVoiceParse({
  phrase = '',
  drafts = [],
  clarify = '',
  handlers = {},
} = {}) {
  const intents = drafts.map((d) => d.intent).filter(Boolean);
  const description = [
    phrase.slice(0, 400),
    intents.length ? `Intents: ${intents.join(', ')}` : '',
    clarify ? `Précision: ${clarify}` : '',
  ].filter(Boolean).join(' · ');

  const localEntry = saveLocalRecommendation({
    type: 'voice_parse',
    action: `Saisie vocale (${drafts.length} brouillon${drafts.length > 1 ? 's' : ''})`,
    text: phrase,
    module: 'assistant_erp',
    confidence_score: drafts[0]?.confidence ? Math.round(drafts[0].confidence * 100) : null,
    draft_ids: drafts.map((d) => d.id),
  });

  let businessEvent = null;
  if (handlers.onCreateBusinessEvent) {
    businessEvent = {
      id: makeId('EVT'),
      event_type: 'assistant_voice_parse',
      module_source: 'assistant_erp',
      source_module: 'assistant_erp',
      entity_type: 'voice_session',
      title: clarify
        ? 'Saisie vocale — précision demandée'
        : `Saisie vocale — ${drafts.length} brouillon(s)`,
      description,
      event_date: today(),
      severity: clarify ? 'warning' : 'info',
      payload: {
        phrase: phrase.slice(0, 1000),
        draft_count: drafts.length,
        intents,
        clarify: clarify || null,
        draft_ids: drafts.map((d) => d.id),
      },
      side_effects_managed: true,
      created_from: 'hey_horizon_voice',
    };
    await handlers.onCreateBusinessEvent(businessEvent);
  }

  return { localEntry, businessEvent };
}
