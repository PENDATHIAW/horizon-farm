export const formSimulationScenarios = [
  {
    module: 'Ventes',
    priority: 'critique',
    objective: 'Simuler opportunité, commande, paiement, facture, livraison et vérifier les ricochets Finance, Stock, Documents, Objectifs et Traçabilité.',
    scenarios: [
      {
        id: 'VENTES-001',
        title: 'Commande complète depuis opportunité',
        type: 'parcours_normal',
        steps: [
          'Créer ou ouvrir une opportunité vendable',
          'Transformer l’opportunité en commande',
          'Choisir client, produit/source, quantité, prix unitaire, mode livraison',
          'Valider la commande',
          'Vérifier fermeture de l’opportunité',
          'Vérifier création ou mise à jour du stock, finance, objectif et trace',
        ],
        requiredFields: ['client', 'source_module', 'source_id', 'quantity', 'prix_unitaire', 'mode_livraison'],
        invalidInputs: ['quantité zéro', 'prix négatif', 'source vide', 'client vide', 'vente supérieure au stock'],
        expectedImprovements: ['Afficher le reste à payer en direct', 'Désactiver validation si stock insuffisant', 'Proposer facture et paiement après commande'],
      },
      {
        id: 'VENTES-002',
        title: 'Paiement partiel puis solde',
        type: 'cas_limite',
        steps: ['Créer paiement partiel', 'Contrôler reste à payer', 'Créer paiement final', 'Vérifier finance et statut payé'],
        requiredFields: ['order_id', 'montant', 'moyen_paiement', 'date_paiement'],
        invalidInputs: ['montant supérieur au reste', 'montant zéro', 'commande déjà soldée'],
        expectedImprovements: ['Préremplir le reste à payer', 'Afficher historique paiements dans la commande'],
      },
    ],
  },
  {
    module: 'Santé',
    priority: 'critique',
    objective: 'Tester que le formulaire change réellement selon vaccination, soin, déparasitage, visite vétérinaire, ordonnance et urgence, avec preuve santé par URL photo.',
    scenarios: [
      {
        id: 'SANTE-001',
        title: 'Vaccination avec rappel et URL photo preuve',
        type: 'parcours_normal',
        steps: ['Choisir type Vaccination', 'Vérifier apparition vaccin, dose, lot, rappel', 'Renseigner URL photo preuve', 'Saisir coût', 'Valider', 'Vérifier Finance, Documents, Traçabilité et prochaine tâche rappel'],
        requiredFields: ['type_intervention', 'vaccin', 'dose', 'date', 'date_rappel', 'cible', 'cout', 'preuve_photo_url'],
        invalidInputs: ['rappel avant date intervention', 'dose vide', 'URL photo preuve absente', 'URL photo preuve invalide', 'coût négatif'],
        expectedImprovements: ['Afficher calendrier de rappel', 'Créer automatiquement tâche rappel', 'Afficher aperçu ou lien ouvrable de la photo URL'],
      },
      {
        id: 'SANTE-002',
        title: 'Soin curatif avec impact ferme structuré et URL photo',
        type: 'parcours_normal',
        steps: ['Choisir type Soin curatif', 'Vérifier symptômes/diagnostic/traitement/durée', 'Renseigner urgence', 'Renseigner impact ferme structuré', 'Ajouter URL photo preuve si nécessaire', 'Valider', 'Contrôler coût et alerte si urgence haute'],
        requiredFields: ['symptomes', 'diagnostic', 'traitement', 'duree_traitement', 'niveau_risque', 'impact_type', 'impact_niveau', 'impact_montant', 'preuve_photo_url'],
        invalidInputs: ['urgence libre non normalisée', 'impact seulement en texte libre', 'traitement vide', 'URL photo preuve invalide'],
        expectedImprovements: ['Remplacer champs libres par listes métier', 'Afficher action recommandée selon urgence', 'Prévisualiser la photo depuis son URL'],
      },
    ],
  },
  {
    module: 'Animaux',
    priority: 'critique',
    objective: 'Tester fiche animal, pesée tous les 15 jours, rappel J-1, coûts, marge, vente et verrouillage après vente.',
    scenarios: [
      {
        id: 'ANIMAUX-001',
        title: 'Création animal avec coûts complets et calendrier pesée',
        type: 'parcours_normal',
        steps: ['Créer animal', 'Renseigner espèce, sexe, date entrée, prix achat, poids initial, poids cible', 'Ajouter coût alimentation et santé', 'Vérifier marge prévisionnelle', 'Vérifier prochaine pesée à J+15', 'Vérifier rappel de pesée à J-1'],
        requiredFields: ['espece', 'date_entree', 'prix_achat', 'poids_initial', 'poids_cible', 'cout_alimentation', 'cout_sante', 'date_derniere_pesee', 'prochaine_pesee', 'rappel_pesee'],
        invalidInputs: ['date future incohérente', 'poids négatif', 'prix achat vide', 'poids cible inférieur au poids actuel sans explication', 'absence de prochaine pesée', 'absence de rappel J-1'],
        expectedImprovements: ['Calculer automatiquement prochaine pesée à J+15', 'Créer automatiquement rappel J-1', 'Afficher prochaines actions terrain'],
      },
      {
        id: 'ANIMAUX-002',
        title: 'Animal vendu verrouillé',
        type: 'régression_métier',
        steps: ['Vendre un animal', 'Retourner sur fiche', 'Tenter modification prix/poids/statut', 'Vérifier verrouillage et historique consultable', 'Vérifier absence de nouveau rappel pesée après vente'],
        requiredFields: ['sale_order_id', 'statut_vendu', 'date_vente'],
        invalidInputs: ['modification après vente', 'suppression après vente', 'rappel pesée actif après vente'],
        expectedImprovements: ['Afficher badge vendu', 'Laisser uniquement notes historiques non financières', 'Suspendre rappels de pesée après vente'],
      },
    ],
  },
  {
    module: 'Avicole',
    priority: 'critique',
    objective: 'Tester lots chair et pondeuses séparément, ventes partielles, mortalité, production, coûts et graphiques adaptés.',
    scenarios: [
      {
        id: 'AVICOLE-001',
        title: 'Lot pondeuses avec production œufs',
        type: 'parcours_normal',
        steps: ['Créer lot pondeuses', 'Renseigner effectif, date démarrage, coût aliment, coût santé', 'Ajouter production œufs', 'Vérifier graphiques ponte/œufs et rentabilité pondeuses'],
        requiredFields: ['type_lot', 'effectif_initial', 'date_demarrage', 'cout_aliment', 'production_oeufs'],
        invalidInputs: ['production négative', 'mortalité supérieure effectif', 'graphique chair dans onglet pondeuses'],
        expectedImprovements: ['Séparer clairement onglets Chair et Pondeuses', 'Afficher coût par œuf ou plateau'],
      },
      {
        id: 'AVICOLE-002',
        title: 'Vente partielle lot chair',
        type: 'cas_limite',
        steps: ['Créer lot chair', 'Faire vente partielle', 'Vérifier effectif restant, stock/sortie, finance, marge et trace'],
        requiredFields: ['quantity_sold', 'prix_unitaire', 'client', 'date_vente'],
        invalidInputs: ['vente supérieure effectif actuel', 'effectif restant négatif'],
        expectedImprovements: ['Afficher avant/après effectif', 'Créer trace vente partielle lisible'],
      },
    ],
  },
  {
    module: 'Cultures',
    priority: 'critique',
    objective: 'Tester parcelle, coûts culturaux, récolte, pertes, stock issu récolte et opportunité de vente.',
    scenarios: [
      {
        id: 'CULTURES-001',
        title: 'Culture récoltée vers stock et vente',
        type: 'parcours_normal',
        steps: ['Créer culture avec parcelle/surface', 'Renseigner coûts semences, engrais, eau, main-d’œuvre, traitements', 'Déclarer récolte', 'Vérifier entrée stock', 'Créer opportunité vente'],
        requiredFields: ['parcelle', 'surface', 'date_semis', 'cout_semences', 'cout_engrais', 'quantite_recoltee', 'unite'],
        invalidInputs: ['surface zéro', 'récolte négative', 'pertes supérieures récolte', 'stock non alimenté'],
        expectedImprovements: ['Calculer coût par kg', 'Proposer vente si stock disponible'],
      },
    ],
  },
  {
    module: 'Stock',
    priority: 'haute',
    objective: 'Tester entrées, sorties, consommation, seuil critique, valeur de stock et impact ventes/alertes.',
    scenarios: [
      {
        id: 'STOCK-001',
        title: 'Sortie stock avec seuil critique',
        type: 'cas_limite',
        steps: ['Créer stock avec seuil', 'Faire sortie', 'Passer sous seuil', 'Vérifier alerte et trace', 'Tenter sortie supérieure au disponible'],
        requiredFields: ['produit', 'quantite', 'unite', 'seuil', 'valeur_stock'],
        invalidInputs: ['sortie supérieure au stock', 'quantité négative', 'unité absente'],
        expectedImprovements: ['Afficher stock avant/après', 'Bloquer sortie impossible', 'Créer tâche achat si seuil critique'],
      },
    ],
  },
  {
    module: 'Finances',
    priority: 'critique',
    objective: 'Tester que chaque recette/charge a une source, une catégorie métier, un justificatif et remonte en comptabilité/marge.',
    scenarios: [
      {
        id: 'FINANCES-001',
        title: 'Charge métier liée à une source',
        type: 'parcours_normal',
        steps: ['Créer charge alimentation ou santé', 'Lier à animal/lot/culture', 'Vérifier marge activité et comptabilité', 'Vérifier justificatif document'],
        requiredFields: ['type', 'categorie', 'montant', 'date', 'module_lie', 'related_id'],
        invalidInputs: ['charge sans source', 'montant négatif', 'catégorie libre incohérente'],
        expectedImprovements: ['Proposer catégories métier prédéfinies', 'Afficher impact marge immédiatement'],
      },
    ],
  },
  {
    module: 'Documents',
    priority: 'haute',
    objective: 'Tester facture, ordonnance, URL photo preuve santé, rapport audit et recherche par module lié.',
    scenarios: [
      {
        id: 'DOCUMENTS-001',
        title: 'Document lié et retrouvable',
        type: 'parcours_normal',
        steps: ['Créer ou lier un document', 'Choisir type et module lié', 'Lier à facture/intervention/rapport', 'Renseigner URL si document externe ou photo preuve', 'Rechercher le document', 'Ouvrir aperçu/export'],
        requiredFields: ['title', 'document_category', 'module_lie', 'related_id', 'url'],
        invalidInputs: ['document sans type', 'document sans module lié', 'preuve introuvable après URL', 'URL invalide'],
        expectedImprovements: ['Ajouter filtres par module et type', 'Afficher aperçu ou lien ouvrable avant validation'],
      },
    ],
  },
];

export const formSimulationModules = formSimulationScenarios.map((item) => item.module);
export const getFormSimulationScenarios = (moduleName) => formSimulationScenarios.find((item) => item.module === moduleName);

export function flattenFormSimulationScenarios() {
  return formSimulationScenarios.flatMap((module) => module.scenarios.map((scenario) => ({
    module: module.module,
    priority: module.priority,
    objective: module.objective,
    ...scenario,
  })));
}
