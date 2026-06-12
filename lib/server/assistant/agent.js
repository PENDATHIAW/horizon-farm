import { json, readJsonBody, requirePostOrOptions, summarizeDataMap } from './_utils.js';
import { callFarmToolPickerLlm, callHeyHorizonLlm, isLlmConfigured } from './llm.js';
import {
  FARM_TOOL_CATALOG,
  routeFarmTool,
  executeFarmTool,
  buildFarmToolContextSummary,
} from '../../../src/services/assistantFarmTools.js';

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
  const toolContext = buildFarmToolContextSummary(dataMap);
  const route = routeFarmTool(question, dataMap);
  let toolId = route?.toolId;
  let confidence = route?.confidence || 0;
  let source = 'farm_tool_rules';

  const llmAvailable = isLlmConfigured();
  const shouldPickWithLlm = llmAvailable && (forceLlm || !toolId || confidence < 0.62);

  if (shouldPickWithLlm) {
    const pick = await callFarmToolPickerLlm({
      question,
      summary,
      toolContext,
      tools: FARM_TOOL_CATALOG.map((t) => ({ id: t.id, label: t.label, description: t.description })),
    });
    if (pick.ok && pick.toolId) {
      toolId = pick.toolId;
      confidence = pick.confidence / 100;
      source = pick.source || 'llm_tool_picker';
    }
  }

  if (!toolId) {
    return json(res, 200, {
      ok: true,
      handled: false,
      llm_available: llmAvailable,
      summary,
      timestamp: new Date().toISOString(),
    });
  }

  const result = executeFarmTool(toolId, dataMap, { query: question });
  if (!result?.answer) {
    return json(res, 200, {
      ok: true,
      handled: false,
      toolId,
      llm_available: llmAvailable,
      timestamp: new Date().toISOString(),
    });
  }

  let text = result.summary;
  if (llmAvailable && (forceLlm || confidence < 0.75)) {
    const llm = await callHeyHorizonLlm({
      question,
      summary: { ...summary, tool_result: toolContext, tool_id: toolId },
      rulesAnswer: text,
    });
    if (llm.ok && llm.text) {
      text = llm.text;
      source = llm.source === 'llm' ? 'llm_synthesis' : source;
    }
  }

  return json(res, 200, {
    ok: true,
    handled: true,
    type: 'assistant_agent',
    source,
    toolId,
    text,
    answer: result.answer,
    moduleKey: result.moduleKey,
    confidence: Math.round(confidence * 100),
    summary,
    llm_available: llmAvailable,
    timestamp: new Date().toISOString(),
  });
}
