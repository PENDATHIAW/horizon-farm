/**
 * ASSISTANT_CONVERSATION_CONTEXT - mémoire métier V6.1.
 * Suites : espèces, traitements, finances, ventes, parcelles, clients prioritaires.
 */

import { normalizeAgriculturalText } from './assistantUniversalIntents.js';
import { resolveUltraShortIntent } from './assistantUltraShortIntents.js';
import { isAffirmativeFollowUp } from './assistantProgressiveResponse.js';
import { buildPendingFollowUp, resolveAffirmativeOffer } from './assistantConversationOffers.js';

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

const RECEIVABLE_INTENTS = new Set([
  'receivables',
  'relances',
  'creances',
  'receivable_detail',
  'receivable_follow_up',
  'follow_up',
]);

const SPECIES_ALIASES = Object.freeze({
  bovins: ['bovin', 'bovins', 'vache', 'vaches', 'betail bovin'],
  poulets: ['poulet', 'poulets', 'avicole', 'chair'],
  pondeuses: ['pondeuse', 'pondeuses'],
  ovins: ['ovin', 'ovins', 'mouton', 'moutons'],
  caprins: ['caprin', 'caprins', 'chevre', 'chèvre', 'chevres', 'chèvres'],
  animaux: ['animal', 'animaux', 'effectif', 'cheptel', 'tetes', 'têtes'],
});

const INTENT_BY_SPECIES = Object.freeze({
  bovins: 'headcount_bovins',
  poulets: 'headcount_poulets',
  pondeuses: 'headcount_pondeuses',
  ovins: 'headcount_ovins',
  caprins: 'headcount_caprins',
  animaux: 'headcount_total',
});

const DOMAIN_INTENT_SHORTCUTS = Object.freeze({
  finance: {
    dettes: 'dettes',
    creances: 'creances',
    tresorerie: 'treasury',
    rentable: 'resultat',
  },
  commercial: {
    produit: 'top_product',
    ventes: 'ventes',
    vente: 'ventes',
    relance: 'relances',
    commandes: 'orders_overview',
    livraisons: 'deliveries_overview',
  },
  stock: {
    aliment: 'stock_aliment',
    rupture: 'stock_ruptures',
    reste: 'stock_remain',
  },
  cultures: {
    parcelle: 'parcelles_status',
    rendement: 'rendement',
  },
  elevage: {
    traitement: 'animals_under_treatment',
    malade: 'lots_sick',
    mortalite: 'lot_mortality',
    lots: 'lots_overview',
    lot: 'lots_overview',
    animaux: 'my_animals',
    bovins: 'headcount_bovins',
    ovins: 'headcount_ovins',
    poulets: 'headcount_poulets',
  },
  pilotage: {
    rapports: 'documents_summary',
    documents: 'documents_summary',
    personnel: 'rh_personnel',
    activite: 'activity_journal',
    journal: 'activity_journal',
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

function matchDomainShortcut(domain, text) {
  const shortcuts = DOMAIN_INTENT_SHORTCUTS[domain];
  if (!shortcuts) return null;
  const q = normalizeAgriculturalText(text);
  for (const [needle, intent] of Object.entries(shortcuts)) {
    if (q.includes(needle)) return intent;
  }
  return null;
}

function isClientFollowUpQuery(text = '') {
  const q = normalizeAgriculturalText(text);
  return /^(quel|quelle|lequel|laquelle)(s)?\s+(client|clients?)\??$/.test(q)
    || /^(son nom|le nom|qui c est|c est qui)\??$/.test(q);
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
    memory: {
      topReceivable: null,
    },
    /** Offre en attente (intent métier ou texte progressif complet) */
    pendingFollowUp: null,
  };
}

/**
 * Résout une suite conversationnelle.
 * @returns {{ expandedQuery: string, forcedIntent?: string, forcedFamily?: string } | null}
 */
export function resolveFollowUp(query = '', context = createConversationContext()) {
  const q = normalizeAgriculturalText(query);
  if (!q) return null;

  if (isClientFollowUpQuery(query) && (
    context?.memory?.topReceivable
    || RECEIVABLE_INTENTS.has(context?.lastIntent)
  )) {
    return {
      expandedQuery: query,
      forcedIntent: 'receivable_follow_up',
      forcedFamily: 'COMMERCIAL',
    };
  }

  const affirmative = resolveAffirmativeOffer(query, context);
  if (affirmative?.type === 'intent') {
    return {
      expandedQuery: query,
      forcedIntent: affirmative.intent,
      forcedFamily: familyForIntent(affirmative.intent),
    };
  }

  const ultra = resolveUltraShortIntent(query);
  if (ultra && !isClientFollowUpQuery(query)) {
    const shortOk = !context?.lastIntent || isFollowUp(q) || q.split(/\s+/).length <= 2;
    if (shortOk && ultra.intent !== 'top_client') {
      return {
        expandedQuery: query,
        forcedIntent: ultra.intent,
        forcedFamily: ultra.family,
      };
    }
  }

  if (!context?.lastIntent) return null;
  if (isAffirmativeFollowUp(query)) return null;
  if (!isFollowUp(q) && q.split(/\s+/).length > 4) return null;

  const species = detectSpecies(q);
  if (species && INTENT_BY_SPECIES[species]) {
    const treatment = /sous traitement|en traitement/.test(q);
    if (treatment) {
      return {
        expandedQuery: `quels ${species} sont sous traitement`,
        forcedIntent: 'animals_under_treatment',
        forcedFamily: 'ELEVAGE',
      };
    }
    return {
      expandedQuery: `combien de ${species}`,
      forcedIntent: INTENT_BY_SPECIES[species],
      forcedFamily: 'ELEVAGE',
    };
  }

  if (/^et sous traitement|^sous traitement|^en traitement/.test(q)) {
    const label = context.lastSpecies || 'animaux';
    return {
      expandedQuery: `quels ${label} sont sous traitement`,
      forcedIntent: 'animals_under_treatment',
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

  if (context.lastDomain) {
    const shortcut = matchDomainShortcut(context.lastDomain, q);
    if (shortcut) {
      const familyMap = {
        finance: 'FINANCE',
        commercial: 'COMMERCIAL',
        stock: 'STOCK',
        cultures: 'CULTURES',
        elevage: 'ELEVAGE',
        pilotage: 'DECISION',
      };
      return {
        expandedQuery: `${context.lastQuery} ${query}`,
        forcedIntent: shortcut,
        forcedFamily: familyMap[context.lastDomain] || context.lastFamily,
      };
    }
  }

  if (/^et\b/.test(q) && context.lastIntent) {
    return { expandedQuery: `${context.lastQuery} ${query}` };
  }

  return { expandedQuery: `${context.lastQuery} ${query}` };
}

/**
 * Met à jour le contexte après une interaction réussie.
 */
function familyForIntent(intent = '') {
  const map = {
    receivable_follow_up: 'COMMERCIAL',
    relances: 'COMMERCIAL',
    receivables: 'COMMERCIAL',
    priorites_du_jour: 'DECISION',
    today_priorities: 'DECISION',
    objectif_status: 'OBJECTIFS',
    progress_status: 'OBJECTIFS',
    farm_risks: 'INVESTISSEUR',
    farm_opportunities: 'COMMERCIAL',
    farm_trends: 'INVESTISSEUR',
    farm_comparisons: 'INVESTISSEUR',
    comment_va_la_ferme: 'INVESTISSEUR',
    money_leaks: 'FINANCE',
  };
  return map[intent] || 'DECISION';
}

export function updateConversationContext(context, {
  query = '',
  intent = null,
  family = null,
  answerMeta = null,
  answer = null,
  progressiveFullText = '',
} = {}) {
  const next = {
    ...context,
    turnCount: (context.turnCount || 0) + 1,
    lastQuery: query,
    memory: { ...(context.memory || {}), topReceivable: context.memory?.topReceivable || null },
  };
  if (intent) next.lastIntent = intent;
  if (family) next.lastFamily = family;

  if (answerMeta?.topReceivable) {
    next.memory.topReceivable = answerMeta.topReceivable;
  }

  const fulfilledOffer = resolveAffirmativeOffer(query, context);
  if (fulfilledOffer) {
    next.pendingFollowUp = null;
  } else {
    const pending = buildPendingFollowUp(
      answer || { meta: answerMeta, intent, action: answer?.action, situation: answer?.situation, title: answer?.title },
      progressiveFullText,
    );
    if (pending) next.pendingFollowUp = pending;
  }

  const species = detectSpecies(query);
  if (species) next.lastSpecies = species;
  else if (intent?.startsWith('headcount_')) {
    next.lastSpecies = intent.replace('headcount_', '');
  }

  if (family === 'ELEVAGE' || intent?.includes('headcount') || intent?.includes('elevage') || intent?.includes('lot')) {
    next.lastDomain = 'elevage';
  } else if (family === 'STOCK' || intent?.includes('stock')) {
    next.lastDomain = 'stock';
  } else if (family === 'FINANCE' || intent?.includes('treasury') || intent === 'dettes' || intent === 'creances' || intent === 'resultat') {
    next.lastDomain = 'finance';
  } else if (family === 'COMMERCIAL' || intent?.includes('client') || intent?.includes('ventes') || RECEIVABLE_INTENTS.has(intent)) {
    next.lastDomain = 'commercial';
  } else if (family === 'CULTURES' || intent?.includes('parcel') || intent?.includes('culture') || intent?.includes('rendement')) {
    next.lastDomain = 'cultures';
  } else if (intent?.includes('document') || intent?.includes('activity') || intent === 'today_priorities' || intent === 'priorites_du_jour' || intent === 'comment_va_la_ferme') {
    next.lastDomain = 'pilotage';
  } else if (intent?.includes('rh_') || intent?.includes('equipment') || intent?.includes('system') || intent?.includes('sync')) {
    next.lastDomain = 'pilotage';
  }

  return next;
}

export const ASSISTANT_CONVERSATION_CONTEXT = Object.freeze({
  createConversationContext,
  resolveFollowUp,
  updateConversationContext,
});

export default ASSISTANT_CONVERSATION_CONTEXT;
