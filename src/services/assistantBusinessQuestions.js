/**
 * ASSISTANT_BUSINESS_QUESTIONS — matrice de questions naturelles par module et profil.
 */

/** Familles alignées sur UNIVERSAL_INTENT_FAMILIES (évite import circulaire). */
const F = Object.freeze({
  SALUTATION: 'SALUTATION',
  ELEVAGE: 'ELEVAGE',
  CULTURES: 'CULTURES',
  STOCK: 'STOCK',
  COMMERCIAL: 'COMMERCIAL',
  FINANCE: 'FINANCE',
  OBJECTIFS: 'OBJECTIFS',
  DECISION: 'DECISION',
  INVESTISSEUR: 'INVESTISSEUR',
});

function q(family, intent, label, farmer = [], manager = [], investor = []) {
  return {
    family,
    intent,
    label,
    phrases: [...farmer, ...manager, ...investor],
    farmer,
    manager,
    investor,
  };
}

/** Questions par module ERP (lecture seule). */
export const MODULE_BUSINESS_QUESTIONS = Object.freeze({
  dashboard: [
    q(F.DECISION, 'today_priorities', 'Priorités', ['que dois-je faire aujourd hui', 'par quoi commencer'], ['priorités du jour', 'urgences exploitation'], []),
    q(F.INVESTISSEUR, 'farm_overview', 'Vue ferme', ['comment va la ferme', 'comment va mon exploitation', 'situation globale'], ['état global exploitation', 'synthèse ferme'], ['performance globale ferme']),
  ],
  assistant_erp: [],
  centre_ia: [
    q(F.DECISION, 'today_priorities', 'Décisions', ['qu est ce qui est urgent', 'que traiter en priorité'], ['décisions prioritaires', 'risques à traiter'], []),
  ],
  objectifs_croissance: [
    q(F.OBJECTIFS, 'progress_status', 'Avancement', ['où j en suis sur mes objectifs', 'avancement objectif'], ['écart objectif mensuel', 'atteinte objectif'], ['projection objectifs']),
    q(F.OBJECTIFS, 'annual_outlook', 'Objectif annuel', ['vais je atteindre mon objectif annuel', 'objectif annuel atteignable', 'finir l année dans les clous'], ['prévision objectif année', 'atteinte annuelle probable'], ['outlook annuel exploitation']),
  ],
  investisseurs_forums: [
    q(F.INVESTISSEUR, 'investor_summary', 'Investisseur', ['dossier investisseur', 'résumé pour la banque'], ['vue financeur', 'dossier banque'], ['état pour investisseur', 'performance investisseur']),
  ],
  elevage: [
    q(F.ELEVAGE, 'headcount_poulets', 'Poulets', ['combien ai-je de poulets', 'nombre de poulets', 'combien de poulets'], [], []),
    q(F.ELEVAGE, 'headcount_pondeuses', 'Pondeuses', ['combien de pondeuses', 'nombre pondeuses', 'effectif pondeuses'], [], []),
    q(F.ELEVAGE, 'headcount_bovins', 'Bovins', ['combien de bovins', 'combien ai-je de bovins', 'et les bovins', 'et des bovins'], [], []),
    q(F.ELEVAGE, 'headcount_total', 'Effectif total', ['combien de têtes au total', 'combien d animaux', 'effectif total cheptel'], [], []),
    q(F.ELEVAGE, 'lots_sick', 'Lots malades', ['quels lots sont malades', 'lots malades', 'bandes en alerte santé'], [], []),
    q(F.ELEVAGE, 'lot_mortality', 'Mortalité lots', ['quel lot perd le plus d animaux', 'lot avec plus de mortalité', 'mortalité par lot'], [], []),
    q(F.ELEVAGE, 'animals_under_treatment', 'Traitements', ['quels animaux sous traitement', 'et sous traitement', 'lesquels sont sous traitement', 'bovins sous traitement'], [], []),
    q(F.ELEVAGE, 'lots_surveillance', 'Surveillance', ['lots à surveiller', 'quels lots surveiller'], [], []),
  ],
  cultures: [
    q(F.CULTURES, 'parcel_best', 'Meilleure parcelle', ['quelle parcelle performe le mieux', 'meilleure parcelle', 'parcelle la plus rentable'], [], []),
    q(F.CULTURES, 'recoltes', 'Récoltes', ['que puis-je récolter', 'quoi récolter maintenant', 'récoltes possibles'], [], []),
    q(F.CULTURES, 'rendement', 'Rendement', ['quel rendement cette saison', 'rendement cultures', 'productivité parcelles'], [], []),
    q(F.CULTURES, 'culture_profit', 'Culture rentable', ['quelle culture me rapporte le plus', 'culture la plus rentable'], [], []),
    q(F.CULTURES, 'parcelles_status', 'Parcelles', ['état des parcelles', 'mes parcelles'], [], []),
  ],
  commercial: [
    q(F.COMMERCIAL, 'top_client', 'Meilleur client', ['quel est mon meilleur client', 'meilleur client', 'client numéro un'], [], []),
    q(F.COMMERCIAL, 'receivables', 'Créances', ['qui me doit de l argent', 'clients qui me doivent', 'créances clients'], [], []),
    q(F.COMMERCIAL, 'top_product', 'Meilleur produit', ['quel produit se vend le mieux', 'meilleur produit', 'produit vedette'], [], []),
    q(F.COMMERCIAL, 'ventes_today', 'Ventes jour', ['ventes aujourd hui', 'qu ai-je vendu aujourd hui', 'ventes du jour'], [], []),
    q(F.COMMERCIAL, 'relances', 'Relances', ['clients à relancer', 'qui relancer'], [], []),
  ],
  achats_stock: [
    q(F.STOCK, 'stock_overview', 'Stock', ['mon stock', 'état du stock', 'situation stock'], [], []),
    q(F.STOCK, 'stock_remain', 'Reste stock', ['qu est-ce qu il me reste', 'que contient mon magasin', 'qu ai-je en magasin', 'produits restants'], [], []),
    q(F.STOCK, 'stock_aliment', 'Aliment', ['ai-je encore de l aliment', 'combien de sacs d aliment', 'reste aliment', 'assez d aliment'], [], []),
    q(F.STOCK, 'stock_sellable', 'Vendable', ['que puis-je vendre', 'produits à vendre', 'quoi vendre du stock'], [], []),
    q(F.STOCK, 'stock_ruptures', 'Ruptures', ['ruptures stock', 'produits en rupture', 'manques stock'], [], []),
  ],
  finance_pilotage: [
    q(F.FINANCE, 'treasury', 'Trésorerie', ['quelle est ma trésorerie', 'combien ai-je en banque', 'combien en caisse', 'argent disponible'], [], []),
    q(F.FINANCE, 'dettes', 'Dettes', ['mes dettes', 'dettes fournisseurs', 'que dois-je payer'], [], []),
    q(F.FINANCE, 'creances', 'Créances', ['mes créances', 'argent à récupérer'], [], []),
    q(F.FINANCE, 'resultat', 'Rentabilité', ['suis-je rentable', 'est-ce rentable', 'résultat exploitation', 'bénéfice ferme'], [], []),
  ],
  activite_suivi: [
    q(F.DECISION, 'today_priorities', 'Activité', ['activité du jour', 'événements récents'], [], []),
  ],
  documents_rapports: [],
  rh: [],
  sync_activity: [],
  gestion_systeme: [],
});

/** Liste aplatie pour le matcher sémantique. */
export const SEMANTIC_INTENT_CATALOG = Object.freeze(
  Object.values(MODULE_BUSINESS_QUESTIONS).flat(),
);

export const ASSISTANT_BUSINESS_QUESTIONS = MODULE_BUSINESS_QUESTIONS;

export default MODULE_BUSINESS_QUESTIONS;
