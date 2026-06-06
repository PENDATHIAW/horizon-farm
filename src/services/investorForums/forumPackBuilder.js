/**
 * Génération des dossiers exportables (PDF) — architecture extensible.
 * Dossiers institutionnels via fundingDossierPdf ; rapports module pour impact/financier.
 */

import { buildModuleReportPdf, saveModuleReportExport } from '../../utils/moduleReportExports.js';
import { fmtCurrency } from '../../utils/format.js';
import { HORIZON_FARM_TAGLINE, INVESTOR_FORUMS_SOURCE } from './investorProfileService.js';
import { adaptProfileForAudience, FORUM_AUDIENCES } from './forumAudienceAdapter.js';
import { computeForumReadinessScore } from './forumReadinessScore.js';
import {
  buildFundingDossierSections,
  buildProfessionalFundingDossierPdf,
  formatFundingAmount,
  sanitizeInstitutionalText,
} from './fundingDossierPdf.js';

export const FORUM_PACK_TYPES = {
  fiche_projet: { id: 'fiche_projet', label: 'Fiche projet 1 page', pages: 1, format: 'portrait' },
  one_pager: { id: 'one_pager', label: 'One Pager', pages: 1, format: 'portrait' },
  dossier_investisseur: { id: 'dossier_investisseur', label: 'Dossier investisseur', pages: 'multi', format: 'portrait' },
  dossier_banque: { id: 'dossier_banque', label: 'Dossier banque', pages: 'multi', format: 'portrait' },
  dossier_ong: { id: 'dossier_ong', label: 'Dossier ONG', pages: 'multi', format: 'portrait' },
  dossier_subvention: { id: 'dossier_subvention', label: 'Dossier subvention', pages: 'multi', format: 'portrait' },
  pitch_deck: { id: 'pitch_deck', label: 'Pitch deck', pages: 'multi', format: 'landscape' },
  rapport_impact: { id: 'rapport_impact', label: 'Rapport impact', pages: 1, format: 'landscape', useModuleReport: true },
  rapport_financier: { id: 'rapport_financier', label: 'Rapport financier simplifié', pages: 1, format: 'landscape', useModuleReport: true },
};

const arr = (value) => (Array.isArray(value) ? value : []);
const money = (value) => fmtCurrency(Number(value || 0));
const today = () => new Date().toISOString().slice(0, 10);

function packAudienceKey(packType, audienceKey) {
  if (packType === 'dossier_subvention') return 'ong_subvention';
  if (packType === 'dossier_banque') return 'banque';
  if (packType === 'dossier_ong') return 'ong_subvention';
  if (packType === 'dossier_investisseur') return audienceKey === 'banque' ? 'banque' : 'investisseur_prive';
  if (packType === 'rapport_impact') return 'ong_subvention';
  if (packType === 'rapport_financier') return 'banque';
  if (packType === 'one_pager') return audienceKey || 'investisseur_prive';
  return audienceKey || 'investisseur_prive';
}

function resolvePackDefinition(packType) {
  if (packType === 'one_pager') return FORUM_PACK_TYPES.one_pager;
  if (packType === 'dossier_banque' || packType === 'dossier_ong') {
    return FORUM_PACK_TYPES[packType] || FORUM_PACK_TYPES.dossier_investisseur;
  }
  return FORUM_PACK_TYPES[packType] || FORUM_PACK_TYPES.fiche_projet;
}

/**
 * Construit un pack exportable.
 */
export function buildForumPack(profile = {}, { audienceKey = 'investisseur_prive', packType = 'fiche_projet' } = {}) {
  const packDef = resolvePackDefinition(packType);
  const resolvedAudienceKey = packAudienceKey(packType, audienceKey);
  const adapted = adaptProfileForAudience(profile, resolvedAudienceKey);
  const readiness = computeForumReadinessScore(profile);
  const audience = FORUM_AUDIENCES[resolvedAudienceKey] || FORUM_AUDIENCES.investisseur_prive;

  const pack = {
    id: `forum-pack-${packType}-${Date.now()}`,
    source: INVESTOR_FORUMS_SOURCE,
    readOnly: true,
    generated_at: new Date().toISOString(),
    packType: packDef,
    audience,
    audienceKey: resolvedAudienceKey,
    profile,
    adapted,
    readiness,
    title: `${packDef.label} — ${audience.label}`,
    subtitle: sanitizeInstitutionalText(adapted.executiveSummary || profile.tagline),
  };

  pack.sections = buildFundingDossierSections(pack).filter((s) => s.body);
  return pack;
}

/** Payload pour exportModuleReportPdf (rapports impact / financier). */
export function forumPackToExportPayload(pack = {}) {
  const k = pack.profile?.keyFigures || {};

  const rows = pack.packType?.id === 'rapport_impact'
    ? [
        pack.profile?.socialImpact?.emplois_prevus ? ['Emplois prévus', String(pack.profile.socialImpact.emplois_prevus)] : null,
        pack.profile?.socialImpact?.securite_alimentaire ? ['Sécurité alimentaire', pack.profile.socialImpact.securite_alimentaire] : null,
        pack.profile?.socialImpact?.community ? ['Impact communautaire', pack.profile.socialImpact.community] : null,
      ].filter(Boolean)
    : [
        ['CA prévisionnel annuel', formatFundingAmount(k.ca_bp_annuel)],
        ['Besoin de financement', formatFundingAmount(k.besoin_bp)],
        ['Encaissements', formatFundingAmount(k.encaissements)],
        ['Résultat prévisionnel An 1', formatFundingAmount(k.resultat_bp_an1)],
      ].filter((r) => r[1]);

  return {
    module: 'Investisseurs & Forums',
    title: pack.title || pack.packType?.label || 'Rapport',
    period: 'Toutes les périodes',
    subtitle: sanitizeInstitutionalText(pack.subtitle || HORIZON_FARM_TAGLINE),
    labels: rows.map((r) => r[0]),
    series: [{ name: 'Valeur', values: rows.map((r) => r[1]), unit: '' }],
    extra: {
      Destinataire: pack.audience?.label,
      Projet: pack.profile?.projectSummary?.title || 'Horizon Farm',
    },
  };
}

/** Génère le blob PDF (téléchargement, aperçu, historique). */
export function renderForumPackPdfBlob(pack = {}) {
  if (pack.packType?.useModuleReport) {
    const { doc, filename } = buildModuleReportPdf(forumPackToExportPayload(pack));
    return { blob: doc.output('blob'), filename, doc };
  }
  const { doc, filename } = buildProfessionalFundingDossierPdf(pack);
  return { blob: doc.output('blob'), filename, doc };
}

/** Télécharge le PDF côté navigateur. */
export function downloadForumPackPdf(pack = {}) {
  const { blob, filename } = renderForumPackPdfBlob(pack);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  saveModuleReportExport({
    module: 'Investisseurs & Forums',
    title: pack.title,
    period: 'Toutes les périodes',
    filename,
    summary: pack.subtitle,
  });
  return { blob, filename };
}

/** Export PDF — dossiers multi-pages ou rapports module (legacy). */
export function exportForumPackPdf(pack = {}) {
  return downloadForumPackPdf(pack);
}

export default buildForumPack;
