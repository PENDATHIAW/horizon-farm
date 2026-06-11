/**
 * Compréhension sémantique — scoring par tokens + synonymes agricoles.
 * Ne dépend pas d'un simple message.includes() ou keywords[] figés.
 */

import { normalizeAgriculturalText } from './assistantUniversalIntents.js';

const STOP_WORDS = new Set([
  'a', 'ai', 'as', 'au', 'aux', 'ce', 'ces', 'd', 'de', 'des', 'du', 'en', 'est', 'et', 'je', 'la', 'le', 'les',
  'ma', 'mes', 'mon', 'ne', 'ou', 'pas', 'pour', 'que', 'qui', 'quoi', 'se', 'son', 'sur', 'un', 'une', 'dans',
]);

const SYNONYMS = Object.freeze({
  stock: ['inventaire', 'magasin', 'depot', 'réserve', 'reserve', 'produit', 'produits', 'reste', 'restent', 'disponible'],
  aliment: ['feed', 'provende', 'sac', 'sacs', 'granule', 'granulé', 'nourriture'],
  tresorerie: ['banque', 'caisse', 'cash', 'liquidite', 'liquidité', 'argent', 'fonds', 'compte'],
  dette: ['dettes', 'fournisseur', 'fournisseurs', 'payer', 'payable'],
  creance: ['creances', 'créances', 'impaye', 'impayé', 'doit', 'doivent', 'recouvrer'],
  vente: ['ventes', 'commercial', 'client', 'clients', 'ca', 'chiffre'],
  elevage: ['animaux', 'animal', 'cheptel', 'lot', 'lots', 'bande', 'bandes', 'poulet', 'poulets', 'bovin', 'bovins'],
  culture: ['parcelle', 'parcelles', 'champ', 'champs', 'recolte', 'récolte', 'campagne', 'saison'],
  objectif: ['cible', 'objectifs', 'atteinte', 'projection', 'bp', 'plan'],
  rentable: ['rentabilite', 'rentabilité', 'benefice', 'bénéfice', 'marge', 'resultat', 'résultat'],
  malade: ['malades', 'sante', 'santé', 'alerte', 'surveiller', 'pathologie'],
  traitement: ['soin', 'soins', 'vaccin', 'traité', 'traités', 'therapie'],
});

export function tokenizeAgriculturalText(text = '') {
  return normalizeAgriculturalText(text)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function expandToken(token) {
  const bag = new Set([token]);
  for (const [root, aliases] of Object.entries(SYNONYMS)) {
    if (token === root || aliases.includes(token)) {
      bag.add(root);
      aliases.forEach((alias) => bag.add(alias));
    }
  }
  return bag;
}

function tokenBag(text = '') {
  const bag = new Set();
  for (const token of tokenizeAgriculturalText(text)) {
    expandToken(token).forEach((item) => bag.add(item));
  }
  return bag;
}

/**
 * Score de similarité entre une requête et une phrase de référence (0–1).
 */
export function scoreSemanticSimilarity(query = '', reference = '') {
  const queryBag = tokenBag(query);
  const refBag = tokenBag(reference);
  if (!queryBag.size || !refBag.size) return 0;

  let intersection = 0;
  for (const token of queryBag) {
    if (refBag.has(token)) intersection += 1;
  }

  const union = new Set([...queryBag, ...refBag]).size;
  const jaccard = intersection / union;

  const queryTokens = tokenizeAgriculturalText(query);
  const refTokens = tokenizeAgriculturalText(reference);
  let partial = 0;
  for (const qt of queryTokens) {
    if (refTokens.some((rt) => rt.startsWith(qt) || qt.startsWith(rt))) partial += 1;
  }
  const partialScore = partial / Math.max(queryTokens.length, 1);

  return Math.min(1, jaccard * 0.65 + partialScore * 0.35);
}

/**
 * Classe une requête contre une liste d'entrées { intent, family, label, phrases[] }.
 */
export function classifyBySemanticPhrases(query = '', entries = [], { minScore = 0.28 } = {}) {
  const queryTokens = tokenizeAgriculturalText(query);
  const effectiveMin = queryTokens.length <= 1 ? Math.min(minScore, 0.18) : minScore;

  let best = null;
  for (const entry of entries) {
    for (const phrase of entry.phrases || []) {
      let score = scoreSemanticSimilarity(query, phrase);
      if (queryTokens.length === 1) {
        const phraseTokens = tokenizeAgriculturalText(phrase);
        if (phraseTokens.includes(queryTokens[0]) || phraseTokens.some((t) => t.startsWith(queryTokens[0]))) {
          score = Math.max(score, 0.35);
        }
      }
      if (score >= effectiveMin && (!best || score > best.score)) {
        best = {
          family: entry.family,
          intent: entry.intent,
          label: entry.label,
          score,
          matchedPhrase: phrase,
        };
      }
    }
  }
  return best;
}

export default {
  tokenizeAgriculturalText,
  scoreSemanticSimilarity,
  classifyBySemanticPhrases,
};
