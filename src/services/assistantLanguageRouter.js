/**
 * Routeur langage naturel agricole — V4.
 * Orchestre intentions universelles, multi-intentions, contexte conversationnel et réponses canoniques.
 */

import { classifyUniversalIntent, isQuestionIntent, UNIVERSAL_INTENT_FAMILIES } from './assistantUniversalIntents.js';
import { classifyBySemanticPhrases } from './assistantSemanticMatcher.js';
import { SEMANTIC_INTENT_CATALOG } from './assistantBusinessQuestions.js';
import { classifyCompositeQuery } from './assistantMultiIntentMatrix.js';
import { resolveFollowUp, updateConversationContext } from './assistantConversationContext.js';
import { buildAgriculturalAnswer } from './assistantAgriculturalContext.js';
import { formatCompactHorizonAnswer } from './assistantResponseFormatter.js';
import { resolveFarmModuleNavigation } from './assistantFarmNavigation.js';
import { detectBusinessDomain } from './assistantDomainDetector.js';
import { buildAssistantClarifyResponse } from './assistantClarifyResponse.js';
import { buildConversationalNavigationReply } from './assistantConversationalNavigation.js';
import { buildProgressiveChatPayload } from './assistantProgressiveResponse.js';
import {
  resolveDirectorIntent,
  buildDirectorEngineAnswer,
  DIRECTOR_INTENTS,
} from './assistantDirectorEngines.js';
import { resolveAffirmativeOffer } from './assistantConversationOffers.js';
import { queryFarmToolAgent } from './assistantFarmToolAgent.js';

const FORCED_TO_DIRECTOR = Object.freeze({
  receivable_follow_up: DIRECTOR_INTENTS.RECEIVABLE_FOLLOW_UP,
  priorites_du_jour: DIRECTOR_INTENTS.PRIORITES_DU_JOUR,
  objectif_status: DIRECTOR_INTENTS.OBJECTIF_STATUS,
  farm_risks: DIRECTOR_INTENTS.RISQUES,
  farm_opportunities: DIRECTOR_INTENTS.OPPORTUNITES,
  farm_trends: DIRECTOR_INTENTS.TENDANCES,
  farm_comparisons: DIRECTOR_INTENTS.COMPARAISONS,
  money_leaks: DIRECTOR_INTENTS.MONEY_LEAKS,
  comment_va_la_ferme: DIRECTOR_INTENTS.COMMENT_VA_LA_FERME,
});

/**
 * @typedef {import('./assistantConversationContext.js').ConversationContext} ConversationContext
 */

function mergeAnswers(answers = []) {
  if (!answers.length) return null;
  if (answers.length === 1) return answers[0];

  const situation = answers.map((a) => a.situation).filter(Boolean).join('\n\n');
  const cause = answers.map((a) => a.cause).filter(Boolean).join(' ');
  const action = answers.map((a) => a.action).filter(Boolean)[0] || '';
  const meta = answers.find((a) => a.meta?.topReceivable)?.meta || answers[0]?.meta || null;

  return {
    title: 'Plusieurs sujets',
    situation,
    cause,
    action,
    sources: [],
    meta,
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
    const navAnswer = buildConversationalNavigationReply(navigation.moduleId);
    const progressive = buildProgressiveChatPayload(navAnswer);
    return {
      handled: true,
      navigation,
      answer: navAnswer,
      assistantText: progressive.text,
      progressive,
      source: 'farm_navigation_v7',
    };
  }

  let context = conversationContext;
  let workingQuery = query;
  let forcedIntent = null;
  let forcedFamily = null;

  const affirmativeOffer = context ? resolveAffirmativeOffer(query, context) : null;
  if (affirmativeOffer?.type === 'text') {
    const detailAnswer = {
      title: affirmativeOffer.label || 'Détail',
      situation: affirmativeOffer.text,
      cause: '',
      action: '',
      sources: ['Horizon'],
      confidence: 96,
      intent: 'progressive_detail',
    };
    return {
      handled: true,
      answer: detailAnswer,
      assistantText: affirmativeOffer.text,
      progressive: { text: affirmativeOffer.text, fullText: affirmativeOffer.text, hasDetail: false },
      updatedContext: updateConversationContext(context || {}, {
        query,
        intent: 'progressive_detail',
        answer: detailAnswer,
      }),
      source: 'conversation_offer_v8',
    };
  }

  const followUp = context ? resolveFollowUp(query, context) : null;
  if (followUp) {
    workingQuery = followUp.expandedQuery || query;
    forcedIntent = followUp.forcedIntent || null;
    forcedFamily = followUp.forcedFamily || null;
  }

  const directorIntent = (forcedIntent && FORCED_TO_DIRECTOR[forcedIntent])
    || resolveDirectorIntent(query, context);
  if (directorIntent) {
    const directorAnswer = buildDirectorEngineAnswer(directorIntent, dataMap, context, query);
    if (directorAnswer) {
      const progressive = buildProgressiveChatPayload(directorAnswer);
      const intentKey = directorAnswer.intent || directorIntent;
      const familyMap = {
        [DIRECTOR_INTENTS.COMMENT_VA_LA_FERME]: 'INVESTISSEUR',
        [DIRECTOR_INTENTS.OBJECTIF_STATUS]: 'OBJECTIFS',
        [DIRECTOR_INTENTS.PRIORITES_DU_JOUR]: 'DECISION',
        [DIRECTOR_INTENTS.RECEIVABLE_FOLLOW_UP]: 'COMMERCIAL',
        [DIRECTOR_INTENTS.TENDANCES]: 'INVESTISSEUR',
        [DIRECTOR_INTENTS.COMPARAISONS]: 'INVESTISSEUR',
        [DIRECTOR_INTENTS.RISQUES]: 'INVESTISSEUR',
        [DIRECTOR_INTENTS.OPPORTUNITES]: 'COMMERCIAL',
        [DIRECTOR_INTENTS.MONEY_LEAKS]: 'FINANCE',
      };
      return {
        handled: true,
        answer: directorAnswer,
        assistantText: progressive.text,
        progressive,
        updatedContext: updateConversationContext(context || {}, {
          query,
          intent: intentKey,
          family: familyMap[directorIntent] || 'DECISION',
          answerMeta: directorAnswer.meta,
          answer: directorAnswer,
          progressiveFullText: progressive.fullText,
        }),
        intents: [{ intent: intentKey, family: familyMap[directorIntent], label: directorAnswer.title }],
        source: 'farm_advisor_v7',
      };
    }
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
    } else if (!single) {
      const semantic = classifyBySemanticPhrases(workingQuery, SEMANTIC_INTENT_CATALOG, { minScore: 0.17 });
      if (semantic) {
        intents = [{
          family: semantic.family,
          intent: semantic.intent,
          label: semantic.label,
          score: semantic.score,
          segment: workingQuery,
        }];
      }
    }
  }

  if (!intents.length) {
    const toolAgent = queryFarmToolAgent(workingQuery, { dataMap, conversationContext: context });
    if (toolAgent.handled && toolAgent.answer) {
      return {
        handled: true,
        answer: toolAgent.answer,
        assistantText: toolAgent.assistantText,
        progressive: toolAgent.progressive,
        updatedContext: toolAgent.updatedContext,
        intents: toolAgent.intents,
        source: toolAgent.source || 'farm_tool_agent_v9',
      };
    }

    const clarify = buildAssistantClarifyResponse(query, dataMap);
    if (clarify?.answer) {
      const progressive = buildProgressiveChatPayload(clarify.answer);
      return {
        handled: true,
        answer: clarify.answer,
        assistantText: progressive.text || formatCompactHorizonAnswer(clarify.answer),
        progressive,
        updatedContext: updateConversationContext(context || {}, { query, intent: clarify.proposedIntent }),
        source: 'assistant_clarify_v7',
      };
    }
    return { handled: false };
  }

  const answers = [];
  for (const hit of intents.slice(0, 3)) {
    const answer = buildAgriculturalAnswer(hit.intent, dataMap, { conversationContext: context, query });
    if (answer) answers.push(answer);
  }

  if (!answers.length) {
    const clarify = buildAssistantClarifyResponse(query, dataMap);
    if (clarify?.answer) {
      const progressive = buildProgressiveChatPayload(clarify.answer);
      return {
        handled: true,
        answer: clarify.answer,
        assistantText: progressive.text || formatCompactHorizonAnswer(clarify.answer),
        progressive,
        updatedContext: updateConversationContext(context || {}, {
          query,
          intent: clarify.proposedIntent || null,
          family: intents[0]?.family || null,
        }),
        intents,
        source: 'assistant_clarify_v7',
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
  const progressive = buildProgressiveChatPayload(merged);
  const primary = intents[0];

  const updatedContext = updateConversationContext(context || {}, {
    query,
    intent: primary.intent,
    family: primary.family,
    answerMeta: merged?.meta,
    answer: merged,
    progressiveFullText: progressive.fullText,
  });

  return {
    handled: true,
    answer: merged,
    assistantText: progressive.text,
    progressive,
    updatedContext,
    intents,
    domain,
    source: 'universal_language_v7',
  };
}

export const ASSISTANT_LANGUAGE_ROUTER = Object.freeze({
  routeNaturalLanguageQuery,
});

export default ASSISTANT_LANGUAGE_ROUTER;
