/** Libellés des composants uniques (journal, tâches, alertes, cartes KPI). */
export default {
  journal: {
    titre: 'Journal des événements',
    vide: "Rien à afficher pour l'instant. Les saisies du terrain apparaissent ici.",
    voirModule: 'Ouvrir {module}',
  },
  taches: {
    titre: 'Tâches',
    vide: "Rien à afficher pour l'instant. Créer une tâche depuis une alerte ou le calendrier.",
    enRetard: 'En retard',
    aujourdHui: "Aujourd'hui",
    actionCorrective: 'Action corrective',
    echeance: 'Échéance {date}',
  },
  alertes: {
    titre: 'Alertes',
    vide: "Rien à afficher pour l'instant. Aucune alerte active.",
    creerTache: 'Créer une tâche',
    ouvrirSource: 'Ouvrir {module}',
    urgentSansResponsable: 'Urgent : {objet} attend un responsable',
  },
  kpi: {
    periode: 'Période : {periode}',
    voirSource: 'Voir dans {module}',
    valeurIndisponible: 'Pas encore de données',
  },
};
