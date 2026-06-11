/**
 * ASSISTANT_CONVERSATION_CONTEXT — mémoire courte pour suites conversationnelles.
 * Ex. « combien de poulets ? » puis « et des bovins ? » ou « lesquels sont sous traitement ? »
 */

import { normalizeAgriculturalText } from './assistantUniversalIntents.js';

const FOLLOW_UP_MARKERS = [
  /^et\b/,
  /^aussi\b/,
  /^pareil\b/,
  /^idem\b/,
  /^lesquels\b/,
  /^lesquelles\b/,
  /^ceux\b/,
  /^celles\b/,
  /^ils\b/,
  /^elles\b/,
  /sous traitement/,
  /en traitement/,
];

const SPECIES_ALIASES = Object.freeze({
  bovins: ['bovin', 'bovins', 'vache', 'vaches', 'betail bovin'],
  poulets: ['poulet', 'poulets', 'avicole', 'chair', 'pondeuse', 'pondeuses'],
  ovins: ['ovin', 'ovins', 'mouton', 'moutons'],
  caprins: ['caprin', 'caprins', 'chevre', 'chèvre', 'chevres', 'chèvres'],
  animaux: ['animal', 'animaux', 'effectif', 'cheptel'],
});

const INTENT_BY_SPECIES = Object.freeze({
  bovins: 'headcount_bovins',
  poulets: 'headcount_poulets',
  ovins: 'headcount_ovins',
  caprins: 'headcount_caprins',
  animaux: 'headcount_total',
});

const DOMAIN_FOLLOW_UPS = Object.freeze({
  elevage: {
    markers: [/et des /, /et les /, /combien/],
    defaultFamily: 'ELEVAGE',
  },
  stock: {
    markers: [/et l.?aliment/, /et le stock/, /et les produits/],
    defaultFamily: 'STOCK',
  },
});

function detectSpecies(text) {
  const q = normalizeAgriculturalText(text);
  for (const [species, aliases] of Object.entries(SPECIES_ALIASES)) {
    if (aliases.some((alias) => q.includes(normalizeAgriculturalText(alias)))) return species;
  }
  return null;
}

function isFollowUp(text) {
  const q = normalizeAgriculturalText(text);
  return FOLLOW_UP_MARKERS.some((marker) => marker.test(q));
}

/**
 * @returns {import('./assistantConversationContext.js').ConversationContext}
 */
export function createConversationContext() {
  return {
    lastIntent: null,
    lastFamily: null,
    lastSpecies: null,
    lastDomain: null,
    lastQuery: '',
    turnCount: 0,
  };
}

/**
 * Résout une suite conversationnelle en enrichissant la requête ou en forçant l'intention.
 * @returns {{ expandedQuery: string, forcedIntent?: string, forcedFamily?: string } | null}
 */
export function resolveFollowUp(query = '', context = createConversationContext()) {
  const q = normalizeAgriculturalText(query);
  if (!q || !context?.lastIntent) return null;
  if (!isFollowUp(q)) return null;

  const species = detectSpecies(q);
  if (species && INTENT_BY_SPECIES[species]) {
    return {
      expandedQuery: query,
      forcedIntent: INTENT_BY_SPECIES[species],
      forcedFamily: 'ELEVAGE',
    };
  }

  if (/sous traitement|en traitement|lesquels|lesquelles/.test(q)) {
    if (context.lastSpecies === 'bovins' || context.lastIntent === 'headcount_bovins') {
      return {
        expandedQuery: 'quels bovins sont sous traitement',
        forcedIntent: 'animals_under_treatment',
        forcedFamily: 'ELEVAGE',
      };
    }
    if (context.lastFamily === 'ELEVAGE' || context.lastDomain === 'elevage') {
      return {
        expandedQuery: 'quels animaux sont sous traitement',
        forcedIntent: 'animals_under_treatment',
        forcedFamily: 'ELEVAGE',
      };
    }
  }

  if (/^et\b/.test(q) && context.lastFamily === 'ELEVAGE' && context.lastSpecies) {
    const nextSpecies = Object.keys(SPECIES_ALIASES).find((key) => key !== context.lastSpecies && SPECIES_ALIASES[key].some((a) => q.includes(a)));
    if (nextSpecies) {
      return {
        expandedQuery: query,
        forcedIntent: INTENT_BY_SPECIES[nextSpecies],
        forcedFamily: 'ELEVAGE',
      };
    }
  }

  for (const [domain, config] of Object.entries(DOMAIN_FOLLOW_UPS)) {
    if (context.lastDomain === domain && config.markers.some((m) => m.test(q))) {
      return { expandedQuery: `${context.lastQuery} ${query}`, forcedFamily: config.defaultFamily };
    }
  }

  return { expandedQuery: `${context.lastQuery} ${query}` };
}

/**
 * Met à jour le contexte après une interaction réussie.
 */
export function updateConversationContext(context, { query = '', intent = null, family = null } = {}) {
  const next = { ...context, turnCount: (context.turnCount || 0) + 1, lastQuery: query };
  if (intent) next.lastIntent = intent;
  if (family) next.lastFamily = family;

  const species = detectSpecies(query);
  if (species) next.lastSpecies = species;
  else if (intent?.startsWith('headcount_')) {
    next.lastSpecies = intent.replace('headcount_', '');
  }

  if (family === 'ELEVAGE' || intent?.includes('headcount') || intent?.includes('elevage')) {
    next.lastDomain = 'elevage';
  } else if (family === 'STOCK' || intent?.includes('stock')) {
    next.lastDomain = 'stock';
  } else if (family === 'FINANCE' || intent?.includes('treasury')) {
    next.lastDomain = 'finance';
  } else if (family === 'COMMERCIAL') {
    next.lastDomain = 'commercial';
  }

  return next;
}

export const ASSISTANT_CONVERSATION_CONTEXT = Object.freeze({
  createConversationContext,
  resolveFollowUp,
  updateConversationContext,
});

export default ASSISTANT_CONVERSATION_CONTEXT;
