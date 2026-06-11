/**
 * ASSISTANT_BUSINESS_QUESTIONS — matrice de questions naturelles par module et profil.
 * Porte d'entrée universelle Horizon Farm V6 — couverture ≥ 95 % par domaine.
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
    q(F.DECISION, 'today_priorities', 'Priorités', ['que dois-je faire aujourd hui', 'par quoi commencer', 'que faire aujourd hui'], ['priorités du jour', 'urgences exploitation'], []),
    q(F.INVESTISSEUR, 'farm_overview', 'Vue ferme', ['comment va la ferme', 'comment va mon exploitation', 'situation globale', 'comment va l exploitation'], ['état global exploitation', 'synthèse ferme'], ['performance globale ferme']),
  ],
  assistant_erp: [
    q(F.SALUTATION, 'greeting', 'Accueil', ['bonjour', 'salut', 'coucou'], [], []),
  ],
  centre_ia: [
    q(F.DECISION, 'today_priorities', 'Décisions', ['qu est ce qui est urgent', 'que traiter en priorité', 'risques a traiter'], ['décisions prioritaires', 'risques à traiter'], []),
    q(F.INVESTISSEUR, 'main_risk', 'Risques', ['quel est le principal risque', 'risque principal', 'plus gros risque'], ['risques exploitation'], ['principal risque financier']),
  ],
  objectifs_croissance: [
    q(F.OBJECTIFS, 'progress_status', 'Avancement', ['où j en suis sur mes objectifs', 'avancement objectif', 'objectifs', 'mes objectifs'], ['écart objectif mensuel', 'atteinte objectif'], ['projection objectifs']),
    q(F.OBJECTIFS, 'annual_outlook', 'Objectif annuel', ['vais je atteindre mon objectif annuel', 'objectif annuel atteignable', 'finir l année dans les clous', 'mon objectif est il atteignable'], ['prévision objectif année', 'atteinte annuelle probable'], ['outlook annuel exploitation']),
  ],
  investisseurs_forums: [
    q(F.INVESTISSEUR, 'investor_summary', 'Investisseur', ['dossier investisseur', 'résumé pour la banque'], ['vue financeur', 'dossier banque'], ['état pour investisseur', 'performance investisseur']),
    q(F.INVESTISSEUR, 'growth', 'Croissance', ['la croissance est elle bonne', 'croissance exploitation'], ['tendance croissance'], ['croissance annuelle']),
    q(F.INVESTISSEUR, 'ca_progress', 'CA', ['le ca progresse t il', 'chiffre affaires progresse'], ['évolution ca'], ['progression ca annuel']),
    q(F.INVESTISSEUR, 'investment_capacity', 'Investissement', ['puis je investir', 'investir maintenant', 'financement possible'], ['capacité investissement'], ['investissement recommandé']),
    q(F.INVESTISSEUR, 'main_risk', 'Risque', ['principal risque', 'quel risque'], ['analyse risques'], ['risque investisseur']),
  ],
  elevage: [
    q(F.ELEVAGE, 'my_animals', 'Mes animaux', ['mes animaux', 'mon cheptel', 'animaux'], [], []),
    q(F.ELEVAGE, 'headcount_poulets', 'Poulets', ['combien ai-je de poulets', 'nombre de poulets', 'combien de poulets', 'poulets', 'mes poulets', 'j ai combien de poulets'], [], []),
    q(F.ELEVAGE, 'headcount_pondeuses', 'Pondeuses', ['combien de pondeuses', 'nombre pondeuses', 'effectif pondeuses', 'pondeuses'], [], []),
    q(F.ELEVAGE, 'headcount_bovins', 'Bovins', ['combien de bovins', 'combien ai-je de bovins', 'et les bovins', 'et des bovins', 'bovins', 'mes bovins', 'j ai combien de bovins'], [], []),
    q(F.ELEVAGE, 'headcount_ovins', 'Ovins', ['combien d ovins', 'combien de moutons', 'et les ovins', 'et des ovins', 'ovins', 'mes ovins'], [], []),
    q(F.ELEVAGE, 'headcount_caprins', 'Caprins', ['combien de caprins', 'combien de chevres', 'et les caprins', 'caprins'], [], []),
    q(F.ELEVAGE, 'headcount_total', 'Effectif total', ['combien de têtes au total', 'combien d animaux', 'effectif total cheptel', 'combien de tetes'], [], []),
    q(F.ELEVAGE, 'lots_overview', 'Mes lots', ['mes lots', 'mes bandes', 'lots', 'quels sont mes lots'], [], []),
    q(F.ELEVAGE, 'lots_sick', 'Lots malades', ['quels lots sont malades', 'lots malades', 'bandes en alerte santé'], [], []),
    q(F.ELEVAGE, 'lot_mortality', 'Mortalité lots', ['quel lot perd le plus d animaux', 'lot avec plus de mortalité', 'mortalité par lot', 'mortalites'], [], []),
    q(F.ELEVAGE, 'animals_under_treatment', 'Traitements', ['quels animaux sous traitement', 'et sous traitement', 'lesquels sont sous traitement', 'bovins sous traitement', 'sous traitement'], [], []),
    q(F.ELEVAGE, 'lots_surveillance', 'Surveillance', ['lots à surveiller', 'quels lots surveiller', 'quel lot dois je surveiller'], [], []),
    q(F.ELEVAGE, 'elevage_status', 'État élevage', ['comment va l elevage', 'etat elevage', 'situation elevage'], [], []),
    q(F.ELEVAGE, 'stock_aliment', 'Alimentation', ['combien me reste t il d aliment', 'reste aliment', 'alimentation lots'], [], []),
  ],
  cultures: [
    q(F.CULTURES, 'parcel_best', 'Meilleure parcelle', ['quelle parcelle performe le mieux', 'meilleure parcelle', 'parcelle la plus rentable'], [], []),
    q(F.CULTURES, 'recoltes', 'Récoltes', ['que puis-je récolter', 'quoi récolter maintenant', 'récoltes possibles', 'recoltes'], [], []),
    q(F.CULTURES, 'rendement', 'Rendement', ['quel rendement cette saison', 'rendement cultures', 'productivité parcelles', 'rendements'], [], []),
    q(F.CULTURES, 'culture_profit', 'Culture rentable', ['quelle culture me rapporte le plus', 'culture la plus rentable'], [], []),
    q(F.CULTURES, 'parcelles_status', 'Parcelles', ['état des parcelles', 'mes parcelles', 'parcelles', 'combien de parcelles'], [], []),
    q(F.CULTURES, 'cultures_difficulte', 'Difficultés', ['cultures en difficulte', 'parcelles en difficulte', 'pertes cultures'], [], []),
    q(F.CULTURES, 'campagnes', 'Campagnes', ['campagne agricole', 'campagnes en cours'], [], []),
  ],
  commercial: [
    q(F.COMMERCIAL, 'ventes', 'Ventes', ['mes ventes', 'ventes', 'chiffre affaires', 'mon ca', 'ca'], [], []),
    q(F.COMMERCIAL, 'top_client', 'Meilleur client', ['quel est mon meilleur client', 'meilleur client', 'client numéro un', 'clients'], [], []),
    q(F.COMMERCIAL, 'receivables', 'Créances', ['qui me doit de l argent', 'clients qui me doivent', 'créances clients'], [], []),
    q(F.COMMERCIAL, 'top_product', 'Meilleur produit', ['quel produit se vend le mieux', 'meilleur produit', 'produit vedette'], [], []),
    q(F.COMMERCIAL, 'ventes_today', 'Ventes jour', ['ventes aujourd hui', 'qu ai-je vendu aujourd hui', 'ventes du jour'], [], []),
    q(F.COMMERCIAL, 'relances', 'Relances', ['clients à relancer', 'qui relancer', 'relances'], [], []),
    q(F.COMMERCIAL, 'commercial_summary', 'Situation commerciale', ['situation commerciale', 'resume commercial', 'mes clients'], [], []),
    q(F.COMMERCIAL, 'orders_overview', 'Commandes', ['mes commandes', 'commandes en cours', 'commandes ouvertes'], [], []),
    q(F.COMMERCIAL, 'deliveries_overview', 'Livraisons', ['mes livraisons', 'livraisons en attente', 'livraisons du jour'], [], []),
    q(F.DECISION, 'sell_today', 'Que vendre', ['que vendre', 'quoi vendre', 'que vendre cette semaine', 'que puis je leur vendre'], [], []),
  ],
  achats_stock: [
    q(F.STOCK, 'stock_overview', 'Stock', ['mon stock', 'état du stock', 'situation stock', 'stock'], [], []),
    q(F.STOCK, 'stock_remain', 'Reste stock', ['qu est-ce qu il me reste', 'que contient mon magasin', 'qu ai-je en magasin', 'produits restants', 'magasin'], [], []),
    q(F.STOCK, 'stock_aliment', 'Aliment', ['ai-je encore de l aliment', 'combien de sacs d aliment', 'reste aliment', 'assez d aliment', 'aliment'], [], []),
    q(F.STOCK, 'stock_sellable', 'Vendable', ['que puis-je vendre', 'produits à vendre', 'quoi vendre du stock'], [], []),
    q(F.STOCK, 'stock_ruptures', 'Ruptures', ['ruptures stock', 'produits en rupture', 'manques stock', 'ruptures'], [], []),
    q(F.STOCK, 'stock_dlc', 'DLC', ['dlc proches', 'peremption produits', 'dates limite consommation'], [], []),
    q(F.STOCK, 'purchases_overview', 'Achats', ['mes achats', 'achats recents', 'derniers achats'], [], []),
    q(F.STOCK, 'suppliers_overview', 'Fournisseurs', ['mes fournisseurs', 'fournisseurs actifs', 'fournisseurs'], [], []),
  ],
  finance_pilotage: [
    q(F.FINANCE, 'treasury', 'Trésorerie', ['quelle est ma trésorerie', 'combien ai-je en banque', 'combien en caisse', 'argent disponible', 'tresorerie'], [], []),
    q(F.FINANCE, 'dettes', 'Dettes', ['mes dettes', 'dettes fournisseurs', 'que dois-je payer', 'dettes'], [], []),
    q(F.FINANCE, 'creances', 'Créances', ['mes créances', 'argent à récupérer', 'creances'], [], []),
    q(F.FINANCE, 'resultat', 'Rentabilité', ['suis-je rentable', 'est-ce rentable', 'résultat exploitation', 'bénéfice ferme', 'rentabilite', 'marges'], [], []),
    q(F.FINANCE, 'charges_overview', 'Charges', ['mes charges', 'charges exploitation', 'depenses'], [], []),
    q(F.INVESTISSEUR, 'investment_capacity', 'Financement', ['financement', 'puis je investir', 'investissements possibles'], [], []),
  ],
  activite_suivi: [
    q(F.DECISION, 'today_priorities', 'Activité', ['activité du jour', 'événements récents', 'activite'], [], []),
    q(F.DECISION, 'activity_journal', 'Journal', ['journal activite', 'historique recent', 'activites recentes', 'journal'], [], []),
  ],
  documents_rapports: [
    q(F.DECISION, 'documents_summary', 'Documents', ['quels documents ont ete generes', 'mes rapports', 'rapports', 'exports documents', 'documents'], [], []),
  ],
  rh: [
    q(F.DECISION, 'rh_personnel', 'Personnel', ['personnel', 'mes equipes', 'equipes', 'effectif personnel', 'ressources humaines'], [], []),
    q(F.DECISION, 'equipment_overview', 'Équipements', ['mes equipements', 'tracteurs', 'maintenance equipements', 'etat equipements'], [], []),
  ],
  sync_activity: [
    q(F.DECISION, 'sync_status', 'Synchronisation', ['synchronisations', 'etat sync erp', 'integrite donnees'], [], []),
  ],
  gestion_systeme: [
    q(F.DECISION, 'system_overview', 'Administration', ['utilisateurs', 'roles permissions', 'parametres systeme', 'gestion systeme'], [], []),
  ],
});

/** Liste aplatie pour le matcher sémantique. */
export const SEMANTIC_INTENT_CATALOG = Object.freeze(
  Object.values(MODULE_BUSINESS_QUESTIONS).flat(),
);

export const ASSISTANT_BUSINESS_QUESTIONS = MODULE_BUSINESS_QUESTIONS;

export default MODULE_BUSINESS_QUESTIONS;
