/**
 * Routeur langage naturel agricole — V4.
 * Orchestre intentions universelles, multi-intentions, contexte conversationnel et réponses canoniques.
 */

import { classifyUniversalIntent, isQuestionIntent, UNIVERSAL_INTENT_FAMILIES } from './assistantUniversalIntents.js';
import { classifyCompositeQuery } from './assistantMultiIntentMatrix.js';
import { resolveFollowUp, updateConversationContext } from './assistantConversationContext.js';
import { buildAgriculturalAnswer } from './assistantAgriculturalContext.js';
import { formatCompactHorizonAnswer } from './assistantResponseFormatter.js';
import { resolveFarmModuleNavigation } from './assistantFarmNavigation.js';
import { detectBusinessDomain } from './assistantDomainDetector.js';
import { buildAssistantClarifyResponse } from './assistantClarifyResponse.js';

/**
 * @typedef {import('./assistantConversationContext.js').ConversationContext} ConversationContext
 */

function mergeAnswers(answers = []) {
  if (!answers.length) return null;
  if (answers.length === 1) return answers[0];

  const situation = answers.map((a) => a.situation).filter(Boolean).join(' · ');
  const cause = answers.map((a) => a.cause).filter(Boolean).join(' · ');
  const action = answers.map((a) => a.action).filter(Boolean)[0] || 'Traitez chaque point dans l\'ordre indiqué.';
  const sources = [...new Set(answers.flatMap((a) => a.sources || []))];

  return {
    title: 'Plusieurs sujets',
    situation,
    cause,
    action,
    sources,
    confidence: Math.round(answers.reduce((sum, a) => sum + (a.confidence || 80), 0) / answers.length),
  };
}

/**
 * Route une requête en langage naturel vers une réponse agricole compacte.
 * @returns {{ handled: boolean, answer?: object, assistantText?: string, updatedContext?: ConversationContext, intents?: object[] } | null}
 */
export function routeNaturalLanguageQuery(text = '', { dataMap = {}, conversationContext = null } = {}) {
  const query = String(text || '').trim();
  if (!query) return { handled: false };

  const navigation = resolveFarmModuleNavigation(query);
  if (navigation) {
    return {
      handled: true,
      navigation,
      assistantText: formatCompactHorizonAnswer({
        situation: `J'ouvre ${navigation.label} pour vous.`,
        cause: 'Vous m\'avez demandé d\'y accéder.',
        action: 'Parcourez les données tranquillement, puis revenez me parler si besoin.',
        sources: ['Navigation ERP'],
        confidence: 96,
      }),
      source: 'farm_navigation_v4',
    };
  }

  let context = conversationContext;
  let workingQuery = query;
  let forcedIntent = null;
  let forcedFamily = null;

  const followUp = context ? resolveFollowUp(query, context) : null;
  if (followUp) {
    workingQuery = followUp.expandedQuery || query;
    forcedIntent = followUp.forcedIntent || null;
    forcedFamily = followUp.forcedFamily || null;
  }

  const composite = classifyCompositeQuery(workingQuery);
  let intents = composite.intents;

  if (!intents.length && forcedIntent) {
    intents = [{
      family: forcedFamily || UNIVERSAL_INTENT_FAMILIES.ELEVAGE,
      intent: forcedIntent,
      label: forcedIntent,
      score: 1,
      segment: workingQuery,
    }];
  }

  if (!intents.length) {
    const single = classifyUniversalIntent(workingQuery);
    if (single && isQuestionIntent(single)) intents = [{ ...single, segment: workingQuery }];
    else if (single?.family === UNIVERSAL_INTENT_FAMILIES.DECLARER) {
      return { handled: false, declarerIntent: single };
    }
  }

  if (!intents.length) {
    const clarify = buildAssistantClarifyResponse(query, dataMap);
    if (clarify?.answer) {
      return {
        handled: true,
        answer: clarify.answer,
        assistantText: formatCompactHorizonAnswer(clarify.answer),
        updatedContext: updateConversationContext(context || {}, { query, intent: clarify.proposedIntent }),
        source: 'assistant_clarify_v6',
      };
    }
    return { handled: false };
  }

  const answers = [];
  for (const hit of intents.slice(0, 3)) {
    const answer = buildAgriculturalAnswer(hit.intent, dataMap);
    if (answer) answers.push(answer);
  }

  if (!answers.length) {
    const clarify = buildAssistantClarifyResponse(query, dataMap);
    if (clarify?.answer) {
      const assistantText = formatCompactHorizonAnswer(clarify.answer);
      return {
        handled: true,
        answer: clarify.answer,
        assistantText,
        updatedContext: updateConversationContext(context || {}, {
          query,
          intent: clarify.proposedIntent || null,
          family: intents[0]?.family || null,
        }),
        intents,
        source: 'assistant_clarify_v6',
      };
    }
    return { handled: false, intents };
  }

  const merged = mergeAnswers(answers);
  const domain = detectBusinessDomain(workingQuery);
  if (domain && merged) {
    merged.domain = domain.domain;
    merged.moduleId = domain.moduleId;
  }
  const assistantText = formatCompactHorizonAnswer(merged);
  const primary = intents[0];

  const updatedContext = updateConversationContext(context || {}, {
    query,
    intent: primary.intent,
    family: primary.family,
  });

  return {
    handled: true,
    answer: merged,
    assistantText,
    updatedContext,
    intents,
    domain,
    source: 'universal_language_v5',
  };
}

export const ASSISTANT_LANGUAGE_ROUTER = Object.freeze({
  routeNaturalLanguageQuery,
});

export default ASSISTANT_LANGUAGE_ROUTER;
