/**
 * ASSISTANT_UNIVERSAL_INTENTS — familles métier agricoles, sans commandes figées.
 * Salutation · Élevage · Cultures · Stock · Commercial · Finance · Objectifs · Décision · Investisseur · Déclarer
 */

import { classifyBySemanticPhrases } from './assistantSemanticMatcher.js';
import { SEMANTIC_INTENT_CATALOG } from './assistantBusinessQuestions.js';
import { resolveUltraShortIntent } from './assistantUltraShortIntents.js';

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
  { intent: 'greeting', patterns: [/^bonjour\b/, /^salut\b/, /^bonsoir\b/, /^coucou\b/, /^hello\b/, /^ca va\?*$/, /^ça va\?*$/], label: 'Salutation' },
];

const ELEVAGE = [
  { intent: 'my_animals', patterns: [/^mes animaux\b/, /^mon cheptel\b/, /^animaux\?*$/, /j.?ai combien d.?animaux/], label: 'Mes animaux' },
  { intent: 'lots_overview', patterns: [/^mes lots\b/, /^mes bandes\b/, /^lots\?*$/, /quels sont mes lots/], label: 'Mes lots' },
  { intent: 'headcount_total', patterns: [/combien d.?animaux/, /nombre d.?animaux/, /effectif total/, /combien ai.?je d.?animaux/, /combien de tetes/, /combien de têtes/], label: 'Effectif total' },
  { intent: 'headcount_bovins', patterns: [/combien de bovins/, /nombre de bovins/, /combien de vaches/, /et des bovins/, /et les bovins/, /bovins?\b.*combien/, /^bovins?\?*$/, /^mes bovins\b/], label: 'Bovins' },
  { intent: 'headcount_poulets', patterns: [/combien de poulets/, /nombre de poulets/, /combien ai.?je de poulets/, /et des poulets/, /et les poulets/, /poulets?\b.*combien/], label: 'Poulets' },
  { intent: 'headcount_pondeuses', patterns: [/combien de pondeuses/, /nombre de pondeuses/, /effectif pondeuses/], label: 'Pondeuses' },
  { intent: 'lots_sick', patterns: [/lots? malades/, /lots? sont malades/, /bandes? malades/, /elevage.*malade/], label: 'Lots malades' },
  { intent: 'lot_mortality', patterns: [/lot.*perd/, /mortalite.*lot/, /mortalité.*lot/, /plus de mortalite/, /plus de mortalité/], label: 'Mortalité lot' },
  { intent: 'headcount_ovins', patterns: [/combien de moutons/, /combien d.?ovins/, /et des ovins/, /et les ovins/, /et les moutons/, /^ovins?\?*$/, /^mes ovins\b/], label: 'Ovins' },
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
  { intent: 'parcel_best', patterns: [/parcelle performe/, /meilleure parcelle/, /parcelle la plus/], label: 'Meilleure parcelle' },
  { intent: 'culture_profit', patterns: [/culture.*rapporte/, /culture la plus rentable/], label: 'Culture rentable' },
];

const STOCK = [
  { intent: 'stock_overview', patterns: [/^mon stock\b/, /^stock\?*$/, /etat du stock/, /état du stock/, /etat stock/, /mon inventaire/, /^inventaire\b/, /montre.*stock/, /situation stock/], label: 'État du stock' },
  { intent: 'purchases_overview', patterns: [/^mes achats\b/, /achats recents/, /derniers achats/], label: 'Achats' },
  { intent: 'suppliers_overview', patterns: [/^mes fournisseurs\b/, /^fournisseurs\?*$/, /fournisseurs actifs/], label: 'Fournisseurs' },
  { intent: 'stock_remain', patterns: [/qu.?est.?ce qu.?il (me )?reste/, /qu.?ai.?je en magasin/, /j.?ai quoi en magasin/, /produits restants/, /qu.?est.?ce qui est disponible/, /produits disponibles/, /il reste quoi/], label: 'Produits restants' },
  { intent: 'stock_aliment', patterns: [/stock d.?aliment/, /combien.*aliment/, /reste.*aliment/, /assez.*aliment/, /aliment.*reste/, /aliment.*stock/], label: 'Stock aliment' },
  { intent: 'stock_maiz', patterns: [/assez de mais/, /assez de maïs/, /stock.*mais/, /stock.*maïs/, /mais.*finir/, /maïs.*finir/], label: 'Stock maïs' },
  { intent: 'stock_ruptures', patterns: [/rupture/, /ruptures/, /sous seuil/, /stock bas/, /manque de/], label: 'Ruptures' },
  { intent: 'stock_dlc', patterns: [/dlc/, /peremption/, /péremption/, /date limite/, /produit.*expire/], label: 'DLC / péremption' },
  { intent: 'stock_sellable', patterns: [/que puis.?je vendre/, /produits? a vendre/, /vendre du stock/], label: 'Stock vendable' },
];

const COMMERCIAL = [
  { intent: 'ventes', patterns: [/^mes ventes\b/, /^ventes\?*$/, /^ca\?*$/, /ventes du/, /chiffre.*vente/, /ca\b/, /chiffre d.?affaires/], label: 'Ventes' },
  { intent: 'orders_overview', patterns: [/^mes commandes\b/, /commandes en cours/, /commandes ouvertes/], label: 'Commandes' },
  { intent: 'deliveries_overview', patterns: [/^mes livraisons\b/, /livraisons en attente/, /livraisons du jour/], label: 'Livraisons' },
  { intent: 'top_client', patterns: [/meilleur client/, /top client/, /client.*important/, /client.*strategique/], label: 'Meilleur client' },
  { intent: 'top_product', patterns: [/meilleur produit/, /top produit/, /produit.*vedette/, /vend.*mieux/, /vend le mieux/], label: 'Meilleur produit' },
  { intent: 'receivables', patterns: [/me doivent/, /doivent de l.?argent/, /creances?/, /créances?/, /impaye/, /impayé/, /qui me doit/, /clients?.*doit/], label: 'Créances clients' },
  { intent: 'receivable_detail', patterns: [/^quel client/, /^quelle cliente/, /^quel(le)?s? clients?/, /^lequel/, /^laquelle/], label: 'Détail créance' },
  { intent: 'relances', patterns: [/relancer/, /clients? a relancer/, /clients? à relancer/, /qui relancer/], label: 'Clients à relancer' },
  { intent: 'commercial_summary', patterns: [/resume commercial/, /résumé commercial/, /situation commercial/, /ma situation commercial/], label: 'Situation commerciale' },
  { intent: 'ventes_today', patterns: [/ventes aujourd/, /vendu aujourd/, /ventes du jour/], label: 'Ventes du jour' },
];

const FINANCE = [
  { intent: 'treasury', patterns: [/^tresorerie\?*$/, /tresorerie/, /trésorerie/, /combien j.?ai\b/, /ou en est l.?argent/, /argent disponible/, /situation financiere/, /situation financière/, /combien en caisse/, /combien.*banque/, /liquidite/, /liquidité/, /ma caisse/], label: 'Trésorerie' },
  { intent: 'charges_overview', patterns: [/^mes charges\b/, /charges exploitation/, /depenses exploitation/], label: 'Charges' },
  { intent: 'dettes', patterns: [/mes dettes/, /dette fournisseur/, /dettes fournisseurs/, /que dois.?je payer/, /fournisseur.*payer/], label: 'Dettes' },
  { intent: 'creances', patterns: [/mes creances/, /mes créances/, /argent a recuperer/, /argent à récupérer/], label: 'Créances' },
  { intent: 'resultat', patterns: [/resultat/, /résultat/, /benefice/, /bénéfice/, /rentabilite/, /rentabilité/, /marge reelle/, /marge réelle/], label: 'Résultat' },
  { intent: 'money_leaks', patterns: [/perdre de l argent/, /fait perdre/, /fuite financiere/, /fuite d argent/, /detruit ma marge/, /postes de perte/, /ou je perds/, /où je perds/, /pertes financieres/], label: 'Fuites financières' },
];

const OBJECTIFS = [
  { intent: 'progress_status', patterns: [/^objectifs?\?*$/, /^mes objectifs\b/, /ou j.?en suis/, /où j.?en suis/, /atteinte mensuelle/, /atteinte annuelle/, /objectif du mois/, /objectif mensuel/, /objectif de l.?annee/, /objectif de l.?année/, /avancement objectif/, /objectif.*atteint/], label: 'Avancement objectifs' },
  { intent: 'month_goal', patterns: [/objectif.*mois/, /cible.*mois/], label: 'Objectif mois' },
  { intent: 'annual_goal', patterns: [/objectif.*annuel/, /objectif.*annee/, /objectif.*année/], label: 'Objectif année' },
  { intent: 'annual_outlook', patterns: [/vais.?je atteindre/, /atteindre mon objectif annuel/, /objectif annuel atteignable/, /finir l.?annee/], label: 'Projection annuelle' },
];

const DECISION = [
  { intent: 'today_priorities', patterns: [/que faire aujourd/, /que dois.?je faire/, /quelles priorit/, /quelle priorit/, /^priorites\?*$/, /^priorités\?*$/, /urgences/, /aujourd.?hui\b.*faire/], label: 'Priorités du jour' },
  { intent: 'sell_today', patterns: [/^quoi vendre\b/, /^que vendre\b/, /que vendre cette/, /vendre aujourd/, /que puis.?je.*vendre/, /puis.?je.*vendre/, /leur vendre/, /vendre pour ameliorer/, /vendre pour améliorer/], label: 'Que vendre' },
  { intent: 'follow_up', patterns: [/qui relancer/, /relancer.*client/, /relances? du jour/], label: 'Relances' },
  { intent: 'documents_summary', patterns: [/^rapports\?*$/, /^documents\?*$/, /quels documents/, /documents generes/, /documents générés/, /mes rapports/], label: 'Documents' },
  { intent: 'activity_journal', patterns: [/^journal\?*$/, /^activite\?*$/, /activites recentes/, /activités récentes/, /historique recent/], label: 'Journal' },
  { intent: 'rh_personnel', patterns: [/^personnel\?*$/, /^equipes\?*$/, /mes equipes/, /effectif personnel/, /ressources humaines/], label: 'Personnel' },
  { intent: 'equipment_overview', patterns: [/mes equipements/, /tracteurs/, /maintenance equipement/, /etat equipements/], label: 'Équipements' },
  { intent: 'sync_status', patterns: [/synchronisations/, /sync erp/, /integrite donnees/, /integrité données/], label: 'Synchronisation' },
  { intent: 'system_overview', patterns: [/utilisateurs systeme/, /roles permissions/, /parametres systeme/, /gestion du systeme/], label: 'Administration' },
];

const INVESTISSEUR = [
  { intent: 'farm_overview', patterns: [/comment va la ferme/, /comment va l.?exploitation/, /comment va mon exploitation/, /situation globale/], label: 'Vue ferme' },
  { intent: 'farm_status', patterns: [/etat.*exploitation/, /état.*exploitation/, /situation.*ferme/, /resume.*exploitation/, /résumé.*exploitation/, /performance.*ferme/], label: 'État exploitation' },
  { intent: 'profitability', patterns: [/rentabilite/, /rentabilité/, /performance financiere/, /performance financière/], label: 'Rentabilité' },
  { intent: 'growth', patterns: [/croissance.*bonne/, /la croissance/, /business plan/, /\bbp\b/], label: 'Croissance' },
  { intent: 'ca_progress', patterns: [/ca progresse/, /chiffre.*progresse/, /ventes progressent/], label: 'Progression CA' },
  { intent: 'farm_risks', patterns: [/quels risques/, /mes risques/, /principal risque/, /risque principal/, /plus gros risque/, /quel risque/, /points de vigilance/], label: 'Risques exploitation' },
  { intent: 'farm_trends', patterns: [/comment evolue/, /evolution exploitation/, /tendance/, /dynamique exploitation/], label: 'Tendances' },
  { intent: 'farm_comparisons', patterns: [/compar/, /par rapport au mois/, /par rapport a la semaine/, /mois dernier/, /semaine precedente/], label: 'Comparaisons' },
  { intent: 'farm_opportunities', patterns: [/opportunite/, /opportunités/], label: 'Opportunités' },
  { intent: 'main_risk', patterns: [/principal risque/, /risque principal/, /plus gros risque/, /quel risque/], label: 'Risque principal' },
  { intent: 'investment_capacity', patterns: [/puis.?je investir/, /investir maintenant/, /capacite investissement/, /financement possible/], label: 'Investissement' },
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

function isDeclarativeAction(text = '') {
  const raw = String(text || '').trim();
  const q = normalizeAgriculturalText(text);
  if (/\?$/.test(raw)) return false;
  if (/^(que|qui|combien|quel|quelle|quels|quelles|comment|est ce|ou |vais je|puis je)/.test(q)) return false;
  return /^(j ai|jai |enregistre|declarer|nouveau )/.test(q) || /j.?ai vendu|vendu ce/.test(q);
}

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
export function classifyUniversalIntent(text = '', { minScore = 0.04, semanticMinScore = 0.26 } = {}) {
  const q = normalizeAgriculturalText(text);
  if (!q) return null;

  const declarerHit = isDeclarativeAction(text)
    ? matchFamily(q, UNIVERSAL_INTENT_FAMILIES.DECLARER, FAMILY_ENTRIES[UNIVERSAL_INTENT_FAMILIES.DECLARER])
    : null;
  if (declarerHit && declarerHit.score >= minScore) return declarerHit;

  const ultraShort = resolveUltraShortIntent(text);
  if (ultraShort) return ultraShort;

  let regexBest = null;
  for (const family of FAMILY_ORDER) {
    if (family === UNIVERSAL_INTENT_FAMILIES.DECLARER) continue;
    const hit = matchFamily(q, family, FAMILY_ENTRIES[family]);
    if (hit && (!regexBest || hit.score > regexBest.score)) regexBest = hit;
  }
  if (regexBest && regexBest.score >= minScore) return regexBest;

  const semantic = classifyBySemanticPhrases(text, SEMANTIC_INTENT_CATALOG, { minScore: semanticMinScore });
  if (semantic) return semantic;

  return regexBest && regexBest.score >= minScore ? regexBest : null;
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
