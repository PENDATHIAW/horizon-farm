/**
 * Score de préparation forum / investisseur — s'appuie sur getInvestorReadySummary sans recalcul Finance.
 */

const arr = (value) => (Array.isArray(value) ? value : []);
const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value || 0))));
const hasText = (value) => String(value || '').trim().length >= 12;

const CHECKLIST = [
  { id: 'bp', label: 'Business plan enregistré', weight: 12, test: (p) => (p.investorReady?.highlights?.business_plans || 0) > 0 },
  { id: 'ca', label: 'Ventes suivies dans l\'ERP', weight: 10, test: (p) => (p.keyFigures?.ca_erp || 0) > 0 },
  { id: 'encaissements', label: 'Encaissements tracés', weight: 10, test: (p) => (p.keyFigures?.encaissements || 0) > 0 },
  { id: 'documents', label: 'Preuves & documents classés', weight: 12, test: (p) => (p.keyFigures?.documents || 0) >= 3 },
  { id: 'clients', label: 'Clients référencés', weight: 8, test: (p) => (p.keyFigures?.clients || 0) > 0 },
  { id: 'activite', label: 'Production active (avicole ou bovin)', weight: 10, test: (p) => arr(p.activities).some((a) => a.status === 'actif') },
  { id: 'stock', label: 'Stock valorisé', weight: 8, test: (p) => (p.keyFigures?.valeur_stock || 0) > 0 },
  { id: 'sante_erp', label: 'Score santé ERP ≥ 70', weight: 10, test: (p) => (p.keyFigures?.health_score || 0) >= 70 },
  { id: 'gaps', label: 'Peu de lacunes dossier', weight: 10, test: (p) => arr(p.investorReady?.gaps).length <= 2 },
  { id: 'risks', label: 'Risques identifiés avec mitigation', weight: 10, test: (p) => arr(p.risksMitigation).length >= 3 },
];

/** Checklist éditoriale de préparation dossier (textes + exports). */
export const PREPARATION_CHECKLIST = [
  { id: 'profil', label: 'Profil projet rempli', test: (p) => hasText(p.projectSummary?.pitch) && hasText(p.projectSummary?.location) },
  { id: 'vision', label: 'Vision & mission renseignées', test: (p) => hasText(p.projectSummary?.vision) && hasText(p.projectSummary?.mission) },
  { id: 'finance', label: 'Données financières disponibles', test: (p) => (p.keyFigures?.ca_erp || 0) > 0 || (p.keyFigures?.besoin_bp || 0) > 0 },
  { id: 'besoins', label: 'Besoins renseignés', test: (p) => arr(p.needsSought).length >= 2 },
  { id: 'impact', label: 'Impact social renseigné', test: (p) => hasText(p.socialImpact?.securite_alimentaire) },
  { id: 'risques', label: 'Risques renseignés', test: (p) => arr(p.risksMitigation).length >= 2 },
  { id: 'objectifs', label: 'Objectifs 6m / 12m / 3 ans', test: (p) => hasText(p.objectives?.sixMonths) || hasText(p.objectives?.twelveMonths) },
  { id: 'bibliotheque', label: 'Documents du dossier attachés', test: (p, ctx) => (ctx?.dossierFileCount || 0) >= 2 },
  { id: 'exports', label: 'Documents PDF générés', test: (p, ctx) => (ctx?.exportCount || 0) > 0 },
  { id: 'pitch', label: 'Pitch prêt', test: (p, ctx) => (ctx?.exportCount || 0) > 0 || hasText(p.manualContent?.project_pitch) },
  { id: 'demo', label: 'Démo investisseur prête', test: (p, ctx) => Boolean(ctx?.demoCompleted) },
];

/** Actions recommandées pour compléter chaque élément manquant. */
export const SCORE_ACTIONS = {
  bp: { tab: 'library', label: 'Ajouter le business plan', hint: 'Rattachez le BP dans Documents du dossier ou Finance.' },
  ca: { tab: 'dossier', section: 'figures', navigate: 'ventes', label: 'Enregistrer des ventes', hint: 'Module Commercial / Ventes.' },
  encaissements: { tab: 'dossier', section: 'figures', navigate: 'finances', label: 'Tracer les encaissements', hint: 'Module Finance & Pilotage.' },
  documents: { tab: 'library', label: 'Classer les preuves', hint: 'Ajoutez factures et justificatifs au dossier.' },
  clients: { tab: 'dossier', section: 'figures', navigate: 'clients', label: 'Référencer les clients', hint: 'Module Clients.' },
  activite: { tab: 'dossier', section: 'figures', navigate: 'avicole', label: 'Activer la production', hint: 'Modules Avicole ou Élevage.' },
  stock: { tab: 'dossier', section: 'figures', navigate: 'stock', label: 'Valoriser le stock', hint: 'Module Stock.' },
  sante_erp: { tab: 'preparation', navigate: 'dashboard', label: 'Améliorer la santé ERP', hint: 'Compléter données manquantes dans l\'ERP.' },
  gaps: { tab: 'preparation', label: 'Réduire les lacunes', hint: 'Suivre les alertes Hey Horizon Core.' },
  risks: { tab: 'dossier', section: 'risks', edit: true, label: 'Documenter les risques', hint: 'Risques + plans de mitigation.' },
  profil: { tab: 'dossier', section: 'project', edit: true, label: 'Compléter le profil', hint: 'Résumé, localisation, statut.' },
  vision: { tab: 'dossier', section: 'vision', edit: true, label: 'Rédiger vision & mission', hint: 'Textes stratégiques du projet.' },
  finance: { tab: 'dossier', section: 'figures', label: 'Vérifier les chiffres ERP', hint: 'Chiffres lus automatiquement depuis Finance.' },
  besoins: { tab: 'dossier', section: 'needs', edit: true, label: 'Préciser les besoins', hint: 'Financement, partenaires, intrants.' },
  impact: { tab: 'dossier', section: 'impact', edit: true, label: 'Détailler l\'impact social', hint: 'Emplois, femmes/jeunes, communauté.' },
  objectifs: { tab: 'dossier', section: 'objectives', edit: true, label: 'Fixer les objectifs', hint: 'Horizons 6 mois, 12 mois et 3 ans.' },
  bibliotheque: { tab: 'library', label: 'Ajouter des pièces', hint: 'BP, photos, devis, factures, attestations.' },
  exports: { tab: 'export', label: 'Générer un PDF', hint: 'Fiche projet ou dossier investisseur.' },
  pitch: { tab: 'dossier', section: 'project', edit: true, label: 'Finaliser le pitch', hint: 'Résumé exécutif percutant.' },
  demo: { tab: 'demo', label: 'Lancer la démo', hint: 'WhatsApp, OCR, Brief, Forecast.' },
};

function readinessLabel(score) {
  if (score >= 80) return 'Prêt à présenter';
  if (score >= 60) return 'Presque prêt';
  if (score >= 40) return 'En préparation';
  return 'À renforcer';
}

function badgeLabel(score, dossierStatus) {
  if (score >= 80 && dossierStatus === 'pret') return 'Prêt à présenter';
  if (score >= 40 || dossierStatus === 'en_cours') return 'En préparation';
  return 'Brouillon';
}

function badgeTone(badge) {
  if (badge === 'Prêt à présenter') return 'ready';
  if (badge === 'En préparation') return 'progress';
  return 'draft';
}

function dossierStatusLabel(status) {
  const map = { pret: 'Prêt', en_cours: 'En cours', brouillon: 'Brouillon' };
  return map[status] || 'Brouillon';
}

function buildScoreBreakdown(checklist, preparation) {
  const filled = [
    ...checklist.filter((i) => i.ok).map((i) => ({ id: i.id, label: i.label, source: 'erp', points: i.points, weight: i.weight })),
    ...preparation.filter((i) => i.ok).map((i) => ({ id: i.id, label: i.label, source: 'dossier' })),
  ];
  const missing = [
    ...checklist.filter((i) => !i.ok).map((i) => ({ id: i.id, label: i.label, source: 'erp', action: SCORE_ACTIONS[i.id] })),
    ...preparation.filter((i) => !i.ok).map((i) => ({ id: i.id, label: i.label, source: 'dossier', action: SCORE_ACTIONS[i.id] })),
  ];
  return { filled, missing };
}

/**
 * @param {ReturnType<import('./investorProfileService.js').buildInvestorForumProfile>} profile
 * @param {{ exportCount?: number, dossierFileCount?: number, demoCompleted?: boolean }} context
 */
export function computeForumReadinessScore(profile = {}, context = {}) {
  const baseScore = clamp(profile.investorReady?.readiness_score ?? 0);
  const checklist = CHECKLIST.map((item) => {
    const ok = item.test(profile);
    return { ...item, ok, points: ok ? item.weight : 0, maxPoints: item.weight };
  });
  const checklistScore = checklist.reduce((sum, item) => sum + item.points, 0);
  const maxChecklistScore = checklist.reduce((sum, item) => sum + item.weight, 0);
  const preparation = PREPARATION_CHECKLIST.map((item) => ({
    ...item,
    ok: item.test(profile, context),
    action: SCORE_ACTIONS[item.id],
  }));
  const prepOk = preparation.filter((item) => item.ok).length;
  const composite = clamp(baseScore * 0.5 + (checklistScore / Math.max(1, maxChecklistScore)) * 100 * 0.4 + (prepOk / PREPARATION_CHECKLIST.length) * 100 * 0.1);
  const missing = checklist.filter((item) => !item.ok).map((item) => item.label);
  const prepMissing = preparation.filter((item) => !item.ok).map((item) => item.label);
  const badge = badgeLabel(composite, profile.dossierStatus);
  const breakdown = buildScoreBreakdown(checklist, preparation);

  const explanation = [
    `Score composite ${composite}/100 = 50% Core investisseur (${baseScore}) + 40% checklist ERP (${Math.round((checklistScore / Math.max(1, maxChecklistScore)) * 100)}%) + 10% dossier éditorial (${prepOk}/${PREPARATION_CHECKLIST.length}).`,
    breakdown.missing.length
      ? `${breakdown.missing.length} élément(s) manquant(s) pénalisent le score.`
      : 'Tous les critères principaux sont couverts.',
  ].join(' ');

  return {
    score: composite,
    base_investor_score: baseScore,
    checklist_score: checklistScore,
    max_checklist_score: maxChecklistScore,
    label: readinessLabel(composite),
    badge,
    badge_tone: badgeTone(badge),
    dossier_status: profile.dossierStatus || 'brouillon',
    dossier_status_label: dossierStatusLabel(profile.dossierStatus),
    progress_percent: clamp((prepOk / PREPARATION_CHECKLIST.length) * 100),
    checklist,
    preparation,
    prep_ok_count: prepOk,
    prep_total: PREPARATION_CHECKLIST.length,
    missing,
    prep_missing: prepMissing,
    breakdown,
    explanation,
    recommended_actions: breakdown.missing
      .filter((m) => m.action)
      .slice(0, 6)
      .map((m) => ({ id: m.id, label: m.label, ...m.action })),
    ready_for_export: composite >= 55,
    summary: composite >= 80
      ? 'Dossier solide — exports investisseur et subvention recommandés.'
      : composite >= 55
        ? 'Base présentable — compléter les points manquants avant salon international.'
        : 'Renforcer preuves ERP et textes stratégiques avant forum ou banque.',
  };
}

export default computeForumReadinessScore;
