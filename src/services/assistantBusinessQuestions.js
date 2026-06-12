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
  METEO: 'METEO',
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
    q(F.DECISION, 'today_priorities', 'Priorités', ['que dois-je faire aujourd hui', 'par quoi commencer', 'que faire aujourd hui', 'c est quoi l urgence', 'par quoi je commence', 'quoi traiter en premier'], ['priorités du jour', 'urgences exploitation', 'plan du jour', 'feuille de route'], []),
    q(F.INVESTISSEUR, 'farm_overview', 'Vue ferme', ['comment va la ferme', 'comment va mon exploitation', 'situation globale', 'comment va l exploitation', 'etat de la ferme', 'resume de la ferme', 'bilan rapide'], ['état global exploitation', 'synthèse ferme', 'vue d ensemble'], ['performance globale ferme']),
    q(F.INVESTISSEUR, 'farm_trends', 'Tendances', ['comment evolue', 'tendance exploitation', 'dynamique', 'on progresse ou pas', 'tendance du mois'], ['évolution activité', 'tendance du mois'], []),
    q(F.INVESTISSEUR, 'farm_comparisons', 'Comparaisons', ['par rapport au mois dernier', 'comparaison mois', 'vs le mois passe', 'par rapport a la semaine derniere', 'mieux ou moins bien que avant'], ['évolution vs période précédente'], []),
    q(F.INVESTISSEUR, 'farm_risks', 'Risques', ['quels risques', 'mes risques', 'points de vigilance', 'qu est ce qui peut me poser probleme', 'alertes importantes'], ['analyse risques', 'cartographie risques'], []),
    q(F.COMMERCIAL, 'farm_opportunities', 'Opportunités', ['opportunites vente', 'quoi vendre', 'que puis je ecouler', 'produits a sortir du stock'], ['opportunités commerciales', 'axes de vente'], []),
  ],
  assistant_erp: [
    q(F.SALUTATION, 'greeting', 'Accueil', ['bonjour', 'salut', 'coucou'], [], []),
  ],
  centre_ia: [
    q(F.DECISION, 'today_priorities', 'Décisions', ['qu est ce qui est urgent', 'que traiter en priorité', 'risques a traiter', 'centre decisionnel', 'cerveau ferme'], ['décisions prioritaires', 'risques à traiter'], []),
    q(F.INVESTISSEUR, 'main_risk', 'Risques', ['quel est le principal risque', 'risque principal', 'plus gros risque', 'alerte critique'], ['risques exploitation'], ['principal risque financier']),
  ],
  objectifs_croissance: [
    q(F.OBJECTIFS, 'progress_status', 'Avancement', ['où j en suis sur mes objectifs', 'avancement objectif', 'objectifs', 'mes objectifs', 'ecart objectif', 'pourcentage objectif'], ['écart objectif mensuel', 'atteinte objectif'], ['projection objectifs']),
    q(F.OBJECTIFS, 'annual_outlook', 'Objectif annuel', ['vais je atteindre mon objectif annuel', 'objectif annuel atteignable', 'finir l année dans les clous', 'mon objectif est il atteignable', 'projection fin annee'], ['prévision objectif année', 'atteinte annuelle probable'], ['outlook annuel exploitation']),
  ],
  investisseurs_forums: [
    q(F.INVESTISSEUR, 'investor_summary', 'Investisseur', ['dossier investisseur', 'résumé pour la banque', 'dossier banque', 'presentation financeur'], ['vue financeur', 'dossier banque'], ['état pour investisseur', 'performance investisseur']),
    q(F.INVESTISSEUR, 'growth', 'Croissance', ['la croissance est elle bonne', 'croissance exploitation', 'on grandit bien'], ['tendance croissance'], ['croissance annuelle']),
    q(F.INVESTISSEUR, 'ca_progress', 'CA', ['le ca progresse t il', 'chiffre affaires progresse', 'ventes en hausse'], ['évolution ca'], ['progression ca annuel']),
    q(F.INVESTISSEUR, 'investment_capacity', 'Investissement', ['puis je investir', 'investir maintenant', 'financement possible', 'capacite d investissement'], ['capacité investissement'], ['investissement recommandé']),
    q(F.INVESTISSEUR, 'main_risk', 'Risque', ['principal risque', 'quel risque', 'plus gros risque', 'risque majeur'], ['analyse risques'], ['risque investisseur']),
  ],
  elevage: [
    q(F.ELEVAGE, 'my_animals', 'Mes animaux', ['mes animaux', 'mon cheptel', 'animaux', 'tout mon cheptel', 'liste animaux'], [], []),
    q(F.ELEVAGE, 'headcount_poulets', 'Poulets', ['combien ai-je de poulets', 'nombre de poulets', 'combien de poulets', 'poulets', 'mes poulets', 'j ai combien de poulets', 'effectif poulets', 'et les poulets'], [], []),
    q(F.ELEVAGE, 'headcount_pondeuses', 'Pondeuses', ['combien de pondeuses', 'nombre pondeuses', 'effectif pondeuses', 'pondeuses', 'mes pondeuses'], [], []),
    q(F.ELEVAGE, 'headcount_bovins', 'Bovins', ['combien de bovins', 'combien ai-je de bovins', 'et les bovins', 'et des bovins', 'bovins', 'mes bovins', 'j ai combien de bovins', 'combien de vaches', 'mes vaches'], [], []),
    q(F.ELEVAGE, 'headcount_ovins', 'Ovins', ['combien d ovins', 'combien de moutons', 'et les ovins', 'et des ovins', 'ovins', 'mes ovins', 'mes moutons'], [], []),
    q(F.ELEVAGE, 'headcount_caprins', 'Caprins', ['combien de caprins', 'combien de chevres', 'et les caprins', 'caprins', 'mes chevres'], [], []),
    q(F.ELEVAGE, 'headcount_total', 'Effectif total', ['combien de têtes au total', 'combien d animaux', 'effectif total cheptel', 'combien de tetes', 'total animaux ferme'], [], []),
    q(F.ELEVAGE, 'lots_overview', 'Mes lots', ['mes lots', 'mes bandes', 'lots', 'quels sont mes lots', 'lots actifs', 'bandes en cours'], [], []),
    q(F.ELEVAGE, 'lots_sick', 'Lots malades', ['quels lots sont malades', 'lots malades', 'bandes en alerte santé', 'lot en difficulte', 'quelle bande est malade'], [], []),
    q(F.ELEVAGE, 'lot_mortality', 'Mortalité lots', ['quel lot perd le plus d animaux', 'lot avec plus de mortalité', 'mortalité par lot', 'mortalites', 'ou est la mortalite'], [], []),
    q(F.ELEVAGE, 'animals_under_treatment', 'Traitements', ['quels animaux sous traitement', 'et sous traitement', 'lesquels sont sous traitement', 'bovins sous traitement', 'sous traitement', 'en traitement'], [], []),
    q(F.ELEVAGE, 'lots_surveillance', 'Surveillance', ['lots à surveiller', 'quels lots surveiller', 'quel lot dois je surveiller', 'bande a surveiller'], [], []),
    q(F.ELEVAGE, 'elevage_status', 'État élevage', ['comment va l elevage', 'etat elevage', 'situation elevage', 'elevage ce matin'], [], []),
    q(F.ELEVAGE, 'stock_aliment', 'Alimentation', ['combien me reste t il d aliment', 'reste aliment', 'alimentation lots', 'aliment pour les lots'], [], []),
  ],
  cultures: [
    q(F.METEO, 'weather_now', 'Météo', ['quelle est la meteo', 'quelle est la météo', 'meteo aujourd hui', 'météo aujourd hui', 'il fait quel temps', 'temps qu il fait', 'temperature actuelle', 'température actuelle', 'meteo', 'météo', 'c est chaud dehors'], [], []),
    q(F.METEO, 'weather_risk', 'Risques météo', ['risque meteo', 'risque météo', 'alerte meteo', 'alerte météo', 'meteo elevage', 'météo élevage', 'conditions meteo', 'conditions météo', 'meteo pour les cultures'], [], []),
    q(F.METEO, 'weather_forecast', 'Prévisions', ['previsions meteo', 'prévisions météo', 'va t il pleuvoir', 'pleuvra t il', 'meteo demain', 'météo demain', 'pluie cette semaine'], [], []),
    q(F.CULTURES, 'parcel_best', 'Meilleure parcelle', ['quelle parcelle performe le mieux', 'meilleure parcelle', 'parcelle la plus rentable', 'parcelle qui rapporte'], [], []),
    q(F.CULTURES, 'recoltes', 'Récoltes', ['que puis-je récolter', 'quoi récolter maintenant', 'récoltes possibles', 'recoltes', 'c est pret a recolter'], [], []),
    q(F.CULTURES, 'rendement', 'Rendement', ['quel rendement cette saison', 'rendement cultures', 'productivité parcelles', 'rendements', 'rendement tomates'], [], []),
    q(F.CULTURES, 'culture_profit', 'Culture rentable', ['quelle culture me rapporte le plus', 'culture la plus rentable', 'meilleure culture'], [], []),
    q(F.CULTURES, 'parcelles_status', 'Parcelles', ['état des parcelles', 'mes parcelles', 'parcelles', 'combien de parcelles', 'situation parcelles'], [], []),
    q(F.CULTURES, 'cultures_difficulte', 'Difficultés', ['cultures en difficulte', 'parcelles en difficulte', 'pertes cultures', 'parcelle en probleme'], [], []),
    q(F.CULTURES, 'campagnes', 'Campagnes', ['campagne agricole', 'campagnes en cours', 'saison en cours'], [], []),
  ],
  commercial: [
    q(F.COMMERCIAL, 'ventes', 'Ventes', ['mes ventes', 'ventes', 'chiffre affaires', 'mon ca', 'ca', 'combien ai je vendu', 'ventes de la semaine', 'performance ventes'], [], []),
    q(F.COMMERCIAL, 'top_client', 'Meilleur client', ['quel est mon meilleur client', 'meilleur client', 'client numéro un', 'clients', 'top client', 'client le plus important'], [], []),
    q(F.COMMERCIAL, 'receivables', 'Créances', ['qui me doit de l argent', 'clients qui me doivent', 'créances clients', 'impayes clients', 'argent pas encore paye'], [], []),
    q(F.COMMERCIAL, 'top_product', 'Meilleur produit', ['quel produit se vend le mieux', 'meilleur produit', 'produit vedette', 'article le plus vendu'], [], []),
    q(F.COMMERCIAL, 'ventes_today', 'Ventes jour', ['ventes aujourd hui', 'qu ai-je vendu aujourd hui', 'ventes du jour', 'ventes du jour ca'], [], []),
    q(F.COMMERCIAL, 'relances', 'Relances', ['clients à relancer', 'qui relancer', 'relances', 'qui n a pas paye'], [], []),
    q(F.COMMERCIAL, 'commercial_summary', 'Situation commerciale', ['situation commerciale', 'resume commercial', 'mes clients', 'bilan commercial'], [], []),
    q(F.COMMERCIAL, 'orders_overview', 'Commandes', ['mes commandes', 'commandes en cours', 'commandes ouvertes', 'commandes a traiter'], [], []),
    q(F.COMMERCIAL, 'deliveries_overview', 'Livraisons', ['mes livraisons', 'livraisons en attente', 'livraisons du jour', 'livraisons prevues'], [], []),
    q(F.DECISION, 'sell_today', 'Que vendre', ['que vendre', 'quoi vendre', 'que vendre cette semaine', 'que puis je leur vendre', 'quoi ecouler'], [], []),
  ],
  achats_stock: [
    q(F.STOCK, 'stock_overview', 'Stock', ['mon stock', 'état du stock', 'situation stock', 'stock', 'inventaire', 'etat magasin'], [], []),
    q(F.STOCK, 'stock_remain', 'Reste stock', ['qu est-ce qu il me reste', 'que contient mon magasin', 'qu ai-je en magasin', 'produits restants', 'magasin', 'il reste quoi'], [], []),
    q(F.STOCK, 'stock_aliment', 'Aliment', ['ai-je encore de l aliment', 'combien de sacs d aliment', 'reste aliment', 'assez d aliment', 'aliment', 'sacs aliment restants'], [], []),
    q(F.STOCK, 'stock_sellable', 'Vendable', ['que puis-je vendre', 'produits à vendre', 'quoi vendre du stock', 'stock disponible vente'], [], []),
    q(F.STOCK, 'stock_ruptures', 'Ruptures', ['ruptures stock', 'produits en rupture', 'manques stock', 'ruptures', 'stock bas', 'sous seuil'], [], []),
    q(F.STOCK, 'stock_dlc', 'DLC', ['dlc proches', 'peremption produits', 'dates limite consommation', 'produits perimes bientot'], [], []),
    q(F.STOCK, 'purchases_overview', 'Achats', ['mes achats', 'achats recents', 'derniers achats', 'achats du mois'], [], []),
    q(F.STOCK, 'suppliers_overview', 'Fournisseurs', ['mes fournisseurs', 'fournisseurs actifs', 'fournisseurs', 'liste fournisseurs'], [], []),
  ],
  finance_pilotage: [
    q(F.FINANCE, 'treasury', 'Trésorerie', ['quelle est ma trésorerie', 'combien ai-je en banque', 'combien en caisse', 'argent disponible', 'tresorerie', 'liquidite', 'ma caisse'], [], []),
    q(F.FINANCE, 'dettes', 'Dettes', ['mes dettes', 'dettes fournisseurs', 'que dois-je payer', 'dettes', 'factures a payer'], [], []),
    q(F.FINANCE, 'creances', 'Créances', ['mes créances', 'argent à récupérer', 'creances', 'encaissements attendus'], [], []),
    q(F.FINANCE, 'resultat', 'Rentabilité', ['suis-je rentable', 'est-ce rentable', 'résultat exploitation', 'bénéfice ferme', 'rentabilite', 'marges', 'exploitation rentable'], [], []),
    q(F.FINANCE, 'charges_overview', 'Charges', ['mes charges', 'charges exploitation', 'depenses', 'ou part l argent'], [], []),
    q(F.INVESTISSEUR, 'investment_capacity', 'Financement', ['financement', 'puis je investir', 'investissements possibles', 'budget investissement'], [], []),
  ],
  activite_suivi: [
    q(F.DECISION, 'today_priorities', 'Activité', ['activité du jour', 'événements récents', 'activite', 'quoi s est passe aujourd hui'], [], []),
    q(F.DECISION, 'activity_journal', 'Journal', ['journal activite', 'historique recent', 'activites recentes', 'journal', 'carnet activite'], [], []),
  ],
  documents_rapports: [
    q(F.DECISION, 'documents_summary', 'Documents', ['quels documents ont ete generes', 'mes rapports', 'rapports', 'exports documents', 'documents', 'derniers rapports'], [], []),
  ],
  rh: [
    q(F.DECISION, 'rh_personnel', 'Personnel', ['personnel', 'mes equipes', 'equipes', 'effectif personnel', 'ressources humaines', 'qui travaille', 'employes'], [], []),
    q(F.DECISION, 'equipment_overview', 'Équipements', ['mes equipements', 'tracteurs', 'maintenance equipements', 'etat equipements', 'materiel en panne', 'pompe cassee'], [], []),
  ],
  sync_activity: [
    q(F.DECISION, 'sync_status', 'Synchronisation', ['synchronisations', 'etat sync erp', 'integrite donnees', 'donnees coherentes', 'sync ok'], [], []),
  ],
  gestion_systeme: [
    q(F.DECISION, 'system_overview', 'Administration', ['utilisateurs', 'roles permissions', 'parametres systeme', 'gestion systeme', 'config erp'], [], []),
  ],
});

/** Liste aplatie pour le matcher sémantique. */
export const SEMANTIC_INTENT_CATALOG = Object.freeze(
  Object.values(MODULE_BUSINESS_QUESTIONS).flat(),
);

export const ASSISTANT_BUSINESS_QUESTIONS = MODULE_BUSINESS_QUESTIONS;

export default MODULE_BUSINESS_QUESTIONS;
