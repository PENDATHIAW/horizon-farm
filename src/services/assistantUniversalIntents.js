/**
 * ASSISTANT_UNIVERSAL_INTENTS — familles métier agricoles, sans commandes figées.
 * Salutation · Élevage · Cultures · Stock · Commercial · Finance · Objectifs · Décision · Investisseur · Déclarer
 */

export const UNIVERSAL_INTENT_FAMILIES = Object.freeze({
  SALUTATION: 'SALUTATION',
  ELEVAGE: 'ELEVAGE',
  CULTURES: 'CULTURES',
  STOCK: 'STOCK',
  COMMERCIAL: 'COMMERCIAL',
  FINANCE: 'FINANCE',
  OBJECTIFS: 'OBJECTIFS',
  DECISION: 'DECISION',
  INVESTISSEUR: 'INVESTISSEUR',
  DECLARER: 'DECLARER',
});

/** @typedef {{ family: string, intent: string, label: string, score: number, route?: string }} UniversalIntentMatch */

const DECLARER = [
  { intent: 'sale_record', patterns: [/j.?ai vendu/, /vente de/, /vendre/, /enregistre.*vente/, /vendu.*ce matin/, /vendu.*aujourd/], label: 'Vente' },
  { intent: 'culture_harvest', patterns: [/recolte/, /récolté/, /récolte/], label: 'Récolte' },
  { intent: 'finance_entry', patterns: [/j.?ai paye/, /j.?ai payé/, /depense/, /dépense/, /encaissement/, /recette/], label: 'Paiement / dépense' },
  { intent: 'health_action', patterns: [/vaccin/, /soin/, /deparas/, /déparas/, /traite/, /traité/, /j.?ai soigne/], label: 'Santé' },
  { intent: 'purchase_stock', patterns: [/j.?ai achete/, /j.?ai acheté/, /achat de/, /reception/, /réception/], label: 'Achat / réception stock' },
  { intent: 'mortality_event', patterns: [/mortalite/, /mortalité/, /morts/], label: 'Mortalité' },
  { intent: 'egg_production', patterns: [/ramasse/, /ramassé/, /ponte/, /oeufs/, /œufs/, /tablettes/], label: 'Production œufs' },
  { intent: 'culture_expense', patterns: [/intrant/, /engrais/, /semence/], label: 'Intrant culture' },
  { intent: 'delivery', patterns: [/livre/, /livré/, /livraison/], label: 'Livraison' },
  { intent: 'transformation', patterns: [/transform/, /abattage/], label: 'Transformation' },
  { intent: 'task_creation', patterns: [/tache/, /tâche/, /rappelle moi/], label: 'Tâche' },
  { intent: 'equipment_action', patterns: [/equipement/, /équipement/, /maintenance/, /panne/], label: 'Équipement' },
];

const SALUTATION = [
  { intent: 'greeting', patterns: [/^bonjour\b/, /^salut\b/, /^bonsoir\b/, /^coucou\b/, /^hello\b/, /ca va\b/, /ça va\b/, /comment va/, /comment allez/, /comment va la ferme/], label: 'Salutation' },
];

const ELEVAGE = [
  { intent: 'headcount_total', patterns: [/combien d.?animaux/, /nombre d.?animaux/, /effectif total/, /combien ai.?je d.?animaux/], label: 'Effectif total' },
  { intent: 'headcount_bovins', patterns: [/combien de bovins/, /nombre de bovins/, /combien de vaches/, /et des bovins/, /et les bovins/, /bovins?\b.*combien/], label: 'Bovins' },
  { intent: 'headcount_poulets', patterns: [/combien de poulets/, /nombre de poulets/, /combien ai.?je de poulets/, /et des poulets/, /et les poulets/, /poulets?\b.*combien/], label: 'Poulets' },
  { intent: 'headcount_ovins', patterns: [/combien de moutons/, /combien d.?ovins/, /et des ovins/, /et les moutons/], label: 'Ovins' },
  { intent: 'headcount_caprins', patterns: [/combien de chevres/, /combien de chèvres/, /combien de caprins/, /et des caprins/], label: 'Caprins' },
  { intent: 'elevage_status', patterns: [/etat de l.?elevage/, /état de l.?élevage/, /situation elevage/, /situation élevage/, /comment va l.?elevage/], label: 'État élevage' },
  { intent: 'lots_surveillance', patterns: [/lots? a surveiller/, /lots? à surveiller/, /bandes? a surveiller/, /bandes? à surveiller/, /quel lot surveiller/], label: 'Lots à surveiller' },
  { intent: 'animals_under_treatment', patterns: [/sous traitement/, /en traitement/, /lesquels.*traitement/, /quelles?.*traitement/, /animaux.*soin/, /bovins?.*traitement/], label: 'Animaux sous traitement' },
];

const CULTURES = [
  { intent: 'parcelles_status', patterns: [/etat des parcelles/, /état des parcelles/, /mes parcelles/, /situation parcelles/, /combien de parcelles/], label: 'Parcelles' },
  { intent: 'rendement', patterns: [/rendement/, /rendements/, /productivite culture/, /productivité culture/], label: 'Rendement' },
  { intent: 'recoltes', patterns: [/recoltes/, /récoltes/, /qu.?ai.?je recolte/, /qu.?ai.?je récolté/], label: 'Récoltes' },
  { intent: 'campagnes', patterns: [/campagne/, /campagnes/, /saison agricole/], label: 'Campagnes' },
  { intent: 'cultures_difficulte', patterns: [/culture.*difficulte/, /culture.*difficulté/, /parcelle.*probleme/, /parcelle.*problème/, /cultures? en difficulte/, /cultures? en difficulté/], label: 'Cultures en difficulté' },
];

const STOCK = [
  { intent: 'stock_overview', patterns: [/^mon stock\b/, /etat du stock/, /état du stock/, /etat stock/, /mon inventaire/, /^inventaire\b/, /montre.*stock/, /situation stock/], label: 'État du stock' },
  { intent: 'stock_remain', patterns: [/qu.?est.?ce qu.?il (me )?reste/, /qu.?ai.?je en magasin/, /j.?ai quoi en magasin/, /produits restants/, /qu.?est.?ce qui est disponible/, /produits disponibles/, /il reste quoi/], label: 'Produits restants' },
  { intent: 'stock_aliment', patterns: [/stock d.?aliment/, /combien.*aliment/, /reste.*aliment/, /assez.*aliment/, /aliment.*reste/, /aliment.*stock/], label: 'Stock aliment' },
  { intent: 'stock_maiz', patterns: [/assez de mais/, /assez de maïs/, /stock.*mais/, /stock.*maïs/, /mais.*finir/, /maïs.*finir/], label: 'Stock maïs' },
  { intent: 'stock_ruptures', patterns: [/rupture/, /ruptures/, /sous seuil/, /stock bas/, /manque de/], label: 'Ruptures' },
  { intent: 'stock_dlc', patterns: [/dlc/, /peremption/, /péremption/, /date limite/, /produit.*expire/], label: 'DLC / péremption' },
];

const COMMERCIAL = [
  { intent: 'ventes', patterns: [/mes ventes/, /ventes du/, /chiffre.*vente/, /ca\b/, /chiffre d.?affaires/], label: 'Ventes' },
  { intent: 'top_client', patterns: [/meilleur client/, /top client/, /client.*important/, /client.*strategique/], label: 'Meilleur client' },
  { intent: 'top_product', patterns: [/meilleur produit/, /top produit/, /produit.*vedette/, /vend.*mieux/, /vend le mieux/], label: 'Meilleur produit' },
  { intent: 'receivables', patterns: [/me doivent/, /doivent de l.?argent/, /creances?/, /créances?/, /impaye/, /impayé/, /qui me doit/, /clients?.*doit/], label: 'Créances clients' },
  { intent: 'relances', patterns: [/relancer/, /clients? a relancer/, /clients? à relancer/, /qui relancer/], label: 'Clients à relancer' },
  { intent: 'commercial_summary', patterns: [/resume commercial/, /résumé commercial/, /situation commercial/, /ma situation commercial/], label: 'Situation commerciale' },
];

const FINANCE = [
  { intent: 'treasury', patterns: [/tresorerie/, /trésorerie/, /combien j.?ai\b/, /ou en est l.?argent/, /argent disponible/, /situation financiere/, /situation financière/, /combien en caisse/, /liquidite/, /liquidité/, /ma caisse/], label: 'Trésorerie' },
  { intent: 'dettes', patterns: [/mes dettes/, /dette fournisseur/, /dettes fournisseurs/, /que dois.?je payer/, /fournisseur.*payer/], label: 'Dettes' },
  { intent: 'creances', patterns: [/mes creances/, /mes créances/, /argent a recuperer/, /argent à récupérer/], label: 'Créances' },
  { intent: 'resultat', patterns: [/resultat/, /résultat/, /benefice/, /bénéfice/, /rentabilite/, /rentabilité/, /marge reelle/, /marge réelle/], label: 'Résultat' },
];

const OBJECTIFS = [
  { intent: 'progress_status', patterns: [/ou j.?en suis/, /où j.?en suis/, /atteinte mensuelle/, /atteinte annuelle/, /objectif du mois/, /objectif mensuel/, /objectif de l.?annee/, /objectif de l.?année/, /avancement objectif/], label: 'Avancement objectifs' },
  { intent: 'month_goal', patterns: [/objectif.*mois/, /cible.*mois/], label: 'Objectif mois' },
  { intent: 'annual_goal', patterns: [/objectif.*annuel/, /objectif.*annee/, /objectif.*année/], label: 'Objectif année' },
];

const DECISION = [
  { intent: 'today_priorities', patterns: [/que faire aujourd/, /que dois.?je faire/, /priorites/, /priorités/, /urgences/, /aujourd.?hui\b.*faire/], label: 'Priorités du jour' },
  { intent: 'sell_today', patterns: [/que vendre/, /vendre aujourd/, /que puis.?je.*vendre/, /puis.?je.*vendre/, /vendre pour ameliorer/, /vendre pour améliorer/], label: 'Que vendre' },
  { intent: 'follow_up', patterns: [/qui relancer/, /relancer.*client/, /relances? du jour/], label: 'Relances' },
];

const INVESTISSEUR = [
  { intent: 'farm_status', patterns: [/etat.*exploitation/, /état.*exploitation/, /situation.*ferme/, /resume.*exploitation/, /résumé.*exploitation/, /performance.*ferme/], label: 'État exploitation' },
  { intent: 'profitability', patterns: [/rentabilite/, /rentabilité/, /performance financiere/, /performance financière/], label: 'Rentabilité' },
  { intent: 'growth', patterns: [/croissance/, /business plan/, /\bbp\b/], label: 'Croissance' },
  { intent: 'investor_summary', patterns: [/investisseur/, /financeur/, /dossier.*banque/, /resume pour invest/, /résumé pour invest/], label: 'Résumé investisseur' },
];

const FAMILY_ORDER = [
  UNIVERSAL_INTENT_FAMILIES.SALUTATION,
  UNIVERSAL_INTENT_FAMILIES.DECLARER,
  UNIVERSAL_INTENT_FAMILIES.DECISION,
  UNIVERSAL_INTENT_FAMILIES.INVESTISSEUR,
  UNIVERSAL_INTENT_FAMILIES.OBJECTIFS,
  UNIVERSAL_INTENT_FAMILIES.FINANCE,
  UNIVERSAL_INTENT_FAMILIES.COMMERCIAL,
  UNIVERSAL_INTENT_FAMILIES.STOCK,
  UNIVERSAL_INTENT_FAMILIES.CULTURES,
  UNIVERSAL_INTENT_FAMILIES.ELEVAGE,
];

const FAMILY_ENTRIES = Object.freeze({
  [UNIVERSAL_INTENT_FAMILIES.SALUTATION]: SALUTATION,
  [UNIVERSAL_INTENT_FAMILIES.ELEVAGE]: ELEVAGE,
  [UNIVERSAL_INTENT_FAMILIES.CULTURES]: CULTURES,
  [UNIVERSAL_INTENT_FAMILIES.STOCK]: STOCK,
  [UNIVERSAL_INTENT_FAMILIES.COMMERCIAL]: COMMERCIAL,
  [UNIVERSAL_INTENT_FAMILIES.FINANCE]: FINANCE,
  [UNIVERSAL_INTENT_FAMILIES.OBJECTIFS]: OBJECTIFS,
  [UNIVERSAL_INTENT_FAMILIES.DECISION]: DECISION,
  [UNIVERSAL_INTENT_FAMILIES.INVESTISSEUR]: INVESTISSEUR,
  [UNIVERSAL_INTENT_FAMILIES.DECLARER]: DECLARER,
});

/** Matrice exportée pour documentation et tests. */
export const ASSISTANT_UNIVERSAL_INTENTS = Object.freeze({ ...FAMILY_ENTRIES });

export function normalizeAgriculturalText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scorePattern(text, pattern) {
  if (typeof pattern === 'string') {
    const needle = normalizeAgriculturalText(pattern);
    return text.includes(needle) ? needle.length / Math.max(text.length, 1) : 0;
  }
  if (pattern.test(text)) {
    const match = text.match(pattern);
    return (match?.[0]?.length || 4) / Math.max(text.length, 1);
  }
  return 0;
}

function matchFamily(text, family, entries) {
  let best = null;
  for (const entry of entries) {
    for (const pattern of entry.patterns) {
      const score = scorePattern(text, pattern);
      if (score > 0 && (!best || score > best.score)) {
        best = { family, intent: entry.intent, label: entry.label, route: entry.route, score };
      }
    }
  }
  return best;
}

/**
 * Classifie une phrase dans la matrice universelle.
 * @returns {UniversalIntentMatch | null}
 */
export function classifyUniversalIntent(text = '', { minScore = 0.04 } = {}) {
  const q = normalizeAgriculturalText(text);
  if (!q) return null;

  let best = null;
  for (const family of FAMILY_ORDER) {
    const hit = matchFamily(q, family, FAMILY_ENTRIES[family]);
    if (hit && (!best || hit.score > best.score)) best = hit;
  }

  if (!best || best.score < minScore) return null;
  return best;
}

/**
 * Retourne toutes les intentions détectées (pour phrases composées).
 * @returns {UniversalIntentMatch[]}
 */
export function classifyAllUniversalIntents(text = '', { minScore = 0.04 } = {}) {
  const q = normalizeAgriculturalText(text);
  if (!q) return [];

  const hits = [];
  for (const family of FAMILY_ORDER) {
    const hit = matchFamily(q, family, FAMILY_ENTRIES[family]);
    if (hit && hit.score >= minScore) hits.push(hit);
  }
  return hits.sort((a, b) => b.score - a.score);
}

/** Intentions question (pas déclaration terrain). */
export function isQuestionIntent(match) {
  if (!match) return false;
  return match.family !== UNIVERSAL_INTENT_FAMILIES.DECLARER;
}

export default ASSISTANT_UNIVERSAL_INTENTS;
