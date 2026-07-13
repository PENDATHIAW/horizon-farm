export const STATUTS_TACHE_OUVERTE = Object.freeze([
  'a_faire',
  'à faire',
  'en_cours',
  'en cours',
  'todo',
  'in_progress',
  'nouvelle',
  'ouverte',
  'open',
]);

export default {
  actions: {
    ouvrirSource: 'Ouvrir le module source',
  },
  journal: {
    titre: "Journal d'exploitation",
    evenement: 'Événement métier',
    dateInconnue: 'Date inconnue',
  },
  tasks: {
    titre: 'Tâches',
    tache: 'Tâche à traiter',
    sansEcheance: 'Sans échéance',
  },
  alerts: {
    titre: 'Alertes',
    alerte: 'Alerte à traiter',
    resoudre: "Résoudre l'alerte",
  },
  statuses: {
    todo: 'À faire',
    doing: 'En cours',
    done: 'Terminée',
    cancelled: 'Annulée',
  },
  kpi: {
    indisponible: 'Non disponible',
    periodeActive: 'Période active',
    sourceInconnue: 'Source à préciser',
  },
};
