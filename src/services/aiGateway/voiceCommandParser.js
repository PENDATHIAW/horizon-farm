/**
 * Parse commandes vocales / texte terrain → brouillon gateway (sans écriture).
 */

import { interpretHorizonCommand } from '../aiIntentEngine.js';
import { interpretVoiceCommand } from '../voiceCommands.js';
import {
  AI_DRAFT_SOURCES,
  createAiActionDraft,
  normalizeLegacyDraft,
  TARGET_WORKFLOWS,
} from './aiActionDrafts.js';

const arr = (value) => (Array.isArray(value) ? value : []);

/**
 * Intent terrain (achat, vente, santé…) via règles existantes.
 */
export function parseVoiceCommandToDraft(rawInput = '', dataMap = {}, options = {}) {
  const legacy = interpretHorizonCommand(rawInput, dataMap);
  if (!legacy || legacy.status === 'unsupported' || legacy.status === 'wake_only') {
    const qa = interpretVoiceCommand(rawInput, dataMap);
    if (qa?.answer) {
      return createAiActionDraft({
        intent: 'voice_qa',
        confidence: qa.confidence ?? 0.9,
        source: AI_DRAFT_SOURCES.VOICE,
        draft: { answer: qa.answer, mode: 'readonly' },
        target_workflow: TARGET_WORKFLOWS.INSIGHT_ONLY,
        required_validation: false,
        raw_input: rawInput,
        status: 'answered',
      });
    }
    return createAiActionDraft({
      intent: 'unknown',
      confidence: 0.2,
      source: AI_DRAFT_SOURCES.VOICE,
      draft: {},
      target_workflow: TARGET_WORKFLOWS.OPEN_FORM,
      required_validation: true,
      confirmation_required: true,
      warnings: ['Commande non reconnue. Reformule ou ouvre le formulaire manuellement.'],
      missing_fields: ['intent'],
      raw_input: rawInput,
      status: 'unsupported',
    });
  }

  return normalizeLegacyDraft(legacy, {
    source: options.source || AI_DRAFT_SOURCES.VOICE,
    target_workflow: options.target_workflow,
  });
}

/**
 * Enrichit un brouillon vocal avec champs manquants détectés.
 */
export function refineVoiceDraft(draft = {}, patch = {}) {
  const fields = { ...(draft.draft?.fields || {}), ...patch };
  const missing = arr(draft.missing_fields).filter((key) => !fields[key] && fields[key] !== 0);
  return createAiActionDraft({
    ...draft,
    draft: { ...draft.draft, fields },
    missing_fields: missing,
    confidence: missing.length ? Math.min(draft.confidence ?? 0.5, 0.6) : draft.confidence,
    confirmation_required: missing.length > 0,
    status: missing.length ? 'draft_incomplete' : draft.status,
  });
}
