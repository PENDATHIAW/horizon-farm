import { supabase } from '../lib/supabase.js';
import { isHeyHorizonLlmEnabled } from './heyHorizonLlmService.js';
import { queryFarmToolAgent } from './assistantFarmToolAgent.js';
import { buildProgressiveChatPayload } from './assistantProgressiveResponse.js';

/**
 * Appelle l'agent serveur (outils + LLM optionnel).
 */
export async function fetchFarmToolAgent(question = '', dataMap = {}, options = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  const response = await fetch('/api/assistant/agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      question,
      dataMap,
      forceLlm: options.forceLlm || false,
      conversationContext: options.conversationContext || null,
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || payload.message || 'Assistant indisponible');
  }
  return payload;
}

/** Agent hybride : outils locaux d'abord, serveur LLM si besoin. */
export async function queryFarmAgentAsync(question = '', options = {}) {
  const local = queryFarmToolAgent(question, options);
  if (local.handled && (local.confidence >= 0.65 || !isHeyHorizonLlmEnabled())) {
    return { ...local, source: local.source || 'farm_tool_agent_local' };
  }

  if (!isHeyHorizonLlmEnabled()) {
    return local.handled ? local : { handled: false };
  }

  try {
    const remote = await fetchFarmToolAgent(question, options.dataMap || {}, {
      forceLlm: options.forceLlm,
      conversationContext: options.conversationContext,
    });
    if (remote.handled && remote.answer) {
      const progressive = buildProgressiveChatPayload(remote.answer);
      return {
        handled: true,
        answer: remote.answer,
        assistantText: progressive.text || remote.text,
        progressive,
        toolId: remote.toolId,
        moduleKey: remote.moduleKey,
        source: remote.source || 'farm_tool_agent_server',
        llmEnhanced: /llm/i.test(remote.source || ''),
        confidence: (remote.confidence || 75) / 100,
      };
    }
  } catch {
    // fallback local
  }

  return local.handled ? local : { handled: false };
}

export default {
  fetchFarmToolAgent,
  queryFarmAgentAsync,
};
