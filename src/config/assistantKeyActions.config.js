/**
 * Raccourcis « Actions clés » de l'Assistant.
 *
 * Pour chaque module, on ne retient que les DEUX actions les plus
 * déterminantes — celles qui pèsent le plus sur la réalité terrain et sur les
 * chiffres. L'Assistant devient ainsi un centre de commande : la conversation
 * d'un côté, les gestes qui comptent de l'autre.
 *
 * Deux types d'action :
 *  - `quickId` : ouvre directement le formulaire de saisie rapide (contrat 20s).
 *  - `navigate.tab` : emmène sur le bon onglet du module propriétaire.
 */
export const ASSISTANT_KEY_ACTIONS = Object.freeze([
  {
    module: 'elevage',
    label: 'Élevage',
    actions: [
      { id: 'mortalite', label: 'Déclarer une mortalité', hint: 'Effectif du lot et perte estimée', quickId: 'mortalite' },
      { id: 'pesee', label: 'Enregistrer une pesée', hint: 'Courbe de poids et gain moyen', quickId: 'pesee' },
    ],
  },
  {
    module: 'cultures',
    label: 'Cultures',
    actions: [
      { id: 'recolte', label: 'Enregistrer une récolte', hint: 'Entrée de stock et coût au kg', quickId: 'recolte' },
      { id: 'irrigation', label: "Noter l'irrigation", hint: "Consommation d'eau par parcelle", quickId: 'irrigation' },
    ],
  },
  {
    module: 'commercial',
    label: 'Commercial',
    actions: [
      { id: 'vente', label: 'Enregistrer une vente', hint: "Chiffre d'affaires du jour", quickId: 'vente' },
      { id: 'creances', label: 'Relancer une créance', hint: 'Clients qui vous doivent encore', navigate: { tab: 'Créances & relances' } },
    ],
  },
  {
    module: 'achats_stock',
    label: 'Achats & stock',
    actions: [
      { id: 'reception', label: 'Enregistrer une réception', hint: 'Entrée de stock et coût moyen', navigate: { tab: 'Achats & réceptions' } },
      { id: 'seuil', label: 'Produits sous seuil', hint: 'Ruptures à éviter', navigate: { tab: 'Stocks & lots' } },
    ],
  },
  {
    module: 'finance_pilotage',
    label: 'Finance',
    actions: [
      { id: 'ecriture', label: 'Nouvelle écriture', hint: 'Recette ou dépense avec preuve', navigate: { tab: 'Trésorerie' } },
      { id: 'rapprochement', label: 'Rapprocher la trésorerie', hint: 'Wave, OM, espèces, banque', navigate: { tab: 'Réconciliation' } },
    ],
  },
  {
    module: 'activite_suivi',
    label: 'Activité & suivi',
    actions: [
      { id: 'tache', label: 'Créer une tâche', hint: 'À faire avec échéance', navigate: { tab: 'À faire' } },
      { id: 'alertes', label: 'Voir les alertes', hint: 'Signaux à traiter', navigate: { tab: 'Alertes liées' } },
    ],
  },
]);
