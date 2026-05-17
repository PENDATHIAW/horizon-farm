export const auditFindingTypes = [
  'formulaire',
  'champ',
  'carte_kpi',
  'tableau',
  'graphe',
  'bouton_action',
  'workflow',
  'document',
  'traceabilite',
  'donnee',
  'ergonomie',
  'simplification',
];

export const auditSeverityLevels = {
  bloquant: {
    rank: 1,
    label: 'Bloquant',
    meaning: 'Empêche la cohérence métier, fausse les chiffres, casse un workflow ou bloque une action essentielle.',
  },
  critique: {
    rank: 2,
    label: 'Critique',
    meaning: 'Risque élevé sur la fiabilité, la traçabilité, la marge, les documents ou l’interconnexion.',
  },
  majeur: {
    rank: 3,
    label: 'Majeur',
    meaning: 'Gêne forte pour l’utilisateur ou incohérence importante à corriger rapidement.',
  },
  mineur: {
    rank: 4,
    label: 'Mineur',
    meaning: 'Amélioration utile mais non bloquante.',
  },
  amelioration: {
    rank: 5,
    label: 'Amélioration',
    meaning: 'Optimisation UX, simplification ou enrichissement recommandé.',
  },
};

export const auditFindingStatuses = [
  'detecte',
  'a_corriger',
  'en_cours',
  'corrige',
  'a_retester',
  'valide',
  'ignore_justifie',
];

export const auditCorrectionOrder = [
  {
    priority: 1,
    title: 'Fiabilité financière et chiffre d’affaires',
    modules: ['Ventes', 'Finances', 'Comptabilité', 'Objectifs', 'Accueil'],
    examples: ['paiement_sans_finance', 'facture_sans_document', 'ca_non_aligne', 'objectif_realise_zero_malgre_vente'],
  },
  {
    priority: 2,
    title: 'Workflows métier interconnectés',
    modules: ['Ventes', 'Animaux', 'Avicole', 'Cultures', 'Santé', 'Documents', 'Traçabilité'],
    examples: ['opportunite_non_fermee', 'animal_vendu_sans_commande', 'sante_sans_impact_structure', 'action_sans_trace'],
  },
  {
    priority: 3,
    title: 'Règles terrain critiques',
    modules: ['Animaux', 'Avicole', 'Cultures', 'Santé', 'Stock', 'Alertes', 'Tâches'],
    examples: ['pesee_retard', 'animal_vendu_modifiable', 'graphique_pondeuse_chair', 'recolte_non_stockee'],
  },
  {
    priority: 4,
    title: 'Formulaires et champs',
    modules: ['Santé', 'Ventes', 'Animaux', 'Avicole', 'Cultures', 'Finances', 'Documents'],
    examples: ['champ_libre_devrait_etre_liste', 'formulaire_non_adaptatif', 'preuve_url_uniquement', 'champ_obligatoire_injustifie'],
  },
  {
    priority: 5,
    title: 'Interface, tableaux, cartes et graphes',
    modules: ['Tous modules'],
    examples: ['carte_hors_contexte', 'graphique_hors_contexte', 'colonne_importante_absente', 'action_ligne_absente'],
  },
  {
    priority: 6,
    title: 'Simplification intelligente',
    modules: ['Tous modules'],
    examples: ['ecran_trop_charge', 'module_demande_double_saisie', 'richesse_mal_organisee', 'terme_non_homogene'],
  },
];

export function normalizeAuditFinding(input = {}) {
  const severity = auditSeverityLevels[input.severity] ? input.severity : 'majeur';
  const status = auditFindingStatuses.includes(input.status) ? input.status : 'detecte';
  return {
    id: input.id || `AUD-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    module: input.module || 'Non renseigné',
    zone: input.zone || input.screen || input.onglet || 'Module',
    element: input.element || input.field || input.title || 'Élément non renseigné',
    type: auditFindingTypes.includes(input.type) ? input.type : 'donnee',
    severity,
    severity_rank: auditSeverityLevels[severity].rank,
    status,
    title: input.title || input.problem || 'Anomalie à analyser',
    detail: input.detail || input.description || '',
    probable_cause: input.probable_cause || input.cause || 'À confirmer pendant correction',
    expected_fix: input.expected_fix || input.action || 'Correction à définir',
    business_impact: input.business_impact || input.impact || 'Impact métier à préciser',
    linked_modules: Array.isArray(input.linked_modules) ? input.linked_modules : [],
    source_path: input.source_path || input.file || '',
    source_component: input.source_component || '',
    correction_lot: input.correction_lot || '',
    retest_steps: Array.isArray(input.retest_steps) ? input.retest_steps : [],
    detected_at: input.detected_at || new Date().toISOString(),
  };
}

export function sortAuditFindings(findings = []) {
  return [...findings].sort((a, b) => {
    const ar = a.severity_rank || auditSeverityLevels[a.severity]?.rank || 99;
    const br = b.severity_rank || auditSeverityLevels[b.severity]?.rank || 99;
    if (ar !== br) return ar - br;
    return String(a.module || '').localeCompare(String(b.module || ''));
  });
}
