/**
 * Agent à outils — Phase B Hey Horizon.
 * Route les questions libres vers les 5 outils métier prioritaires.
 */

import { routeFarmTool, executeFarmTool } from './assistantFarmTools.js';
import { buildProgressiveChatPayload } from './assistantProgressiveResponse.js';
import { updateConversationContext } from './assistantConversationContext.js';

const MIN_ROUTE_CONFIDENCE = 0.48;

/**
 * @returns {{ handled: boolean, answer?: object, assistantText?: string, progressive?: object, updatedContext?: object, toolId?: string, source?: string }}
 */
export function queryFarmToolAgent(question = '', {
  dataMap = {},
  conversationContext = null,
} = {}) {
  const route = routeFarmTool(question, dataMap);
  if (!route || route.confidence < MIN_ROUTE_CONFIDENCE) {
    return { handled: false, route };
  }

  const result = executeFarmTool(route.toolId, dataMap, {
    conversationContext,
    query: question,
    intent: route.intent,
  });

  if (!result?.answer) return { handled: false, route };

  const progressive = buildProgressiveChatPayload(result.answer);
  const familyMap = {
    get_receivables: 'COMMERCIAL',
    get_stock_status: 'STOCK',
    get_elevage_status: 'ELEVAGE',
    get_treasury: 'FINANCE',
    get_daily_priorities: 'DECISION',
  };

  const updatedContext = updateConversationContext(conversationContext || {}, {
    query: question,
    intent: result.intent,
    family: familyMap[route.toolId] || 'DECISION',
    answerMeta: result.answer.meta,
    answer: result.answer,
    progressiveFullText: progressive.fullText,
  });

  return {
    handled: true,
    answer: result.answer,
    assistantText: progressive.text || result.summary,
    progressive,
    updatedContext,
    toolId: route.toolId,
    confidence: route.confidence,
    moduleKey: result.moduleKey,
    source: 'farm_tool_agent_v9',
    intents: [{ intent: result.intent, family: familyMap[route.toolId], label: route.label }],
  };
}

export default {
  queryFarmToolAgent,
  MIN_ROUTE_CONFIDENCE,
};
