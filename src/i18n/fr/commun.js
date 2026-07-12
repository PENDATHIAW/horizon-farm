/**
 * Libellés communs à toute l'application.
 * Toute chaîne visible partagée (boutons, états vides, confirmations) vit ici.
 * Les boutons suivent la règle verbe + objet ; jamais « Soumettre ».
 */
export default {
  actions: {
    enregistrer: 'Enregistrer',
    annuler: 'Annuler',
    fermer: 'Fermer',
    actualiser: 'Actualiser',
    rechercher: 'Rechercher',
    voirDetail: 'Voir le détail',
    creerTache: 'Créer une tâche',
    creerDecision: 'Créer une décision',
    ouvrirModule: 'Ouvrir {module}',
  },
  etats: {
    vide: "Rien à afficher pour l'instant.",
    videAvecAction: "Rien à afficher pour l'instant. {action}",
    chargement: 'Chargement du module...',
    horsLigne: 'Saisie gardée sur le téléphone, envoi dès le retour du réseau.',
    enAttenteEnvoi: '{n} saisies en attente d\'envoi',
  },
  confirmations: {
    saisieEnregistree: '{saisie} enregistrée · {effetStock} · {effetCout}',
    suggestionAConfirmer: 'Suggestion à confirmer',
    preRempliAConfirmer: 'Pré-rempli, à confirmer avant enregistrement',
  },
  assistant: {
    pasAssezDeDonnees: "Je n'ai pas assez de données pour répondre. Voir {module}.",
    provenance: "D'après {module}, {periode}",
  },
  alertes: {
    urgentSansResponsable: 'Urgent : {objet} attend un responsable',
  },
  champs: {
    obligatoire: '*',
    coutMoyen: 'Coût moyen',
    coutMoyenInfobulle: "coût moyen pondéré d'achat",
    date: 'Date',
    quantite: 'Quantité',
    motif: 'Motif',
    responsable: 'Responsable',
    details: 'Détails',
  },
  achats: {
    receptionParcoursUnique: 'Chaque réception suit le même parcours : stock, finance, mouvement et preuve.',
    receptionCheminUnique: "Parcours unique d'achat.",
    inventaireSousTitre: 'Valorisation au coût moyen. La réception se fait par le formulaire de réception.',
    alimentationEcritureElevage: "La sortie d'aliment se saisit dans Élevage, onglet Alimentation (ici : simulation sans écriture).",
  },
};
