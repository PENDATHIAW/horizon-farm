import { answerFarmQuestion, json, readJsonBody, requirePostOrOptions, summarizeDataMap } from './_utils.js';
import { callHeyHorizonLlm, isLlmConfigured } from './llm.js';

const GENERIC_MARKERS = [
  'reformule ou demande-moi',
  'je n ai pas trouve de reponse sure',
  'je n ai pas assez compris',
  'commande non reconnue',
  'essaie une action rapide',
];

const isGenericRulesAnswer = (text = '') => {
  const normalized = String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ');
  if (!normalized.trim()) return true;
  return GENERIC_MARKERS.some((marker) => normalized.includes(marker));
};

export default async function handler(req, res) {
  if (!requirePostOrOptions(req, res)) return;

  const body = await readJsonBody(req);
  const question = String(body.question || body.command || '').trim();
  const dataMap = body.dataMap || {};
  const forceLlm = Boolean(body.forceLlm);

  if (!question) {
    return json(res, 400, { ok: false, error: 'Question requise' });
  }

  const summary = summarizeDataMap(dataMap);
  const rules = answerFarmQuestion(question, dataMap);
  const rulesText = rules.answer || '';
  const isGenericRules = isGenericRulesAnswer(rulesText);

  const llmAvailable = isLlmConfigured();
  const shouldUseLlm = llmAvailable && (forceLlm || isGenericRules);

  if (!shouldUseLlm) {
    return json(res, 200, {
      ok: true,
      type: 'assistant_enhance',
      source: 'rules',
      mode: 'answer',
      text: rulesText,
      moduleKey: rules.moduleKey || null,
      confidence: isGenericRules ? 45 : 82,
      summary,
      llm_available: llmAvailable,
      timestamp: new Date().toISOString(),
    });
  }

  const llm = await callHeyHorizonLlm({ question, summary, rulesAnswer: rulesText });
  if (!llm.ok) {
    return json(res, 200, {
      ok: true,
      type: 'assistant_enhance',
      source: 'rules',
      mode: 'answer',
      text: rulesText || 'Je n’ai pas pu enrichir la réponse. Reformule ou active la clé API LLM côté serveur.',
      moduleKey: rules.moduleKey || null,
      confidence: 50,
      summary,
      llm_available: llmAvailable,
      llm_error: llm.error,
      timestamp: new Date().toISOString(),
    });
  }

  return json(res, 200, {
    ok: true,
    type: 'assistant_enhance',
    source: 'llm',
    mode: llm.mode || 'answer',
    text: llm.text,
    moduleKey: llm.moduleKey || rules.moduleKey || null,
    confidence: llm.confidence,
    draft: llm.draft,
    summary,
    llm_available: true,
    model: llm.model,
    timestamp: new Date().toISOString(),
  });
}
