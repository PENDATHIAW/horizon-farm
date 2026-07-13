/**
 * Détection automatique du domaine métier - l'utilisateur ne nomme pas les modules.
 */

import { normalizeAgriculturalText } from './assistantUniversalIntents.js';
import { classifyBySemanticPhrases } from './assistantSemanticMatcher.js';
import { SEMANTIC_INTENT_CATALOG } from './assistantBusinessQuestions.js';

const DOMAIN_MODULE_MAP = Object.freeze({
  ELEVAGE: 'elevage',
  CULTURES: 'cultures',
  STOCK: 'achats_stock',
  COMMERCIAL: 'commercial',
  FINANCE: 'finance_pilotage',
  OBJECTIFS: 'objectifs_croissance',
  DECISION: 'centre_ia',
  INVESTISSEUR: 'financements',
  SALUTATION: 'assistant_erp',
});

const DOMAIN_SIGNALS = [
  { domain: 'STOCK', tokens: ['stock', 'magasin', 'inventaire', 'aliment', 'sac', 'sacs', 'rupture', 'reste', 'dlc'] },
  { domain: 'FINANCE', tokens: ['tresorerie', 'banque', 'caisse', 'dette', 'dettes', 'creance', 'creances', 'rentable', 'marge', 'argent'] },
  { domain: 'COMMERCIAL', tokens: ['client', 'clients', 'vente', 'ventes', 'creance', 'doit', 'produit', 'relance'] },
  { domain: 'ELEVAGE', tokens: ['poulet', 'poulets', 'bovin', 'bovins', 'lot', 'lots', 'animal', 'animaux', 'mortalite', 'traitement', 'pondeuse'] },
  { domain: 'CULTURES', tokens: ['parcelle', 'parcelles', 'culture', 'cultures', 'recolte', 'rendement', 'saison', 'campagne'] },
  { domain: 'OBJECTIFS', tokens: ['objectif', 'objectifs', 'cible', 'atteindre', 'annuel', 'mensuel'] },
];

/**
 * @returns {{ domain: string, moduleId: string, confidence: number, intent?: string } | null}
 */
export function detectBusinessDomain(text = '') {
  const semantic = classifyBySemanticPhrases(text, SEMANTIC_INTENT_CATALOG, { minScore: 0.26 });
  if (semantic) {
    return {
      domain: semantic.family,
      moduleId: DOMAIN_MODULE_MAP[semantic.family] || 'dashboard',
      confidence: Math.round(semantic.score * 100),
      intent: semantic.intent,
    };
  }

  const tokens = new Set(normalizeAgriculturalText(text).split(/\s+/).filter(Boolean));
  let best = null;
  for (const signal of DOMAIN_SIGNALS) {
    const hits = signal.tokens.filter((t) => [...tokens].some((tok) => tok.includes(t) || t.includes(tok)));
    const score = hits.length / signal.tokens.length;
    if (hits.length && (!best || score > best.score)) {
      best = { domain: signal.domain, score, hits };
    }
  }

  if (!best) return null;
  return {
    domain: best.domain,
    moduleId: DOMAIN_MODULE_MAP[best.domain] || 'dashboard',
    confidence: Math.round(best.score * 100),
  };
}

export default detectBusinessDomain;
