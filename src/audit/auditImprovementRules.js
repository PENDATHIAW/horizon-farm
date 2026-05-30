export const auditImprovementRules = [
  {
    id: 'FORM_SIMULATION_REQUIRED',
    title: 'Simulation obligatoire de remplissage',
    severity: 'critique',
    rule: 'Un module avec formulaire n’est pas considéré testé tant qu’un scénario de remplissage normal, invalide et limite n’a pas été simulé.',
    improvement: 'Ajouter pour chaque formulaire un mode test qui préremplit un cas normal, un cas incomplet et un cas impossible.',
  },
  {
    id: 'IMPROVEMENT_REQUIRED',
    title: 'Chaque anomalie doit proposer une amélioration',
    severity: 'critique',
    rule: 'Le rapport ne doit jamais s’arrêter au constat. Il doit proposer au moins une correction et une amélioration UX/métier.',
    improvement: 'Séparer correction obligatoire, amélioration recommandée, automatisation possible et simplification UX.',
  },
  {
    id: 'FIELD_TYPE_DECISION',
    title: 'Décision sur chaque champ',
    severity: 'haute',
    rule: 'Chaque champ rencontré doit être classé : obligatoire, facultatif, calculé, liste prédéfinie, lecture seule, supprimable ou commentaire libre.',
    improvement: 'Ajouter un audit champ par champ avec raison métier et proposition de simplification.',
  },
  {
    id: 'FORM_FEEDBACK',
    title: 'Retour utilisateur après validation',
    severity: 'haute',
    rule: 'Chaque validation doit afficher clairement ce qui a été créé, modifié, synchronisé ou refusé.',
    improvement: 'Afficher un résumé après validation : élément créé, modules mis à jour, documents générés, traces créées, prochaines actions.',
  },
  {
    id: 'CROSS_MODULE_RICOCHET',
    title: 'Ricochet inter-modules visible',
    severity: 'critique',
    rule: 'Une action métier doit montrer ses impacts dans les modules liés : Finance, Stock, Documents, Objectifs, Traçabilité, Alertes ou Tâches.',
    improvement: 'Ajouter un bloc avant/après indiquant les modules impactés par l’action.',
  },
  {
    id: 'INVALID_INPUT_GUARDRAILS',
    title: 'Tests de saisies impossibles',
    severity: 'critique',
    rule: 'Le testeur doit tenter des valeurs impossibles : montants négatifs, dates incohérentes, quantités supérieures au stock, champs obligatoires vides.',
    improvement: 'Ajouter des validations bloquantes avec messages simples et actionnables.',
  },
  {
    id: 'SMART_PREFILL',
    title: 'Préremplissage intelligent',
    severity: 'moyenne',
    rule: 'Quand l’ERP connaît déjà une donnée, le formulaire ne doit pas redemander la même saisie.',
    improvement: 'Préremplir client, source, prix, reste à payer, stock disponible, coût estimé et prochaine date attendue.',
  },
  {
    id: 'REPORT_ACTIONABILITY',
    title: 'Rapport actionnable',
    severity: 'critique',
    rule: 'Le rapport consolidé doit indiquer quoi corriger, quoi améliorer, où intervenir et quoi retester.',
    improvement: 'Exporter anomalies.json, anomalies.csv, matrice de couverture, plan de retest et top priorités.',
  },
];

export const improvementCategories = [
  'correction_obligatoire',
  'amelioration_ux',
  'amelioration_metier',
  'automatisation_possible',
  'simplification_formulaire',
  'controle_donnee',
  'retest_obligatoire',
];

export const improvementOutputTemplate = {
  correction_obligatoire: '',
  amelioration_ux: '',
  amelioration_metier: '',
  automatisation_possible: '',
  simplification_formulaire: '',
  controle_donnee: '',
  retest_obligatoire: '',
};
