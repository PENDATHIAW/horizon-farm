import { supabase } from '../lib/supabase.js';

const LLM_MODE = String(import.meta.env.VITE_HEY_HORIZON_LLM || 'auto').toLowerCase();

export function isHeyHorizonLlmEnabled() {
  return LLM_MODE === 'on' || LLM_MODE === 'auto';
}

export function isHeyHorizonLlmForced() {
  return LLM_MODE === 'on';
}

/** Statut clé OpenAI côté serveur (Vercel). */
export async function fetchLlmStatus() {
  const response = await fetch('/api/assistant/llm-status');
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    return {
      ok: false,
      configured: false,
      llm_available: false,
      error: payload.error || 'Statut LLM indisponible',
    };
  }
  return payload;
}

/** Appelle /api/assistant/enhance (règles serveur + LLM optionnel). */
export async function enhanceHeyHorizonQuestion(question = '', dataMap = {}, { forceLlm = false } = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  const response = await fetch('/api/assistant/enhance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      question,
      dataMap,
      forceLlm: forceLlm || isHeyHorizonLlmForced(),
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || payload.message || 'Enrichissement indisponible');
  }
  return payload;
}

/** Convertit un brouillon LLM en structure Hey Horizon compatible. */
export function normalizeLlmDraft(llmDraft = {}, rawText = '') {
  if (!llmDraft?.intent && !llmDraft?.form_type) return null;
  return {
    ...llmDraft,
    status: llmDraft.status || (llmDraft.missing_fields?.length ? 'draft_incomplete' : 'ready'),
    confidence: Math.min(1, Math.max(0, Number(llmDraft.confidence || 0.72))),
    source: 'llm',
    ui: llmDraft.ui || { title: llmDraft.intent || 'Action recommandée' },
    raw_text: rawText,
    requires_validation: true,
    impacted_modules: llmDraft.impacted_modules || [llmDraft.primary_module].filter(Boolean),
  };
}
