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
  { id: 'finance', label: 'Données financières disponibles', test: (p) => (p.keyFigures?.ca_erp || 0) > 0 || (p.keyFigures?.besoin_bp || 0) > 0 },
  { id: 'besoins', label: 'Besoins renseignés', test: (p) => arr(p.needsSought).length >= 2 },
  { id: 'impact', label: 'Impact social renseigné', test: (p) => hasText(p.socialImpact?.securite_alimentaire) },
  { id: 'risques', label: 'Risques renseignés', test: (p) => arr(p.risksMitigation).length >= 2 },
  { id: 'objectifs', label: 'Objectifs 6m / 12m / 3 ans', test: (p) => hasText(p.objectives?.sixMonths) || hasText(p.objectives?.twelveMonths) },
  { id: 'exports', label: 'Documents générés', test: (p, ctx) => (ctx?.exportCount || 0) > 0 },
  { id: 'pitch', label: 'Pitch prêt', test: (p, ctx) => (ctx?.exportCount || 0) > 0 || hasText(p.manualContent?.project_pitch) },
  { id: 'demo', label: 'Démo investisseur prête', test: () => true },
];

function readinessLabel(score) {
  if (score >= 80) return 'Prêt à présenter';
  if (score >= 60) return 'Presque prêt';
  if (score >= 40) return 'En préparation';
  return 'À renforcer';
}

function dossierStatusLabel(status) {
  const map = { pret: 'Prêt', en_cours: 'En cours', brouillon: 'Brouillon' };
  return map[status] || 'Brouillon';
}

/**
 * @param {ReturnType<import('./investorProfileService.js').buildInvestorForumProfile>} profile
 * @param {{ exportCount?: number }} context
 */
export function computeForumReadinessScore(profile = {}, context = {}) {
  const baseScore = clamp(profile.investorReady?.readiness_score ?? 0);
  const checklist = CHECKLIST.map((item) => {
    const ok = item.test(profile);
    return { ...item, ok, points: ok ? item.weight : 0 };
  });
  const checklistScore = checklist.reduce((sum, item) => sum + item.points, 0);
  const preparation = PREPARATION_CHECKLIST.map((item) => ({
    ...item,
    ok: item.test(profile, context),
  }));
  const prepOk = preparation.filter((item) => item.ok).length;
  const composite = clamp(baseScore * 0.5 + checklistScore * 0.4 + (prepOk / PREPARATION_CHECKLIST.length) * 100 * 0.1);
  const missing = checklist.filter((item) => !item.ok).map((item) => item.label);
  const prepMissing = preparation.filter((item) => !item.ok).map((item) => item.label);

  return {
    score: composite,
    base_investor_score: baseScore,
    checklist_score: checklistScore,
    label: readinessLabel(composite),
    dossier_status: profile.dossierStatus || 'brouillon',
    dossier_status_label: dossierStatusLabel(profile.dossierStatus),
    checklist,
    preparation,
    prep_ok_count: prepOk,
    prep_total: PREPARATION_CHECKLIST.length,
    missing,
    prep_missing: prepMissing,
    ready_for_export: composite >= 55,
    summary: composite >= 80
      ? 'Dossier solide — exports investisseur et subvention recommandés.'
      : composite >= 55
        ? 'Base présentable — compléter les points manquants avant salon international.'
        : 'Renforcer preuves ERP et textes stratégiques avant forum ou banque.',
  };
}

export default computeForumReadinessScore;
