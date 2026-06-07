/** Annexe — explications simples des calculs (Centre + Objectifs). */

import { DEFAULT_PILOTAGE_SETTINGS, normalizePilotageSettings } from './pilotageSettingsService.js';
import { HIJRI_FESTIVAL_RULES } from './islamicCalendarEngine.js';
import { annexePresetForModule } from './annexeModuleConfig.js';

const arr = (v) => (Array.isArray(v) ? v : []);

/** Catégories affichées dans l'Annexe. */
export const FORMULA_CATEGORIES = [
  { id: 'calendrier', label: 'Dates & fêtes' },
  { id: 'commerce', label: 'Objectifs de vente' },
  { id: 'demande', label: 'Demande & stock disponible' },
  { id: 'zootechnie', label: 'Performance des animaux' },
  { id: 'couts', label: 'Coûts & bénéfices' },
  { id: 'flux', label: 'Aliment, bâtiments & trésorerie' },
  { id: 'prix', label: 'Prix de vente conseillés' },
  { id: 'analytique', label: 'Comparaisons & alertes' },
  { id: 'graphiques', label: 'Courbes du tableau de bord' },
  { id: 'pilotage', label: 'Réglages & alertes du quotidien' },
];

/** Sigles et mots — lire en premier. */
export const ACRONYM_GLOSSARY = [
  { term: 'J+40, J+90…', definition: 'Nombre de jours depuis le début de la bande ou l\'entrée des animaux. J+40 = 40 jours après le lancement. J+90 = environ 3 mois d\'élevage.' },
  { term: 'BFR', definition: 'Besoin en fonds de roulement : avez-vous assez d\'argent (caisse + factures clients à encaisser) pour payer l\'aliment du prochain cycle avant d\'être payé vous-même ?' },
  { term: 'ITH', definition: 'Indice chaleur ressentie = température (°C) + humidité (%). Au-dessus de 29, les animaux souffrent et mangent mal.' },
  { term: 'IC (indice consommation)', definition: 'Kilos d\'aliment nécessaires pour produire 1 kg de poulet. Exemple : 1,8 = 1,8 kg d\'aliment pour 1 kg de viande. Cible chair : 1,6 à 1,9.' },
  { term: 'GMQ / prise de poids', definition: 'Combien l\'animal grossit par jour (grammes ou kg). Sert à savoir s\'il vaut encore la peine de le nourrir.' },
  { term: 'MCA / marge aliment', definition: 'Ce qu\'il reste après avoir payé uniquement l\'aliment : ventes − coût aliment.' },
  { term: 'Point mort', definition: 'Chiffre d\'affaires minimum du mois pour couvrir toutes les charges (salaires, achats, etc.). En dessous, vous perdez de l\'argent.' },
  { term: 'Vide sanitaire', definition: 'Pause sans animaux dans le bâtiment (souvent 10 jours) pour nettoyer et désinfecter entre deux bandes.' },
  { term: 'Date pivot / date limite', definition: 'Dernière date pour lancer ou acheter afin d\'être prêt à vendre avant une fête (Tabaski, Korité…).' },
  { term: 'Taux de ponte', definition: 'Pourcentage de poules qui pondent chaque jour (ex. 85 % = 85 poules sur 100 ont pondu).' },
  { term: 'Souche / race', definition: 'Type de poules ou animaux achetés (ex. Novogen, Lohmann) avec une fiche performance (ponte, poids attendus).' },
  { term: 'Effet ciseau', definition: 'Quand le prix de l\'aliment monte vite alors que le prix de vente de la viande ne suit pas — marge compressée.' },
  { term: 'Couverture %', definition: 'Pourcentage : est-ce que votre stock ou votre argent suffit par rapport à l\'objectif ou au coût du cycle ? 100 % = juste assez. 50 % = il manque la moitié.' },
  { term: 'Catalogue race / objectif catalogue', definition: 'Fiche de référence du fabricant : à tel âge, la race devrait peser X ou pondre Y %.' },
  { term: 'Client VIP (BFR)', definition: 'Gros client dont l\'encaissement proche est compté dans l\'argent disponible pour lancer une bande.' },
];

/** Rappels courts par thème. */
export const DECISION_METHODOLOGY_SECTIONS = [
  { id: 'calendrier', title: 'Fêtes & dates', items: ['Les dates de Tabaski, Korité, Magal… sont calculées automatiquement.', 'Vous pouvez les corriger manuellement dans Paramètres pilotage si besoin.'] },
  { id: 'quand-vendre', title: 'Quand vendre ?', items: ['Si le coût aliment du jour dépasse le gain de poids du jour → vendre.', 'Bœufs : module Animaux · Poulets : module Avicole.'] },
  { id: 'quand-lancer', title: 'Quand lancer une bande ?', items: ['Date limite = date de la fête − durée du cycle (90 j bœuf, 40 j poulet).', 'Alerte rouge si la date est passée et qu\'il n\'y a rien en production.'] },
  { id: 'bfr', title: 'Argent pour l\'aliment (BFR)', items: ['On compare trésorerie + factures VIP à payer vs coût aliment du cycle.', 'Si couverture < 50 % → ne pas lancer (réglable).'] },
  { id: 'demande', title: 'Demande clients', items: ['Estime les ventes du mois (saison + fêtes) et vérifie si vous avez assez de stock ou production.'] },
  { id: 'zootechnical', title: 'Performance vs race', items: ['Compare ponte ou poids réels à la fiche de la race achetée.'] },
  { id: 'break_even', title: 'Seuil de rentabilité', items: ['Montant minimum à vendre ce mois pour payer charges fixes et variables.'] },
  { id: 'stock_audit', title: 'Coulage aliment ?', items: ['Si le silo sort plus d\'aliment que les animaux ne devraient manger → alerte par bâtiment.'] },
  { id: 'couts', title: 'Coût de revient', items: ['Achats + aliment + santé + frais = coût total. Marge = vente − coût.'] },
  { id: 'prix', title: 'Prix conseillé', items: ['Ne jamais vendre sous le coût + marge minimum. Tenir compte du marché local et de la saison.'] },
];

export const FORMULA_BLOCKS = [
  {
    id: "hijri_calendar",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "calendrier",
    title: "Dates des fêtes (calendrier musulman)",
    summary: "Le système calcule tout seul la date de Tabaski, Korité, Ramadan, Magal, Gamou et fin d'année, sans que vous ayez à les saisir.",
    formula: "Chaque fête a une date fixe dans le calendrier musulman (hijri).\nLe logiciel la convertit en date du calendrier courant.\n\nExemples :\n• Tabaski → 10e jour du 12e mois hijri\n• Korité → 1er jour du 10e mois hijri\n• Magal → 18e jour du 2e mois hijri\n\nDate limite pour se préparer = date de la fête − durée du cycle (90 j bœuf, 40 j poulet, 30 j œufs).",
    parameters: [
      { label: "Date de la fête", unit: "jour", default: "calculée auto", where: "Paramètres pilotage → fêtes (surcharge possible)" },
      { label: "Durée du cycle", unit: "jours", default: "90 / 40 / 30", where: "Réglages de la ferme" },
    ],
    outputs: ["Date de la fête affichée", "Date limite pour lancer ou acheter"],
  },
  {
    id: "launch_timing",
    modules: ["centre_ia"],
    category: "calendrier",
    title: "Quand lancer une bande avant une fête ?",
    summary: "Pour vendre au bon moment (Tabaski, Korité, Magal…), il faut lancer ou acheter assez tôt. Le Centre vous donne la dernière date possible.",
    formula: "Pour chaque fête et chaque produit :\n\nDate limite = date de la fête − nombre de jours du cycle\n\nDurées habituelles :\n• Bœufs (embouche) : 90 jours\n• Poulets de chair : 40 jours\n• Œufs / ponte : 30 jours\n\nAlerte rouge si la date limite est passée et que vous n'avez rien en production.\nAlerte orange s'il reste moins de 14 jours.",
    parameters: [
      { label: "Date de la fête", unit: "jour", default: "auto", where: "Calendrier fêtes du Centre" },
      { label: "Cycle bœuf", unit: "jours", default: "90", where: "Réglages Centre" },
      { label: "Cycle poulet chair", unit: "jours", default: "40", where: "Réglages Centre" },
    ],
    outputs: ["Message « lancer avant le… »", "Niveau d'urgence (critique / moyen)"],
  },
  {
    id: "date_pivot",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "calendrier",
    title: "Âge d'une bande et objectif du catalogue",
    summary: "On compte combien de jours se sont écoulés depuis l'arrivée des poussins ou pondeuses, puis on compare à ce que la race devrait produire à cet âge.",
    formula: "Date de départ = jour où la bande est entrée à la ferme.\n\nÂge en jours = aujourd'hui − date de départ.\n\nObjectif du catalogue = ce que votre type de poules devrait peser ou pondre à cet âge (fiche race).",
    parameters: [
      { label: "Date d'entrée de la bande", unit: "jour", default: "date saisie", where: "Fiche bande avicole → date de début" },
      { label: "Type de race", unit: "texte", default: "ex. Novogen", where: "Fiche bande → race / souche" },
      { label: "Âge actuel", unit: "jours", default: "calculé", where: "Automatique" },
    ],
    outputs: ["Âge en jours", "Objectif catalogue", "Type d'atelier (chair, ponte, bœuf)"],
  },
  {
    id: "lead_times",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "calendrier",
    title: "Combien de jours avant une vente ?",
    summary: "Délai moyen pour qu'un produit soit prêt : œufs ~150 j, poulet ~40 j, bœuf ~90 j.",
    formula: "Le système regarde l'historique de votre ferme.\nS'il manque d'infos, il utilise des durées standard :\n\n• Ponte : 150 jours\n• Poulet chair : 40 jours\n• Bœuf / mouton / chèvre : 90 jours\n• Maraîchage : 90 jours\n\nCela sert à dire : « commencez au plus tard le… » avant une grosse demande.",
    parameters: [
      { label: "Durée cycle ponte", unit: "jours", default: "150", where: "Historique bandes pondeuses" },
      { label: "Durée cycle chair", unit: "jours", default: "40", where: "Historique bandes chair" },
      { label: "Durée embouche", unit: "jours", default: "90", where: "Fiche animaux bovins" },
    ],
    outputs: ["Délai par activité"],
  },
  {
    id: "commercial_calendar",
    modules: ["centre_ia"],
    category: "calendrier",
    title: "Objectif de vente mois par mois",
    summary: "Chaque mois a un chiffre d'affaires cible issu du business plan. Le Centre indique où concentrer les efforts (œufs, chair, bœufs).",
    formula: "Pour chaque mois de l'année :\n• Objectif de ventes en FCFA\n• Activités prioritaires ce mois-là\n\nLe mois en cours et les 6 suivants sont mis en avant.",
    parameters: [
      { label: "Objectif mensuel", unit: "FCFA", default: "business plan", where: "Module Objectifs / plan officiel" },
    ],
    outputs: ["Mois en cours", "Six prochains mois"],
  },
  {
    id: "sell_now",
    modules: ["centre_ia"],
    category: "commerce",
    title: "Quand vendre tout de suite ? (bœuf ou poulet)",
    summary: "Si l'animal coûte plus cher à nourrir chaque jour qu'il ne prend en valeur, il vaut mieux le vendre maintenant.",
    formula: "Chaque jour on compare deux montants :\n\n1) Gain du jour = prise de poids du jour × prix de vente au kilo\n2) Coût du jour = aliment mangé ce jour × prix du sac d'aliment\n\nSi le coût dépasse le gain → alerte « VENDRE MAINTENANT ».\n\nExemple : gain 1 500 F/j, ration 1 800 F/j → vous perdez de l'argent à le garder.",
    parameters: [
      { label: "Prise de poids par jour", unit: "kg/j", default: "pesées + alimentation", where: "Module Animaux ou Avicole" },
      { label: "Prix viande au marché", unit: "FCFA/kg", default: "prix saisi", where: "Fiche animal ou marché" },
      { label: "Aliment consommé par jour", unit: "kg/j", default: "distribution", where: "Module Alimentation" },
      { label: "Prix aliment", unit: "FCFA/kg", default: "dernier achat", where: "Module Stock / Achats" },
    ],
    outputs: ["Alerte urgence vente", "Montant gain vs coût du jour"],
  },
  {
    id: "commercial_gap",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "commerce",
    title: "Écart entre objectif de vente et réalisé",
    summary: "Compare ce que vous deviez vendre ce mois et ce que vous avez vraiment encaissé, par activité (œufs, chair, bœufs…).",
    formula: "Par activité :\nReste à vendre = objectif du mois − ventes déjà faites\nTaux de réussite = ventes ÷ objectif × 100\n\nGlobal :\nTrésorerie encaissée, dépenses du mois, marge = ventes − dépenses.",
    parameters: [
      { label: "Objectif du mois", unit: "FCFA", default: "business plan", where: "Objectifs & Croissance" },
      { label: "Ventes enregistrées", unit: "FCFA", default: "—", where: "Module Ventes / Finances" },
    ],
    outputs: ["Reste à vendre", "Pourcentage d'objectif atteint"],
  },
  {
    id: "production_capacity",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "commerce",
    title: "Combien d'œufs produisez-vous par jour ?",
    summary: "Compte les pondeuses actives et la moyenne d'œufs des 14 derniers jours pour estimer tablettes/jour et taux de ponte.",
    formula: "Pondeuses vivantes = total des sujets en production.\n\nŒufs par jour = moyenne des 14 derniers jours de comptage.\n\nTaux de ponte (%) = œufs du jour ÷ pondeuses × 100.\n\nTablettes par jour ≈ œufs ÷ 30.",
    parameters: [
      { label: "Journal de ponte", unit: "œufs/j", default: "—", where: "Module Production → comptage œufs" },
      { label: "Effectif pondeuses", unit: "sujets", default: "—", where: "Module Avicole → bande pondeuse" },
    ],
    outputs: ["Œufs/jour", "Tablettes/jour", "Taux de ponte %"],
  },
  {
    id: "financial_gap",
    modules: ["objectifs_croissance"],
    category: "commerce",
    title: "Écart par atelier (pondeuses, chair, bœufs…)",
    summary: "Pour chaque activité : objectif du mois vs ventes réelles, et alerte si le prix pratiqué est trop bas.",
    formula: "Par atelier :\n• Ventes du mois vs objectif du mois\n• Marge visée vs marge estimée\n• Alerte si prix de vente trop bas par rapport au coût",
    parameters: [
      { label: "Objectif CA atelier", unit: "FCFA/mois", default: "business plan", where: "Objectifs & Croissance" },
      { label: "Marge brute visée", unit: "%", default: "35 %", where: "Paramètres pilotage" },
    ],
    outputs: ["Écart CA", "Écart marge", "Alertes prix"],
  },
  {
    id: "workshop_targets",
    modules: ["objectifs_croissance"],
    category: "commerce",
    title: "Objectifs mensuels par activité",
    summary: "Découpe l'objectif annuel en mois pour pondeuses, chair, bœufs et maraîchage.",
    formula: "Chaque mois :\nObjectif ventes = ligne du business plan pour l'activité\nObjectif marge = objectif ventes × marge visée (ex. 35 %)",
    parameters: [
      { label: "Marge visée", unit: "%", default: "35", where: "Paramètres pilotage" },
      { label: "Plan maraîchage", unit: "FCFA/mois", default: "réglages", where: "Paramètres pilotage" },
    ],
    outputs: ["Objectif mensuel par atelier", "Objectif marge annuel"],
  },
  {
    id: "break_even",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "commerce",
    title: "Point mort du mois (seuil de rentabilité)",
    summary: "Montant minimum à vendre ce mois pour couvrir salaires, charges fixes et variables.",
    formula: "Charges fixes du mois = (loyer, salaires annuels…) ÷ 12\nCharges variables = achats variables ÷ 12\n\nSeuil rentabilité = (fixes + variables) ÷ marge brute visée\n\nObjectif marge nette = seuil plus élevé si vous voulez garder X % de bénéfice.\n\nÉcart = seuil − ventes déjà faites ce mois.",
    parameters: [
      { label: "Marge brute visée", unit: "%", default: "35", where: "Paramètres pilotage" },
      { label: "Marge nette visée", unit: "%", default: "12", where: "Paramètres pilotage" },
      { label: "Charges du business plan", unit: "FCFA/an", default: "plan officiel", where: "Business plan ERP" },
    ],
    outputs: ["Seuil minimum du mois", "Objectif avec marge nette", "Rentable ou non"],
  },
  {
    id: "demand_coverage",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "demande",
    title: "Assez de stock pour la demande ?",
    summary: "Estime combien les clients vont demander (fêtes, saison) et vérifie si votre stock ou production peut couvrir.",
    formula: "Indice de demande = saison + effet fête (Tabaski, Korité…)\n\nObjectif ventes du mois = part annuelle × indice\n\nStock disponible valorisé ÷ objectif = taux de couverture %\n\nManque = objectif − ce que vous pouvez livrer\n\nDernière date pour lancer = date cible − délai de production",
    parameters: [
      { label: "Mix des activités", unit: "parts", default: "business plan", where: "Paramètres pilotage" },
      { label: "Prix moyen de vente", unit: "FCFA", default: "historique", where: "Module Ventes" },
      { label: "Stock / production dispo", unit: "unités", default: "—", where: "Stock + production en cours" },
    ],
    outputs: ["Taux couverture %", "Manque en FCFA", "Date limite pour produire"],
  },
  {
    id: "demand_forecast",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "demande",
    title: "Prévision de demande du mois",
    summary: "Anticipe les ventes du mois selon la saison et les fêtes à venir.",
    formula: "Facteur saison = mois fort ou faible historiquement\nBonus fête = +8 % à +18 % si grosse fête dans le mois\n\nObjectif du mois = part annuelle × facteurs\nQuantité estimée = objectif ÷ prix moyen",
    parameters: [
      { label: "Objectif annuel", unit: "FCFA", default: "business plan", where: "Paramètres pilotage" },
      { label: "Fêtes du mois", unit: "liste", default: "auto", where: "Calendrier Centre" },
    ],
    outputs: ["Indice demande", "Objectif FCFA", "Quantité estimée"],
  },
  {
    id: "supply_coverage",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "demande",
    title: "Ce que la ferme peut livrer",
    summary: "Additionne stock prêt à vendre + production à venir, moins les commandes déjà promises.",
    formula: "Disponible = stock + production prévue − engagements clients\nValeur dispo = quantité × prix moyen\nCouverture = valeur dispo ÷ objectif du mois × 100",
    parameters: [
      { label: "Stocks produits finis", unit: "unités", default: "—", where: "Module Stock" },
      { label: "Capacité production", unit: "œufs/j…", default: "—", where: "Production en cours" },
    ],
    outputs: ["Quantité disponible", "Taux de couverture %"],
  },
  {
    id: "zootechnical",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "zootechnie",
    title: "Performance réelle vs fiche race",
    summary: "Compare ponte, poids ou croissance réels à ce que la race devrait faire à le même âge.",
    formula: "Écart % = (réel − objectif catalogue) ÷ objectif × 100\n\nVert si écart petit (dans la marge de tolérance).\nOrange / rouge si trop en dessous → risque surcoût aliment ou retard.",
    parameters: [
      { label: "Type de race", unit: "texte", default: "—", where: "Fiche bande → race" },
      { label: "Marge de tolérance", unit: "%", default: "5 à 8", where: "Catalogue races" },
      { label: "Cible croissance", unit: "g/j ou kg/j", default: "selon race", where: "Catalogue races" },
    ],
    outputs: ["Valeur réelle", "Objectif catalogue", "Écart %", "Surcoût estimé"],
  },
  {
    id: "laying_rate",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "zootechnie",
    title: "Taux de ponte (% d'œufs par poule)",
    summary: "Sur 7 jours : combien d'œufs par poule par jour, comparé à la fiche race (ex. Lohmann ~92 % au pic).",
    formula: "Taux = total œufs 7 jours ÷ (poules × jours comptés) × 100\n\nCompare au catalogue selon l'âge en semaines.\n\nChute brutale sur 48 h → alerte (aliment, chaleur ou maladie).",
    parameters: [
      { label: "Comptage œufs", unit: "œufs/j", default: "—", where: "Module Production" },
      { label: "Fenêtre de calcul", unit: "jours", default: "7", where: "Automatique" },
    ],
    outputs: ["Taux réel %", "Taux attendu %", "Écart"],
  },
  {
    id: "gmq_real",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "zootechnie",
    title: "Prise de poids par jour",
    summary: "Combien l'animal ou le lot grossit chaque jour. Sert aussi à décider de vendre si la ration coûte trop cher.",
    formula: "Poulet : (poids actuel − poids à l'entrée) ÷ âge en jours (en grammes/j).\n\nBœuf : (poids actuel − poids à l'entrée) ÷ jours en ferme (en kg/j).\n\nSi coût aliment du jour > gain de valeur du jour → vendre.",
    parameters: [
      { label: "Poids actuel", unit: "kg ou g", default: "pesée", where: "Fiche lot / animal" },
      { label: "Poids à l'entrée", unit: "kg", default: "saisie entrée", where: "Fiche lot / animal" },
      { label: "Prix marché", unit: "FCFA/kg", default: "—", where: "Fiche animal ou marché" },
    ],
    outputs: ["Prise de poids/j", "Vendre maintenant ? oui/non"],
  },
  {
    id: "ic_chair",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "zootechnie",
    title: "Kilos d'aliment pour 1 kg de viande (poulet chair)",
    summary: "Plus ce chiffre est élevé, plus vous gaspillez d'aliment. Cible habituelle : 1,6 à 1,9 kg d'aliment par kg de poulet.",
    formula: "Indice = total aliment consommé ÷ poids vif total du lot\n\nExemple : 1 900 kg aliment pour 1 000 kg de poulets → indice 1,9\n\nAlerte si au-dessus de 1,9 (gaspillage) ou anormalement bas (pesée douteuse).",
    parameters: [
      { label: "Aliment distribué au lot", unit: "kg", default: "cumul", where: "Module Alimentation" },
      { label: "Poids vif du lot", unit: "kg", default: "pesée × effectif", where: "Fiche bande chair" },
    ],
    outputs: ["Indice de consommation", "Alerte gaspillage"],
  },
  {
    id: "ith_heat",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "zootechnie",
    title: "Chaleur ressentie (température + humidité)",
    summary: "En canicule, les animaux mangent moins et coûtent plus cher à nourrir. Le Centre peut conseiller de reporter un lancement ou réduire la densité.",
    formula: "Indice chaleur = température (°C) + humidité (%)\n\nCanicule si :\n• Indice ≥ 29\n• ou température ≥ 38 °C\n• ou 3 jours très chauds prévus\n\nActions proposées : reporter le lancement de 14 jours, réduire les sujets/m² de 15 %.",
    parameters: [
      { label: "Température", unit: "°C", default: "météo", where: "Météo ferme ou saisie" },
      { label: "Humidité", unit: "%", default: "météo", where: "Météo ferme" },
      { label: "Seuil alerte chaleur", unit: "—", default: "29", where: "Paramètres pilotage" },
    ],
    outputs: ["Indice chaleur", "Reporter lancement ?", "Réduction densité %"],
  },
  {
    id: "theoretical_standard",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "zootechnie",
    title: "Courbe de référence de la race",
    summary: "Chaque race a une courbe (ponte ou poids selon l'âge). Le système lit la fiche race pour savoir ce qui est normal à J+30, J+60…",
    formula: "À X jours après l'entrée, la fiche race indique :\n• taux de ponte attendu, ou\n• poids moyen attendu\n\nLe logiciel interpole entre les points de la courbe.",
    parameters: [
      { label: "Race / souche", unit: "texte", default: "—", where: "Fiche bande" },
      { label: "Âge de la bande", unit: "jours", default: "calculé", where: "Date entrée → aujourd'hui" },
    ],
    outputs: ["Valeur attendue à cet âge", "Type de mesure (ponte ou poids)"],
  },
  {
    id: "cost_animal",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "couts",
    title: "Coût total d'un bœuf (ou mouton) jusqu'à la vente",
    summary: "Additionne achat de la bête, aliment, soins vétérinaires et autres frais directs.",
    formula: "Coût total =\n  prix d'achat de la bête\n+ aliment réellement consommé (ou estimation)\n+ soins et vaccins\n+ chauffage, transport, main d'œuvre…\n\nMarge = prix de vente − coût total\nCoût au kilo = coût total ÷ poids à la vente",
    parameters: [
      { label: "Prix d'achat bête", unit: "FCFA", default: "saisie", where: "Fiche animal" },
      { label: "Aliment consommé", unit: "FCFA", default: "journal", where: "Module Alimentation" },
      { label: "Soins vétérinaires", unit: "FCFA", default: "—", where: "Module Santé" },
    ],
    outputs: ["Coût total", "Marge", "Coût au kilo", "Prise de poids/j"],
  },
  {
    id: "cost_avicole",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "couts",
    title: "Coût total d'une bande avicole",
    summary: "Poussins achetés + aliment + santé + divers, réparti par œuf ou par kg de poulet.",
    formula: "Coût total =\n  poussins (caisse × prix)\n+ aliment du lot\n+ santé et frais directs\n\nChair : coût/kg = coût total ÷ (poids moyen × sujets vendables)\nPonte : coût/œuf = coût total ÷ œufs produits",
    parameters: [
      { label: "Prix caisse poussins", unit: "FCFA", default: "32 000 / 50 sujets", where: "Fiche bande ou défaut" },
      { label: "Aliment du lot", unit: "FCFA", default: "cumul", where: "Alimentation" },
      { label: "Durée vie pondeuse", unit: "jours", default: "540", where: "Référentiel" },
    ],
    outputs: ["Coût total", "Coût/œuf ou /kg", "Marge sur aliment"],
  },
  {
    id: "cost_layer_tablet",
    modules: ["objectifs_croissance"],
    category: "couts",
    title: "Coût de vente d'une tablette d'œufs (30 œufs)",
    summary: "Coût des œufs + emballage + transport + casse.",
    formula: "Coût vente =\n  (coût par œuf × 30)\n+ emballage tablette\n+ transport\n+ pertes casse\n\nBénéfice = prix de vente tablettes − coût vente",
    parameters: [
      { label: "Œufs par tablette", unit: "œufs", default: "30", where: "Standard marché" },
      { label: "Transport vente", unit: "FCFA", default: "0", where: "Saisie vente" },
      { label: "Pertes casse", unit: "FCFA", default: "0", where: "Saisie vente" },
    ],
    outputs: ["Coût de revient tablette", "Marge"],
  },
  {
    id: "mca_rentabilite",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "couts",
    title: "Gain après coût de l'aliment seul",
    summary: "Montant qu'il vous reste si on ne compte que le coût de l'aliment (hors achat poussins ou bête).",
    formula: "Marge aliment =\n  ventes (ou estimation)\n− coût aliment seul\n\nEn % : (ventes − aliment) ÷ aliment × 100\n\nUtile pour voir si l'alimentation « mange » toute la marge.",
    parameters: [
      { label: "Ventes ou estimation", unit: "FCFA", default: "—", where: "Ventes / estimation lot" },
      { label: "Coût aliment", unit: "FCFA", default: "—", where: "Alimentation" },
    ],
    outputs: ["Marge FCFA", "Marge %", "Alerte négative"],
  },
  {
    id: "rentabilite_ranking",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "couts",
    title: "Classement des lots et fournisseurs",
    summary: "Quels lots perdent de l'argent ? Quels fournisseurs d'aliment ou poussins donnent les meilleures marges ?",
    formula: "Par lot ou bête : ventes, coût total, marge, coût unitaire.\n\nPar fournisseur : moyenne des marges sur plusieurs lots.",
    parameters: [
      { label: "Fournisseur aliment / poussins", unit: "nom", default: "—", where: "Fiche bande ou animal" },
    ],
    outputs: ["Classement lots", "Classement fournisseurs"],
  },
  {
    id: "bfr",
    modules: ["centre_ia"],
    category: "flux",
    title: "Assez d'argent pour acheter l'aliment du prochain cycle ? (BFR)",
    summary: "BFR = argent disponible (caisse + créances clients VIP) comparé au coût aliment d'un cycle complet. Si couverture < 50 %, le lancement est bloqué.",
    formula: "Coût estimé du cycle =\n  nombre de sujets × kg aliment/j/sujet × jours du cycle × prix aliment\n\nArgent disponible =\n  trésorerie (entrées − sorties)\n+ factures clients VIP à encaisser sous 7 jours\n\nCouverture % = argent disponible ÷ coût cycle × 100\n\nSi couverture < 50 % (réglage) → ne pas lancer la bande.",
    parameters: [
      { label: "Effectif prochaine bande", unit: "sujets", default: "5000", where: "Paramètres pilotage" },
      { label: "Ration par sujet/j", unit: "kg", default: "0,095 chair · 4,5 bœuf", where: "Réglages Centre" },
      { label: "Couverture minimum", unit: "%", default: "50", where: "Paramètres pilotage" },
      { label: "Clients VIP", unit: "liste", default: "—", where: "Paramètres pilotage + fiche client" },
    ],
    outputs: ["Couverture %", "Lancement bloqué oui/non", "Jours d'autonomie aliment"],
  },
  {
    id: "stock_audit",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "flux",
    title: "Surconsommation d'aliment suspecte (coulage ?)",
    summary: "Compare aliment réellement sorti du silo à ce que les poules/bœufs devraient manger selon la fiche race.",
    formula: "Par bâtiment et par jour :\n\nThéorique = effectif × ration standard du jour\nRéel = sorties aliment enregistrées\n\nÉcart % = (réel − théorique) ÷ théorique × 100\n\nAlerte si écart > 10 % pendant 3 jours d'affilée\n→ vérifier coulage, vol, erreur de pesée.",
    parameters: [
      { label: "Seuil écart max", unit: "%", default: "10", where: "Réglage moteur" },
      { label: "Jours consécutifs", unit: "jours", default: "3", where: "Réglage moteur" },
      { label: "Ration standard race", unit: "kg/j/sujet", default: "fiche race", where: "Catalogue races" },
    ],
    outputs: ["Écart %", "Kg théorique vs réel", "Bâtiment concerné"],
  },
  {
    id: "flux_silo",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "flux",
    title: "Combien de jours reste l'aliment en silo ?",
    summary: "Stock en kg ÷ consommation moyenne par jour = jours restants. Alerte si moins de 5 jours.",
    formula: "Consommation/j = moyenne des 30 derniers jours de distribution\n(ou estimation : effectif × ration)\n\nJours restants = stock aliment (kg) ÷ consommation/j\n\nAlerte rouge si < 5 jours.",
    parameters: [
      { label: "Stock aliment", unit: "kg", default: "—", where: "Module Stock" },
      { label: "Seuil alerte", unit: "jours", default: "5", where: "Réglage Centre" },
    ],
    outputs: ["Jours restants", "Consommation/j"],
  },
  {
    id: "flux_occupation",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "flux",
    title: "Remplissage des bâtiments et pertes",
    summary: "Combien de sujets par bâtiment ? Mortalité et valeur des pertes.",
    formula: "Taux remplissage ≈ effectif ÷ capacité référence (500 sujets)\n\nBalance : entrées, sorties (ventes), mortalité\nValeur perte = morts × coût unitaire moyen",
    parameters: [
      { label: "Bâtiment", unit: "nom", default: "—", where: "Fiche bande" },
      { label: "Capacité référence", unit: "sujets", default: "500", where: "Réglage affichage" },
    ],
    outputs: ["Effectif par bâtiment", "Mortalité %", "Valeur des pertes"],
  },
  {
    id: "sanitary",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "flux",
    title: "Pause obligatoire entre deux bandes (vide sanitaire)",
    summary: "Minimum 10 jours sans animaux entre deux lots dans le même bâtiment pour nettoyer et désinfecter.",
    formula: "Jours entre fin bande précédente et début suivante\n\nSi < 10 jours → blocage lancement\nMessage : attendre, nettoyer, laisser sécher.",
    parameters: [
      { label: "Durée minimum", unit: "jours", default: "10", where: "Paramètres pilotage" },
    ],
    outputs: ["Jours de pause", "Lancement bloqué oui/non"],
  },
  {
    id: "sanitary_extended",
    modules: ["centre_ia"],
    category: "flux",
    title: "Pause prolongée après forte mortalité",
    summary: "Si la bande précédente a perdu plus de 5 % des sujets (maladie), ajouter 7 jours de pause et désinfection renforcée.",
    formula: "Taux mortalité bande précédente = morts ÷ effectif initial × 100\n\nSi > 5 % :\n  pause totale = 10 j + 7 j supplémentaires\n  validation vétérinaire recommandée avant nouveaux poussins",
    parameters: [
      { label: "Seuil mortalité", unit: "%", default: "5", where: "Paramètres pilotage" },
      { label: "Jours supplémentaires", unit: "jours", default: "7", where: "Paramètres pilotage" },
    ],
    outputs: ["Taux mortalité %", "Date reprise possible"],
  },
  {
    id: "shrinkage",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "flux",
    title: "Écart entre production et ventes (œufs ou aliment)",
    summary: "Œufs produits vs œufs vendus : écart > 2 % → casse, vol ou oubli de saisie. Même logique sur l'aliment global.",
    formula: "Œufs : écart % = (produits − vendus) ÷ produits × 100\n\nAliment : écart % = (consommé − standard) ÷ standard × 100\n\nAlerte si seuils dépassés.",
    parameters: [
      { label: "Comptage ponte", unit: "œufs", default: "—", where: "Production" },
      { label: "Ventes enregistrées", unit: "—", default: "—", where: "Module Ventes" },
    ],
    outputs: ["Écart %", "Perte estimée en FCFA"],
  },
  {
    id: "pricing_floor",
    modules: ["objectifs_croissance"],
    category: "prix",
    title: "Prix minimum de vente (ne pas vendre en dessous)",
    summary: "Coût de revient + marge minimum (ex. 15 %) = prix plancher.",
    formula: "Prix plancher = coût unitaire × (1 + marge min %)\n\nCoûts par défaut si pas de calcul :\nœuf 550 F · poulet 1 900 F/kg · bœuf 300 000 F · légume 400 F/kg",
    parameters: [
      { label: "Coût unitaire", unit: "FCFA", default: "calcul ERP", where: "Coûts lot / animal" },
      { label: "Marge minimum", unit: "%", default: "15", where: "Paramètres pilotage" },
    ],
    outputs: ["Prix plancher"],
  },
  {
    id: "pricing_seasonality",
    modules: ["objectifs_croissance"],
    category: "prix",
    title: "Saison forte ou faible",
    summary: "Certaines périodes se vendent mieux (fêtes). Le prix conseillé tient compte du mois.",
    formula: "Si historique ventes suffisant :\n  coef = ventes ce mois ÷ moyenne mensuelle (entre 0,85 et 1,25)\n\nSinon :\n  forte demande +15 % · normale 100 % · faible −15 %",
    parameters: [
      { label: "Historique ventes", unit: "—", default: "—", where: "Module Ventes" },
      { label: "Mois concerné", unit: "—", default: "aujourd'hui", where: "Automatique" },
    ],
    outputs: ["Coefficient saison"],
  },
  {
    id: "pricing_recommended",
    modules: ["objectifs_croissance"],
    category: "prix",
    title: "Prix de vente conseillé",
    summary: "Le plus élevé entre : prix plancher (coût + marge) et prix marché local ajusté à la saison.",
    formula: "Prix marché local = moyenne prix marché à votre zone\nPrix ajusté = marché × coefficient saison\n\nPrix conseillé = MAX(prix plancher ; prix ajusté)\n\nAlerte si votre coût est plus haut que le marché → risque de vendre à perte.",
    parameters: [
      { label: "Prix marché local", unit: "FCFA", default: "catalogue ou saisie", where: "Prix marché / catalogue" },
      { label: "Localité", unit: "ville", default: "—", where: "Fiche ferme" },
    ],
    outputs: ["Prix conseillé", "Alerte vente à perte"],
  },
  {
    id: "pricing_matrix",
    modules: ["objectifs_croissance"],
    category: "prix",
    title: "Tableau prix par activité",
    summary: "Pour œufs, chair et bœufs : prix conseillé vs prix que vous pratiquez en moyenne.",
    formula: "Une ligne par activité :\n• coût unitaire\n• prix plancher\n• prix marché ajusté\n• prix conseillé\n• prix moyen de vos ventes récentes",
    parameters: [
      { label: "Coûts par activité", unit: "FCFA", default: "ERP", where: "Calculs coûts" },
      { label: "Activités", unit: "liste", default: "œufs, chair, bœufs", where: "Automatique" },
    ],
    outputs: ["Tableau prix", "Alertes mauvais prix"],
  },
  {
    id: "scissors_effect",
    modules: ["centre_ia"],
    category: "analytique",
    title: "Prix du maïs / soja qui monte (effet ciseau)",
    summary: "Si les intrants alimentaires augmentent fortement, le Centre propose d'acheter 3 mois de stock maintenant pour économiser.",
    formula: "Pour maïs, soja, tourteau :\n  hausse mensuelle estimée → projection sur 3 mois\n\nSi hausse ≥ 5 %/mois :\n  économie possible = stock actuel × prix × hausse estimée × 50 %\n\nRecommandation si trésorerie suffisante.",
    parameters: [
      { label: "Cours intrants", unit: "FCFA", default: "—", where: "Prix marché enregistrés" },
      { label: "Stock aliment actuel", unit: "kg", default: "—", where: "Module Stock" },
    ],
    outputs: ["Hausse estimée %", "Économie possible FCFA"],
  },
  {
    id: "transformation_arbitrage",
    modules: ["centre_ia"],
    category: "analytique",
    title: "Mieux vendre les œufs ou les incuber en poussins ?",
    summary: "Compare marge tablette d'œufs vs poussin d'un jour (électricité couvoir incluse).",
    formula: "Marge œuf = prix tablette\n\nMarge poussin = prix poussin × taux éclosion − coût électricité/œuf\n\nSi poussin plus rentable de ≥ 5 % → conseiller % de ponte à incuber\nSinon → vendre les œufs directement",
    parameters: [
      { label: "Prix tablette", unit: "FCFA", default: "900", where: "Marché ou réglage" },
      { label: "Prix poussin", unit: "FCFA", default: "350", where: "Marché ou réglage" },
      { label: "Taux éclosion", unit: "%", default: "82", where: "Réglage couvoir" },
      { label: "Coût incubation/œuf", unit: "FCFA", default: "15", where: "Réglage" },
    ],
    outputs: ["Marge œuf vs poussin", "% à incuber conseillé"],
  },
  {
    id: "vet_comparison",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "analytique",
    title: "Comparer les vétérinaires (même intervention)",
    summary: "Pour la même maladie ou vaccin : qui coûte moins cher ? Qui guérit plus vite ?",
    formula: "Par type d'intervention :\n  coût moyen par vétérinaire\n  jours avant animal « sain »\n\nInsight si écart coût ≥ 5 % ou guérison ≥ 2 jours",
    parameters: [
      { label: "Interventions réalisées", unit: "—", default: "—", where: "Module Santé" },
      { label: "Liste vétérinaires", unit: "—", default: "—", where: "Référentiel véto" },
    ],
    outputs: ["Classement coût", "Classement délai guérison"],
  },
  {
    id: "feed_inflation",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "analytique",
    title: "Aliment plus cher qu'avant ?",
    summary: "Compare prix d'achat aliment des 30 derniers jours vs les 30 jours d'avant. Alerte si +10 %.",
    formula: "Prix moyen/kg période récente vs période précédente\n\nHausse % = (récent − ancien) ÷ ancien × 100\n\nAlerte si ≥ 10 % (critique si ≥ 15 %)",
    parameters: [
      { label: "Achats aliment", unit: "—", default: "—", where: "Alimentation / Achats" },
    ],
    outputs: ["Hausse %", "Prix/kg avant et après"],
  },
  {
    id: "feed_supplier_ranking",
    modules: ["centre_ia"],
    category: "analytique",
    title: "Quel fournisseur d'aliment est le moins cher ?",
    summary: "Même produit, plusieurs fournisseurs : écart de prix et alerte si spread ≥ 5 %.",
    formula: "Prix moyen/kg par fournisseur et par type d'aliment\nÉcart % entre le moins cher et le plus cher",
    parameters: [
      { label: "Fournisseurs", unit: "liste", default: "—", where: "Module Achats" },
      { label: "Historique achats", unit: "—", default: "—", where: "Alimentation" },
    ],
    outputs: ["Classement fournisseurs", "Alertes écart prix"],
  },
  {
    id: "seasonality_weather",
    modules: ["objectifs_croissance"],
    category: "analytique",
    title: "Chaleur d'avril-mai et baisse de ponte",
    summary: "Historique : en saison chaude, la ponte baisse souvent. Alerte si chaleur actuelle ≥ 35 °C.",
    formula: "Par mois : taux ponte moyen\nCompare mois chauds (avr–mai) vs autres mois\n\nAlerte si baisse saisonnière ≥ 5 points ou canicule actuelle",
    parameters: [
      { label: "Météo", unit: "°C", default: "—", where: "Météo ferme" },
      { label: "Historique ponte", unit: "—", default: "—", where: "Production" },
    ],
    outputs: ["Baisse saison %", "Conseils brumisation"],
  },
  {
    id: "client_quality",
    modules: ["objectifs_croissance"],
    category: "analytique",
    title: "Client exigeant qui paie peu",
    summary: "Client demandant tri strict ou gros calibre pour un petit supplément → rentabilité faible.",
    formula: "Prix unitaire = montant commande ÷ quantité\n\nSi exigence « tri strict » et prix unitaire bas → alerte rentabilité",
    parameters: [
      { label: "Commandes clients", unit: "—", default: "—", where: "Module Ventes" },
      { label: "Fiches clients", unit: "—", default: "—", where: "Module Clients" },
    ],
    outputs: ["Classement clients", "Alertes mauvaise marge"],
  },
  {
    id: "maraichage_biomass",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "analytique",
    title: "Fumier et litière = engrais gratuit",
    summary: "Estime kg de fumier/litière par an et équivalent sacs NPK économisés pour le maraîchage.",
    formula: "Litière pondeuses ≈ 0,08 kg/j/poule × 365\nFumier bovins ≈ 15 kg/j/bête × 365\n\nSacs NPK économisés = total kg ÷ 50\nÉconomie = sacs × prix sac (15 000 F par défaut)",
    parameters: [
      { label: "Prix sac NPK", unit: "FCFA", default: "15 000", where: "Paramètres pilotage" },
      { label: "Poids sac", unit: "kg", default: "50", where: "Standard" },
    ],
    outputs: ["Économie engrais FCFA", "Simulation cultures"],
  },
  {
    id: "maraichage_sandbox",
    modules: ["objectifs_croissance"],
    category: "analytique",
    title: "Simulateur parcelle maraîchage",
    summary: "Entrez charges, rendement et prix marché → marge estimée et quantité minimum à vendre pour être rentable.",
    formula: "Coût total = charges fixes + charges extra + rendement × coût/kg\n\nRecette = rendement × prix marché\nMarge = recette − coût\n\nSeuil rentabilité kg = coût total ÷ (prix − coût/kg)",
    parameters: [
      { label: "Charges fixes", unit: "FCFA", default: "0", where: "Saisie simulateur" },
      { label: "Rendement", unit: "kg", default: "—", where: "Saisie simulateur" },
      { label: "Coût production/kg", unit: "FCFA", default: "400", where: "Saisie simulateur" },
    ],
    outputs: ["Marge scénario A/B", "Kg minimum rentable"],
  },
  {
    id: "charts_g1_g7",
    modules: ["objectifs_croissance"],
    category: "graphiques",
    title: "Graphiques Objectifs (G1 à G7)",
    summary: "Courbes du module Objectifs : ponte, lots, seuil rentabilité, âge bandes, trésorerie, jauge objectif annuel, prix vs coût.",
    formula: "G1 : ponte réelle vs catalogue race\nG2 : comparer les lots\nG3 : ventes du mois vs seuil rentabilité\nG4 : âge des bandes (J+ = jours depuis le début)\nG5 : flux trésorerie\nG6 : % objectif annuel atteint\nG7 : coût revient vs marché vs prix pratiqué",
    parameters: [
      { label: "Données graphiques", unit: "—", default: "—", where: "Module Objectifs → onglet Graphiques" },
    ],
    outputs: ["Courbes G1–G7"],
  },
  {
    id: "charts_centre",
    modules: ["centre_ia"],
    category: "graphiques",
    title: "Graphiques du Centre décisionnel",
    summary: "Ponte vs aliment, indice consommation chair, croissance bovins, niveau silo, maraîchage.",
    formula: "• Ponte (% ) et kg aliment/j\n• Indice consommation par lot chair\n• Prise de poids bovins\n• Jours restants silo\n• Simulateur maraîchage",
    parameters: [
      { label: "Journal ponte", unit: "—", default: "—", where: "Production" },
      { label: "Seuil silo critique", unit: "jours", default: "5", where: "Réglage Centre" },
    ],
    outputs: ["Graphiques Centre"],
  },
  {
    id: "technical_farming",
    modules: ["centre_ia"],
    category: "pilotage",
    title: "Alertes du quotidien (technique)",
    summary: "Rappels concrets : stock bas, santé, capteurs, anomalies de saisie — issus des règles métier de la ferme.",
    formula: "Le système scanne lots, animaux, stocks, santé, capteurs.\n\nGravité :\n• critique → à traiter tout de suite\n• warning → à planifier",
    parameters: [
      { label: "Capteurs (température…)", unit: "—", default: "—", where: "IoT si installé" },
      { label: "Événements saisis", unit: "—", default: "—", where: "Journal ERP" },
    ],
    outputs: ["Liste alertes", "Actions proposées"],
  },
];

export const ENTITY_GLOSSARY = ACRONYM_GLOSSARY;

export const PILOTAGE_PARAM_ROWS = [
  { key: 'sanitary_min_days', label: 'Pause minimum entre bandes', unit: 'jours' },
  { key: 'mortality_threshold_pct', label: 'Mortalité max bande précédente', unit: '%' },
  { key: 'extra_vacuum_days', label: 'Jours en plus si maladie', unit: 'jours' },
  { key: 'next_band_size', label: 'Taille prochaine bande', unit: 'sujets' },
  { key: 'bfr_min_coverage_pct', label: 'Couverture trésorerie minimum', unit: '%' },
  { key: 'ith_stress_threshold', label: 'Seuil chaleur (ITH)', unit: '—' },
];

const FESTIVAL_PARAM_ROWS = Object.entries(HIJRI_FESTIVAL_RULES).map(([key, rule]) => ({
  key,
  label: rule.label,
  rule: `${rule.day} / mois hijri ${rule.month}`,
}));

export function buildAnnexeSnapshot(dataMap = {}) {
  const settings = normalizePilotageSettings(dataMap.growth_settings || DEFAULT_PILOTAGE_SETTINGS);
  return {
    pilotage: PILOTAGE_PARAM_ROWS.map((row) => ({
      ...row,
      value: settings[row.key],
      default: DEFAULT_PILOTAGE_SETTINGS[row.key],
    })),
    festivals: FESTIVAL_PARAM_ROWS,
    growthSettings: {
      annual_ca_target: settings.annual_ca_target || dataMap.growth_settings?.annual_ca_target || 'Business plan',
      target_gross_margin_pct: dataMap.growth_settings?.target_gross_margin_pct ?? 35,
      target_net_margin_pct: dataMap.growth_settings?.target_net_margin_pct ?? 12,
      vip_count: arr(settings.vip_client_ids).length,
    },
  };
}

export function formulasForModule(moduleId = 'centre_ia') {
  const preset = annexePresetForModule(moduleId);
  if (preset) {
    const ids = new Set(preset.blockIds || []);
    return FORMULA_BLOCKS.filter((block) => preset.categories.includes(block.category) || ids.has(block.id));
  }
  return FORMULA_BLOCKS.filter((block) => block.modules.includes(moduleId));
}

export function formulasGroupedByCategory(moduleId = 'centre_ia') {
  const formulas = formulasForModule(moduleId);
  const groups = new Map();
  formulas.forEach((block) => {
    const cat = block.category || 'autre';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(block);
  });
  return FORMULA_CATEGORIES
    .filter((cat) => groups.has(cat.id))
    .map((cat) => ({ ...cat, blocks: groups.get(cat.id) }));
}

export default FORMULA_BLOCKS;
