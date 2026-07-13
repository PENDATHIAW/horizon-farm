/**
 * Clarification guidée — choix explicites pour formulations ambiguës.
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
  centre: 'Par exemple : « priorités du jour », « risque principal », « recommandations » ou « quand lancer une bande ? »',
});

/** Phrases ultra-courtes → suggestions cliquables (texte). */
const GUIDED_CHOICES = Object.freeze([
  {
    test: (t) => /^(client|clients)$/i.test(t.trim()),
    choices: ['Qui me doit de l\'argent ?', 'Meilleur client', 'Clients à relancer'],
    domain: 'commercial',
  },
  {
    test: (t) => /^(stock|magasin)$/i.test(t.trim()),
    choices: ['Mon stock', 'Ruptures stock', 'Combien de sacs d\'aliment ?'],
    domain: 'stock',
  },
  {
    test: (t) => /^(objectif|objectifs)$/i.test(t.trim()),
    choices: ['Où j\'en suis sur mes objectifs ?', 'Objectif annuel atteignable ?'],
    domain: 'pilotage',
  },
  {
    test: (t) => /^(centre|pilotage|decision)$/i.test(t.trim()),
    choices: ['Que faire aujourd\'hui ?', 'Risque principal', 'Recommandations ferme'],
    domain: 'centre',
  },
  {
    test: (t) => /^(vente|ventes)$/i.test(t.trim()),
    choices: ['Mes ventes', 'Ventes du jour', 'Qui n\'a pas payé ?'],
    domain: 'commercial',
  },
]);

function buildGuidedAction(choices = []) {
  if (!choices.length) return '';
  const numbered = choices.map((c, i) => `${i + 1}. ${c}`).join(' · ');
  return `Choisissez ou reformulez : ${numbered}`;
}

/**
 * Tente une réponse partielle (seuil sémantique bas) ou une clarification guidée.
 * @returns {{ answer: object, assistantText?: string, proposedIntent?: string } | null}
 */
export function buildAssistantClarifyResponse(query = '', dataMap = {}) {
  const text = String(query || '').trim();
  if (!text) return null;

  const guided = GUIDED_CHOICES.find((row) => row.test(text));
  if (guided) {

    return {
      answer: {
        title: 'Précision',
        situation: 'Je peux vous aider sur plusieurs sujets proches.',
        cause: 'Mot seul — précisez ce que vous cherchez.',
        action: buildGuidedAction(guided.choices),
        sources: ['Horizon'],
        confidence: 58,
      },
      assistantText: buildGuidedAction(guided.choices),
    };
  }

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
  const domainKey = domain?.domain === 'centre_ia' ? 'centre' : (domain?.domain || 'pilotage');
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
