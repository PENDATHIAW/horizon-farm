/**
 * Routage chat Hey Horizon — assistant ERP vs déclarations terrain vocales.
 */
import {
  classifyUniversalIntent,
  isQuestionIntent,
  normalizeAgriculturalText,
  UNIVERSAL_INTENT_FAMILIES,
} from './assistantUniversalIntents.js';
import { resolveUltraShortIntent } from './assistantUltraShortIntents.js';
import { isAffirmativeFollowUp } from './assistantProgressiveResponse.js';

export function isDeclarativeVoiceCommand(text = '') {
  const trimmed = String(text || '').trim();
  if (trimmed.endsWith('?')) return false;
  const hit = classifyUniversalIntent(text);
  if (hit && isQuestionIntent(hit)) return false;
  const q = normalizeAgriculturalText(text);
  if (hit?.family === UNIVERSAL_INTENT_FAMILIES.DECLARER) return true;
  return /^(j ai|jai |enregistre|declarer|nouveau )/.test(q) || /j.?ai vendu|vendu ce/.test(q);
}

/** Salutations, météo, ultra-courts et questions métier → routeur assistant ERP. */
export function shouldRouteToAssistant(text = '') {
  if (isDeclarativeVoiceCommand(text)) return false;
  if (isAffirmativeFollowUp(text)) return true;
  const trimmed = String(text || '').trim();
  if (trimmed.endsWith('?')) return true;
  if (resolveUltraShortIntent(text)) return true;
  const hit = classifyUniversalIntent(text);
  if (!hit) return false;
  if (hit.family === UNIVERSAL_INTENT_FAMILIES.DECLARER) return false;
  return true;
}
