/**
 * Génération des dossiers exportables (PDF) — architecture extensible.
 * Réutilise buildModuleReportPdf / exportModuleReportPdf quand pertinent.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buildModuleReportPdf, exportModuleReportPdf, saveModuleReportExport } from '../../utils/moduleReportExports.js';
import { fmtCurrency } from '../../utils/format.js';
import { HORIZON_FARM_TAGLINE, INVESTOR_FORUMS_SOURCE } from './investorProfileService.js';
import { adaptProfileForAudience, FORUM_AUDIENCES } from './forumAudienceAdapter.js';
import { computeForumReadinessScore } from './forumReadinessScore.js';

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
const clean = (text = '') => String(text || '').replace(/\s{2,}/g, ' ').trim();
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

function sectionBody(profile, adapted, readiness) {
  const obj = profile.objectives || {};
  const objectiveBlock = [
    obj.sixMonths ? `6 mois : ${obj.sixMonths}` : '',
    obj.twelveMonths ? `12 mois : ${obj.twelveMonths}` : '',
    obj.threeYears ? `3 ans : ${obj.threeYears}` : '',
  ].filter(Boolean).join('\n');

  return [
    { title: 'Résumé du projet', body: adapted.executiveSummary || profile.tagline },
    { title: 'Vision', body: profile.projectSummary?.vision || 'Vision à préciser.' },
    { title: 'Mission', body: profile.projectSummary?.mission || 'Mission à préciser.' },
    { title: 'Profil fondatrice', body: `${profile.founderProfile?.name || '—'} — ${profile.founderProfile?.role || ''}. ${arr(profile.founderProfile?.highlights).join(' · ')}` },
    { title: 'Activités', body: arr(profile.activities).map((a) => `${a.label} : ${a.detail}`).join('\n') },
    { title: 'Chiffres clés', body: `CA ERP ${money(profile.keyFigures?.ca_erp)} · Encaissements ${money(profile.keyFigures?.encaissements)} · Trésorerie ${money(profile.keyFigures?.resultat_tresorerie)} · CA BP ${money(profile.keyFigures?.ca_bp_annuel)}` },
    { title: 'Impact social', body: `${profile.socialImpact?.securite_alimentaire}. ${profile.socialImpact?.formalisation}. ${profile.socialImpact?.community}` },
    { title: 'Innovation IA', body: `${profile.aiInnovation?.headline}. ${arr(profile.aiInnovation?.modules).join(' · ')}` },
    { title: 'Besoins recherchés', body: arr(profile.needsSought).map((n) => `${n.label} — ${n.detail}`).join('\n') },
    { title: 'Risques & mitigation', body: arr(adapted.adaptedRisks).map((r) => `${r.label} → ${r.mitigation}`).join('\n') },
    { title: 'Objectifs', body: objectiveBlock || 'Objectifs à préciser dans le dossier.' },
    { title: 'Score de préparation', body: `${readiness.score}/100 — ${readiness.label}. ${readiness.summary}` },
  ];
}

function writeSection(doc, title, body, y) {
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setTextColor(47, 36, 21);
  doc.text(title, 14, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(80, 70, 55);
  const lines = doc.splitTextToSize(clean(body), 182);
  doc.text(lines, 14, y);
  return y + lines.length * 4.5 + 8;
}

function buildDossierPdf(pack) {
  const { profile, adapted, readiness, packType, audience } = pack;
  const doc = new jsPDF({ orientation: packType.format === 'landscape' ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  doc.setFillColor(248, 245, 239);
  doc.rect(0, 0, 210, 297, 'F');
  doc.setTextColor(47, 36, 21);
  doc.setFontSize(22);
  doc.text('HORIZON FARM', 16, 32);
  doc.setFontSize(14);
  doc.text(packType.label, 16, 44);
  doc.setFontSize(10);
  doc.text(`Cible : ${audience.label}`, 16, 54);
  doc.text(`Date : ${today()}`, 16, 62);
  doc.setFontSize(9);
  const tagLines = doc.splitTextToSize(HORIZON_FARM_TAGLINE, 178);
  doc.text(tagLines, 16, 72);

  autoTable(doc, {
    startY: 88,
    head: [['Indicateur', 'Valeur']],
    body: arr(adapted.highlights).map((h) => [h.label, h.value]),
    theme: 'grid',
    headStyles: { fillColor: [47, 36, 21], textColor: 255 },
    styles: { fontSize: 8.5 },
  });

  doc.addPage();
  let y = 22;
  sectionBody(profile, adapted, readiness).forEach((section) => {
    y = writeSection(doc, section.title, section.body, y);
  });

  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(125, 106, 74);
    doc.text(`Horizon Farm · ${packType.label} · ${i}/${pages}`, 105, 288, { align: 'center' });
  }

  const slug = packType.id.replace(/_/g, '-');
  const filename = `${slug}-horizon-farm-${today()}.pdf`;
  return { doc, filename };
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

  return {
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
    subtitle: adapted.executiveSummary,
    sections: sectionBody(profile, adapted, readiness),
  };
}

/** Payload pour exportModuleReportPdf (rapports impact / financier). */
export function forumPackToExportPayload(pack = {}) {
  const k = pack.profile?.keyFigures || {};

  const rows = pack.packType?.id === 'rapport_impact'
    ? [
        ['Emplois prévus BP', String(pack.profile?.socialImpact?.emplois_prevus || 0)],
        ['Effectif ERP', String(pack.profile?.socialImpact?.effectif_erp || 0)],
        ['Documents preuves', String(k.documents || 0)],
        ['Score préparation', `${pack.readiness?.score || 0}/100`],
      ]
    : [
        ['CA ERP', money(k.ca_erp)],
        ['Encaissements', money(k.encaissements)],
        ['Trésorerie', money(k.resultat_tresorerie)],
        ['Créances', money(k.creances)],
        ['CA BP annuel', money(k.ca_bp_annuel)],
        ['Besoin BP', money(k.besoin_bp)],
      ];

  return {
    module: 'Investisseurs & Forums',
    title: pack.title || pack.packType?.label || 'Rapport',
    period: 'Toutes les périodes',
    subtitle: pack.subtitle || HORIZON_FARM_TAGLINE,
    labels: rows.map((r) => r[0]),
    series: [{ name: 'Valeur', values: rows.map((r) => r[1]), unit: '' }],
    extra: {
      Audience: pack.audience?.label,
      'Score préparation': `${pack.readiness?.score || 0}/100`,
      Tagline: HORIZON_FARM_TAGLINE,
    },
  };
}

/** Génère le blob PDF (téléchargement, aperçu, historique). */
export function renderForumPackPdfBlob(pack = {}) {
  if (pack.packType?.useModuleReport) {
    const { doc, filename } = buildModuleReportPdf(forumPackToExportPayload(pack));
    return { blob: doc.output('blob'), filename, doc };
  }
  const { doc, filename } = buildDossierPdf(pack);
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
