/** Définitions partagées pour éviter l’ambiguïté entre modules (Commercial, Finance, Élevage). */

export const MARGIN_GLOSSARY_ENTRIES = [
  {
    key: 'vente',
    title: 'Marge sur prix proposé',
    formula: 'prix proposé − coût unifié',
    usage: 'Fiches animal / lot avicole, listes Élevage et bandeaux prix — avant enregistrement de la vente.',
  },
  {
    key: 'reelle',
    title: 'Marge réelle',
    formula: 'encaissements − charges comptabilisées et coûts métier consolidés',
    usage: 'Finance & Pilotage — trésorerie et rentabilité sur données enregistrées (cumul ferme).',
  },
  {
    key: 'operationnel',
    title: 'Résultat opérationnel',
    formula: 'CA commercial période − charges variables d’activité',
    usage: 'Finance › Rentabilité — taux en % sur le CA de la période sélectionnée.',
  },
  {
    key: 'brute',
    title: 'Marge brute activités',
    formula: 'revenus activités (élevage, cultures) − coûts directs suivis',
    usage: 'Ventilation Aviculture / Bovins / Cultures dans le panneau rentabilité.',
  },
];
