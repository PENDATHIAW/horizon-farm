/**
 * Réponses de clarification — jamais « Commande non reconnue ».
 * Comprendre · demander une précision · proposer ce qui a été compris.
 */

import { classifyBySemanticPhrases } from './assistantSemanticMatcher.js';
import { SEMANTIC_INTENT_CATALOG } from './assistantBusinessQuestions.js';
import { detectBusinessDomain } from './assistantDomainDetector.js';
import { buildAgriculturalAnswer } from './assistantAgriculturalContext.js';
import { resolveUltraShortIntent } from './assistantUltraShortIntents.js';

const DOMAIN_HINTS = Object.freeze({
  elevage: 'Par exemple : « combien de bovins ? », « mes lots » ou « quels animaux sont sous traitement ? »',
  cultures: 'Par exemple : « mes parcelles », « quelle parcelle performe le mieux ? » ou « rendement »',
  commercial: 'Par exemple : « mes ventes », « qui me doit de l\'argent ? » ou « quoi vendre cette semaine ? »',
  stock: 'Par exemple : « stock », « qu\'est-ce qu\'il me reste en magasin ? » ou « ruptures »',
  finance: 'Par exemple : « trésorerie », « suis-je rentable ? » ou « mes dettes »',
  pilotage: 'Par exemple : « comment va la ferme ? », « que dois-je faire aujourd\'hui ? » ou « objectifs »',
});

/**
 * Tente une réponse partielle (seuil sémantique bas) ou une clarification guidée.
 * @returns {{ answer: object, assistantText?: string, proposedIntent?: string } | null}
 */
export function buildAssistantClarifyResponse(query = '', dataMap = {}) {
  const text = String(query || '').trim();
  if (!text) return null;

  const ultra = resolveUltraShortIntent(text);
  if (ultra) {
    const answer = buildAgriculturalAnswer(ultra.intent, dataMap);
    if (answer) return { answer, proposedIntent: ultra.intent };
  }

  const semantic = classifyBySemanticPhrases(text, SEMANTIC_INTENT_CATALOG, { minScore: 0.2 });
  if (semantic?.intent) {
    const answer = buildAgriculturalAnswer(semantic.intent, dataMap);
    if (answer) {
      return {
        answer: {
          ...answer,
          cause: answer.cause || `Formulation proche de « ${semantic.matchedPhrase || semantic.label} ».`,
        },
        proposedIntent: semantic.intent,
      };
    }
    return {
      answer: {
        title: 'Proposition',
        situation: `Je pense que vous parlez de « ${semantic.label} ».`,
        cause: 'Votre formulation est proche d\'une question que je comprends.',
        action: `Confirmez ou précisez — par exemple : « ${semantic.matchedPhrase || semantic.label} ».`,
        sources: ['Horizon'],
        confidence: Math.max(70, Math.round((semantic.score || 0.2) * 100)),
      },
      proposedIntent: semantic.intent,
    };
  }

  const domain = detectBusinessDomain(text);
  const domainKey = domain?.domain || 'pilotage';
  const hint = DOMAIN_HINTS[domainKey] || DOMAIN_HINTS.pilotage;

  return {
    answer: {
      title: 'Précision',
      situation: domain?.label
        ? `Je vois un lien avec ${domain.label}, mais il me manque un détail.`
        : 'Je n\'ai pas encore assez d\'éléments pour répondre précisément.',
      cause: 'Formulation trop vague ou hors des données actuellement chargées.',
      action: hint,
      sources: ['Horizon'],
      confidence: 55,
    },
  };
}

export default buildAssistantClarifyResponse;
