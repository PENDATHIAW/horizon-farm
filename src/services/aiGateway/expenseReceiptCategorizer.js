/**
 * POC automatisation - catégorisation d'un reçu de dépense.
 *
 * « Photo d'un reçu → dépense déjà pré-catégorisée. » Deux étages, comme les
 * relances :
 *  - déterministe : mots-clés → catégorie finance officielle + activité rattachée
 *    (hors-ligne, gratuit) ;
 *  - amorce modèle : un `aiCategorizer` optionnel (branché sur la passerelle
 *    /api/assistant/generate) peut affiner ; s'il échoue, on garde le résultat
 *    déterministe. Rien n'est auto-enregistré : la dépense ouvre un formulaire
 *    pré-rempli, à valider.
 */

import { callClaudeModel } from './modelClient.js';

const clean = (v) => String(v ?? '').trim();
const norm = (v) => clean(v)
  .toLowerCase()
  .normalize('NFD')
  .replace(new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g'), '');

/** Catégories finance officielles pour une dépense (cf. constants.js). */
export const EXPENSE_CATEGORIES = ['Alimentation', 'Sante', 'Salaires', 'Transport', 'Energie', 'Investissements', 'Stocks', 'Autre'];

/** Règles catégorie (ordre = priorité, du plus spécifique au plus général). */
const CATEGORY_RULES = [
  ['Sante', ['vaccin', 'medicament', 'antibiotique', 'vermifuge', 'veterinaire', 'veto', 'deparasitage', 'traitement', 'seringue']],
  ['Alimentation', ['aliment', 'provende', 'mais', 'son de ble', 'tourteau', 'fourrage', 'paille', 'concentre', 'granule', 'ponte', 'demarrage', 'croissance']],
  ['Salaires', ['salaire', 'main d oeuvre', 'main-d-oeuvre', 'manoeuvre', 'journalier', 'paie', 'prime', 'gardien', 'ouvrier', 'remuneration']],
  ['Transport', ['carburant', 'gasoil', 'gazole', 'essence', 'diesel', 'transport', 'taxi', 'peage', 'livraison', 'carte grise', 'vidange', 'pneu', 'location vehicule']],
  ['Energie', ['electricite', 'senelec', 'groupe electrogene', 'gaz', 'butane', 'facture eau', 'sde', 'sen eau', 'forage', 'pompe', 'panneau solaire', 'batterie']],
  ['Investissements', ['equipement', 'materiel', 'construction', 'materiaux', 'ciment', 'tole', 'grillage', 'abreuvoir', 'mangeoire', 'couveuse', 'congelateur', 'moto', 'tracteur', 'batiment']],
  ['Stocks', ['semence', 'engrais', 'uree', 'pesticide', 'herbicide', 'phytosanitaire', 'emballage', 'plateau', 'alveole', 'sac', 'litiere', 'copeaux']],
];

/** Règles activité rattachée. */
const ACTIVITY_RULES = [
  ['volailles', ['volaille', 'poulet', 'pondeuse', 'poussin', 'oeuf', 'chair', 'aviculture', 'ponte']],
  ['bovins', ['boeuf', 'bovin', 'vache', 'veau', 'embouche', 'taureau', 'genisse', 'lait']],
  ['petits_ruminants', ['mouton', 'ovin', 'chevre', 'caprin', 'belier', 'agneau']],
  ['cultures', ['culture', 'champ', 'parcelle', 'tomate', 'oignon', 'semence', 'engrais', 'recolte', 'maraichage']],
];

const matchRule = (haystack, rules) => {
  for (const [label, keywords] of rules) {
    const hits = keywords.filter((k) => haystack.includes(norm(k)));
    if (hits.length) return { label, hits };
  }
  return null;
};

/**
 * Catégorise un reçu de dépense de façon déterministe.
 * @returns { category, activite, confidence, keywords, source:'deterministic' }
 */
export function categorizeExpenseReceipt({ text = '', merchant = '' } = {}) {
  const hay = norm(`${text} ${merchant}`);
  const cat = matchRule(hay, CATEGORY_RULES);
  const act = matchRule(hay, ACTIVITY_RULES);
  const category = cat?.label || 'Autre';
  const keywords = [...(cat?.hits || []), ...(act?.hits || [])];
  // Confiance : forte si la catégorie est identifiée par un mot-clé, faible sinon.
  const confidence = cat ? Math.min(0.92, 0.7 + cat.hits.length * 0.07) : 0.4;
  return {
    category,
    activite: act?.label || 'general',
    confidence: Number(confidence.toFixed(2)),
    keywords,
    source: 'deterministic',
  };
}

const SYSTEM = 'Tu catégorises des reçus de dépense pour une ferme au Sénégal. Réponds uniquement en JSON.';

/**
 * Fabrique un catégoriseur affiné par le modèle (via la passerelle serveur). Si le
 * modèle est injoignable, retombe sur la catégorisation déterministe. `fetchImpl`
 * optionnel pour les tests.
 */
export function buildExpenseCategorizer({ fetchImpl } = {}) {
  return async function categorize({ text = '', merchant = '', montant = 0 } = {}) {
    const base = categorizeExpenseReceipt({ text, merchant });
    const prompt = [
      'Catégorise ce reçu de dépense agricole.',
      `Catégories autorisées (une seule) : ${EXPENSE_CATEGORIES.join(', ')}.`,
      'Activités possibles : volailles, bovins, petits_ruminants, cultures, general.',
      `Montant: ${montant} FCFA. Marchand: ${merchant || 'inconnu'}.`,
      `Proposition de départ: catégorie=${base.category}, activite=${base.activite}.`,
      'Texte du reçu :',
      clean(text).slice(0, 1200),
      'Réponds : {"category": "...", "activite": "...", "confidence": 0-1}',
    ].join('\n');

    const result = await callClaudeModel({
      system: SYSTEM,
      prompt,
      schema: { category: 'string', activite: 'string', confidence: 'number' },
      maxTokens: 120,
      fetchImpl,
    });

    const data = result.ok ? result.data : null;
    const category = data && EXPENSE_CATEGORIES.includes(clean(data.category)) ? clean(data.category) : base.category;
    const activite = data && clean(data.activite) ? clean(data.activite) : base.activite;
    const confidence = data && Number.isFinite(Number(data.confidence)) ? Number(data.confidence) : base.confidence;
    return {
      category,
      activite,
      confidence: Number(confidence.toFixed ? confidence.toFixed(2) : confidence),
      keywords: base.keywords,
      source: data ? 'model' : 'deterministic',
    };
  };
}

export default categorizeExpenseReceipt;
