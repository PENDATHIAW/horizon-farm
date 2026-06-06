/**
 * Dossier de financement institutionnel — PDF professionnel.
 * Document destiné banques, investisseurs, ONG, incubateurs, partenaires techniques.
 * Pas d'export ERP : prose institutionnelle, fond blanc, valeurs nulles masquées.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtCurrency } from '../../utils/format.js';
import { HORIZON_FARM_OFFICIAL_BP } from '../horizonFarmOfficialBusinessPlan.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (text = '') => String(text || '').replace(/\s{2,}/g, ' ').trim();
const today = () => new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const todayIso = () => new Date().toISOString().slice(0, 10);
const n = (value) => Number(value || 0);

const PH = {
  launching: 'Projet en phase de lancement',
  afterStart: 'Données disponibles après démarrage',
};

const COL = {
  text: [26, 26, 26],
  muted: [102, 102, 102],
  line: [210, 210, 210],
  head: [47, 36, 21],
};

/** Retire jargon technique / IA pour un lecteur institutionnel. */
export function sanitizeInstitutionalText(text = '') {
  return clean(String(text || '')
    .replace(/Horizon Farm ERP/gi, 'Horizon Farm')
    .replace(/\bERP\b/gi, 'pilotage structuré')
    .replace(/Hey Horizon AI[^.\n]*/gi, 'pilotage par la donnée')
    .replace(/\bIA\b/g, 'pilotage par la donnée')
    .replace(/intelligence artificielle/gi, 'pilotage par la donnée')
    .replace(/OCR intelligent[^·.]*/gi, 'numérisation des justificatifs')
    .replace(/Horizon Advisor[^·.]*/gi, 'accompagnement décisionnel')
    .replace(/Horizon Forecast[^·.]*/gi, 'prévisions d\'activité')
    .replace(/WhatsApp Horizon[^·.]*/gi, 'suivi terrain')
    .replace(/score santé[^·.]*/gi, 'suivi opérationnel')
    .replace(/CA ERP/gi, 'chiffre d\'affaires')
    .replace(/\d+\/\d+\s*—\s*[^.]*/g, '')
    .replace(/·\s*·/g, '·')
    .replace(/\s+\./g, '.'));
}

/** Montant affichable — null si nul ou absent. */
export function formatFundingAmount(value) {
  const num = n(value);
  if (!num || num <= 0) return null;
  return fmtCurrency(num);
}

/** Compteur affichable — null si nul. */
function formatCount(value, { unit = '', feminine = false } = {}) {
  const num = n(value);
  if (!num || num <= 0) return null;
  const label = num === 1
    ? (feminine ? 'une' : 'un')
    : `${num.toLocaleString('fr-FR')}${unit ? ` ${unit}` : ''}`;
  return label;
}

function pick(...values) {
  for (const v of values) {
    const c = clean(v);
    if (c && c !== '—' && c !== '0') return c;
  }
  return '';
}

function whyCard(profile, id) {
  return arr(profile.investorRoom?.whyInvest).find((c) => c.id === id);
}

function buildExecutiveSummary(profile, adapted) {
  const custom = adapted.executiveSummary;
  if (custom) {
    const sanitized = sanitizeInstitutionalText(custom);
    if (sanitized.length > 80) return sanitized;
  }
  const founder = profile.founderProfile?.name || 'Penda THIAW';
  const location = pick(profile.projectSummary?.location, 'Sénégal');
  const marche = whyCard(profile, 'marche')?.body;
  const diff = whyCard(profile, 'differentiation')?.body;
  const seeking = profile.investorRoom?.seeking || {};
  const amount = formatFundingAmount(seeking.montant_recherche || profile.keyFigures?.besoin_bp);

  return sanitizeInstitutionalText([
    `${founder} porte Horizon Farm, entreprise agricole intégrée basée au ${location}.`,
    'Le projet combine aviculture (pondeuses et poulets de chair), embouche bovine et cultures, avec une commercialisation structurée sur les marchés locaux.',
    marche || 'La demande locale en œufs, volaille et viande offre un débouché régulier et de proximité.',
    diff || 'La fondatrice apporte une double compétence en gestion de la performance et en conduite de projet agricole.',
    amount
      ? `Un financement de ${amount} est recherché pour sécuriser le démarrage et la montée en charge de la production.`
      : 'Un financement est recherché pour sécuriser les actifs productifs et le fonds de roulement de démarrage.',
  ].join(' '));
}

function buildFounderSection(profile) {
  const f = profile.founderProfile || {};
  const blocks = [];
  if (f.story) blocks.push(sanitizeInstitutionalText(f.story));
  else {
    blocks.push([
      `${f.name || 'Penda THIAW'} — ${f.role || 'Fondatrice et coordinatrice du projet'}.`,
      arr(f.highlights).map(sanitizeInstitutionalText).filter(Boolean).join(' '),
    ].filter(Boolean).join('\n\n'));
  }
  if (f.education) blocks.push(`Formation : ${sanitizeInstitutionalText(f.education)}`);
  if (f.experience) blocks.push(`Parcours professionnel :\n${sanitizeInstitutionalText(f.experience)}`);
  if (f.skills) blocks.push(`Compétences clés : ${sanitizeInstitutionalText(f.skills)}`);
  return blocks.filter(Boolean).join('\n\n') || PH.launching;
}

function buildProjectSection(profile) {
  const ps = profile.projectSummary || {};
  return sanitizeInstitutionalText([
    ps.pitch || ps.tagline,
    ps.location ? `Localisation : ${ps.location}.` : '',
    ps.legalStatus && ps.legalStatus !== 'À préciser'
      ? `Statut : ${ps.legalStatus}.`
      : 'Statut juridique en cours de formalisation.',
    arr(ps.activities).length
      ? `Activités cibles : ${arr(ps.activities).join(', ')}.`
      : '',
  ].filter(Boolean).join('\n\n'));
}

function buildActivitiesSection(profile) {
  const lines = arr(profile.activities).map((act) => {
    const detail = sanitizeInstitutionalText(act.detail || '')
      .replace(/suivi(s)? dans l'ERP/gi, 'en production')
      .replace(/sujet\(s\) suivis/gi, 'sujets');
    const status = act.status === 'actif' ? 'En activité' : 'Planifié';
    return `${act.label} (${status}) — ${detail || PH.afterStart}`;
  });
  return lines.length ? lines.join('\n\n') : PH.launching;
}

function buildMarketSection(profile) {
  const marche = whyCard(profile, 'marche');
  const diff = whyCard(profile, 'differentiation');
  const impact = whyCard(profile, 'impact');
  const parts = [];
  if (marche?.body) parts.push(sanitizeInstitutionalText(marche.body));
  if (diff?.body) parts.push(`Différenciation : ${sanitizeInstitutionalText(diff.body)}`);
  if (impact?.body) parts.push(`Impact attendu : ${sanitizeInstitutionalText(impact.body)}`);
  return parts.join('\n\n') || 'Marchés locaux en œufs, volaille et viande bovine — débouchés de proximité, restauration et revendeurs à consolider au démarrage.';
}

function buildFundingNeed(profile) {
  const seeking = profile.investorRoom?.seeking || {};
  const amount = formatFundingAmount(seeking.montant_recherche || profile.keyFigures?.besoin_bp);
  const types = arr(seeking.types).filter(Boolean);
  const parts = [];
  if (amount) parts.push(`Montant recherché : ${amount}.`);
  else parts.push('Montant à préciser selon le plan d\'investissement et les devis fournisseurs.');
  if (types.length) parts.push(`Types de partenaires visés : ${types.join(', ')}.`);
  if (seeking.priorite) parts.push(`Priorité : ${sanitizeInstitutionalText(seeking.priorite)}.`);
  if (seeking.calendrier) parts.push(`Calendrier : ${sanitizeInstitutionalText(seeking.calendrier)}.`);
  return parts.join('\n\n');
}

function buildFundUse(profile) {
  const seeking = profile.investorRoom?.seeking || {};
  if (seeking.utilisation_fonds) {
    return sanitizeInstitutionalText(seeking.utilisation_fonds);
  }
  const needs = arr(profile.needsSought).slice(0, 6).map((need) => {
    const detail = sanitizeInstitutionalText(need.detail || '').replace(/BP\s*:/gi, 'plan :');
    return `${need.label} : ${detail || 'À détailler par devis'}`;
  });
  if (needs.length) return needs.join('\n\n');
  return 'Cheptel avicole et bovin · infrastructures et équipements · intrants et alimentation · trésorerie de démarrage · frais de formalisation et accompagnement.';
}

function buildForecastsSection(profile) {
  const k = profile.keyFigures || {};
  const official = profile.official || HORIZON_FARM_OFFICIAL_BP;
  const rows = [];
  const caBp = formatFundingAmount(k.ca_bp_annuel || official.revenue?.annualTotal);
  const besoin = formatFundingAmount(k.besoin_bp || official.startupNeeds?.officialTotal);
  const resultAn1 = formatFundingAmount(k.resultat_bp_an1 || official.forecast?.resultByYear?.[0]);
  const caReel = formatFundingAmount(k.ca_erp);
  const encaissements = formatFundingAmount(k.encaissements);

  if (caBp) rows.push(`Chiffre d'affaires prévisionnel (année 1) : ${caBp}.`);
  if (resultAn1) rows.push(`Résultat net prévisionnel (année 1) : ${resultAn1}.`);
  if (besoin) rows.push(`Besoin total de financement structuré : ${besoin}.`);
  if (caReel) rows.push(`Chiffre d'affaires réalisé depuis le démarrage : ${caReel}.`);
  else if (!caReel && !encaissements) rows.push(`Activité commerciale : ${PH.afterStart}.`);
  if (encaissements) rows.push(`Encaissements enregistrés : ${encaissements}.`);

  const payroll = arr(official.payroll?.lines).reduce((s, r) => s + n(r.people), 0);
  const jobs = formatCount(profile.socialImpact?.emplois_prevus || payroll, { unit: 'emplois directs prévus' });
  if (jobs) rows.push(`Emplois : ${jobs}.`);

  return rows.length ? rows.join('\n\n') : PH.afterStart;
}

function buildImpactSection(profile) {
  const si = profile.socialImpact || {};
  const seeking = profile.investorRoom?.seeking || {};
  const parts = [];
  if (si.securite_alimentaire) parts.push(`Sécurité alimentaire : ${sanitizeInstitutionalText(si.securite_alimentaire)}.`);
  const jobs = formatCount(si.emplois_prevus, { unit: 'emplois directs prévus', feminine: true });
  if (jobs) parts.push(`Emploi local : ${jobs}.`);
  else parts.push(`Emploi local : ${PH.afterStart}.`);
  if (si.femmes_jeunes) parts.push(`Femmes et jeunes : ${sanitizeInstitutionalText(si.femmes_jeunes)}.`);
  if (si.community) parts.push(`Écosystème local : ${sanitizeInstitutionalText(si.community)}.`);
  if (seeking.impact_attendu) parts.push(`Impact attendu du financement : ${sanitizeInstitutionalText(seeking.impact_attendu)}.`);
  const formal = sanitizeInstitutionalText(si.formalisation || '')
    .replace(/\d+\s*preuve\(s\)[^.]*/gi, '')
    .replace(/\d+\s*BP[^.]*/gi, '');
  if (formal && !/\b0\b/.test(formal)) parts.push(formal);
  return parts.filter(Boolean).join('\n\n') || PH.launching;
}

function buildRisksSection(adapted) {
  const risks = arr(adapted.adaptedRisks);
  if (!risks.length) {
    return 'Santé animale, aléas climatiques et variation des prix des intrants — mesures : biosécurité, suivi vétérinaire, diversification des fournisseurs et gestion prudente de trésorerie.';
  }
  return risks.map((r) => {
    const label = sanitizeInstitutionalText(r.label);
    const mitigation = sanitizeInstitutionalText(r.mitigation || r.detail || 'Plan de mitigation documenté');
    return `${label}\nMesure prévue : ${mitigation}`;
  }).join('\n\n');
}

function buildConclusion(profile, adapted, audience) {
  const founder = profile.founderProfile?.name || 'la fondatrice';
  return sanitizeInstitutionalText([
    adapted.callToAction || `Horizon Farm invite ${audience.label?.toLowerCase() || 'le partenaire'} à étudier ce dossier et à organiser un échange avec ${founder}.`,
    'Le projet combine production agricole concrète, impact local mesurable et pilotage rigoureux des opérations.',
    'Les pièces complémentaires (devis, justificatifs, lettres de soutien) peuvent être transmises sur demande.',
  ].join(' '));
}

function buildAnnexesSection(profile) {
  const parts = [];
  const obj = profile.objectives || {};
  const objBlock = [
    obj.sixMonths ? `6 mois :\n${sanitizeInstitutionalText(obj.sixMonths)}` : '',
    obj.twelveMonths ? `12 mois :\n${sanitizeInstitutionalText(obj.twelveMonths)}` : '',
    obj.threeYears ? `3 ans :\n${sanitizeInstitutionalText(obj.threeYears)}` : '',
  ].filter(Boolean);
  if (objBlock.length) parts.push(`Objectifs\n\n${objBlock.join('\n\n')}`);

  const timeline = arr(profile.investorRoom?.timeline);
  if (timeline.length) {
    const lines = timeline.map((yearBlock) => {
      const items = arr(yearBlock.items).map((it) => `  · ${it.label}`).join('\n');
      return `${yearBlock.year}\n${items}`;
    });
    parts.push(`Feuille de route\n\n${lines.join('\n\n')}`);
  }

  const docs = formatCount(profile.keyFigures?.documents, { unit: 'justificatifs disponibles' });
  if (docs) parts.push(`Pièces complémentaires : ${docs}.`);
  parts.push('Documents types : devis fournisseurs, pièce d\'identité, statuts ou autorisation, photos du site, prévisionnel financier, lettres de soutien.');

  return parts.join('\n\n\n') || 'Annexes disponibles sur demande.';
}

/** Sections du dossier institutionnel (aperçu UI + PDF). */
export function buildFundingDossierSections(pack = {}) {
  const { profile = {}, adapted = {}, audience = {} } = pack;
  const seeking = profile.investorRoom?.seeking || {};

  return [
    { id: 'cover', title: 'Couverture', body: '' },
    { id: 'sommaire', title: 'Sommaire', body: '' },
    { id: 'executive', title: 'Résumé exécutif', body: buildExecutiveSummary(profile, adapted) },
    { id: 'founder', title: 'Présentation de la fondatrice', body: buildFounderSection(profile) },
    { id: 'project', title: 'Présentation du projet', body: buildProjectSection(profile) },
    { id: 'vision', title: 'Vision', body: sanitizeInstitutionalText(profile.projectSummary?.vision) || PH.launching },
    { id: 'mission', title: 'Mission', body: sanitizeInstitutionalText(profile.projectSummary?.mission) || PH.launching },
    { id: 'activities', title: 'Activités', body: buildActivitiesSection(profile) },
    { id: 'market', title: 'Opportunité de marché', body: buildMarketSection(profile) },
    { id: 'funding', title: 'Besoin de financement', body: buildFundingNeed(profile) },
    { id: 'use', title: 'Utilisation des fonds', body: buildFundUse(profile) },
    { id: 'forecasts', title: 'Prévisions', body: buildForecastsSection(profile) },
    { id: 'impact', title: 'Impact économique et social', body: buildImpactSection(profile) },
    { id: 'risks', title: 'Risques et mesures prévues', body: buildRisksSection(adapted) },
    { id: 'conclusion', title: 'Conclusion', body: buildConclusion(profile, adapted, audience) },
    { id: 'annexes', title: 'Annexes', body: buildAnnexesSection(profile) },
  ].map((s) => ({
    ...s,
    body: stripZeroAmounts(sanitizeInstitutionalText(clean(s.body))),
  }));
}

/** Retire les mentions de montants ou compteurs nuls. */
function stripZeroAmounts(text = '') {
  return String(text || '')
    .replace(/0\s*FCFA/gi, '')
    .replace(/0\s*document[s]?[^.\n]*/gi, '')
    .replace(/0\s*client[s]?[^.\n]*/gi, '')
    .replace(/:\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Sections condensées pour one-pager / fiche projet. */
function buildOnePagerSections(pack) {
  const all = buildFundingDossierSections(pack);
  const pickIds = ['executive', 'founder', 'project', 'market', 'funding', 'use', 'forecasts', 'impact', 'conclusion'];
  return all.filter((s) => pickIds.includes(s.id));
}

function pageSize(doc) {
  return { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
}

function fillWhite(doc) {
  const { w, h } = pageSize(doc);
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, w, h, 'F');
}

function setColor(doc, [r, g, b]) {
  doc.setTextColor(r, g, b);
}

function drawFooter(doc, packType, pageNum, totalPages) {
  const { w, h } = pageSize(doc);
  setColor(doc, COL.muted);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Horizon Farm — Dossier de financement — ${pageNum} / ${totalPages}`, w / 2, h - 10, { align: 'center' });
}

function drawHRule(doc, y) {
  const { w } = pageSize(doc);
  doc.setDrawColor(...COL.line);
  doc.setLineWidth(0.3);
  doc.line(18, y, w - 18, y);
}

function writeSectionBlock(doc, section, y, { numbered = true, maxWidth = 174 } = {}) {
  const { w, h } = pageSize(doc);
  const marginX = 18;
  let cursor = y;

  if (cursor > h - 35) {
    doc.addPage();
    fillWhite(doc);
    cursor = 22;
  }

  setColor(doc, COL.head);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const title = numbered && section.number ? `${section.number}. ${section.title}` : section.title;
  doc.text(title, marginX, cursor);
  cursor += 8;
  drawHRule(doc, cursor);
  cursor += 6;

  setColor(doc, COL.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(clean(section.body), maxWidth);
  for (const line of lines) {
    if (cursor > h - 22) {
      doc.addPage();
      fillWhite(doc);
      cursor = 22;
    }
    doc.text(line, marginX, cursor);
    cursor += 5;
  }
  return cursor + 8;
}

function buildCoverPage(doc, pack) {
  const { profile, packType, audience } = pack;
  fillWhite(doc);
  const { w, h } = pageSize(doc);
  const founder = profile.founderProfile?.name || 'Penda THIAW';
  const location = pick(profile.projectSummary?.location, 'Sénégal');
  const projectName = profile.projectSummary?.title || 'HORIZON FARM';

  drawHRule(doc, 28);
  setColor(doc, COL.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('DOSSIER DE FINANCEMENT', w / 2, 40, { align: 'center' });

  setColor(doc, COL.head);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text(String(projectName).toUpperCase(), w / 2, 58, { align: 'center' });

  setColor(doc, COL.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const subtitle = sanitizeInstitutionalText(
    profile.projectSummary?.pitch || profile.tagline || 'Entreprise agricole intégrée — aviculture, bovins et cultures',
  );
  const subLines = doc.splitTextToSize(subtitle, w - 50);
  let cursorY = 72 + subLines.length * 5;
  doc.text(subLines, w / 2, 72, { align: 'center' });
  cursorY += 10;
  setColor(doc, COL.muted);
  doc.setFontSize(10);
  doc.text(`Document : ${packType.label}`, w / 2, cursorY, { align: 'center' });
  cursorY += 6;
  doc.text(`Destinataire : ${audience.label}`, w / 2, cursorY, { align: 'center' });
  cursorY += 6;
  doc.text(`Porteuse : ${founder}`, w / 2, cursorY, { align: 'center' });
  cursorY += 6;
  doc.text(`Localisation : ${location}`, w / 2, cursorY, { align: 'center' });
  cursorY += 6;
  doc.text(`Date : ${today()}`, w / 2, cursorY, { align: 'center' });

  drawHRule(doc, h - 35);
  setColor(doc, COL.muted);
  doc.setFontSize(8);
  doc.text('Document confidentiel — usage institutionnel', w / 2, h - 28, { align: 'center' });
}

function buildTableOfContents(doc, sections) {
  doc.addPage();
  fillWhite(doc);
  let y = 28;
  setColor(doc, COL.head);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Sommaire', 18, y);
  y += 10;
  drawHRule(doc, y);
  y += 8;

  setColor(doc, COL.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  let num = 0;
  sections.forEach((section) => {
    if (!section.body && section.id !== 'sommaire') return;
    if (section.id === 'cover') return;
    num += 1;
    doc.text(`${num}. ${section.title}`, 22, y);
    y += 6;
  });
}

function buildBodyPages(doc, sections, packType) {
  const contentSections = sections
    .filter((s) => s.body && s.id !== 'cover' && s.id !== 'sommaire')
    .map((section, index) => ({ ...section, number: index + 1 }));

  doc.addPage();
  fillWhite(doc);
  let y = 22;
  contentSections.forEach((section) => {
    y = writeSectionBlock(doc, section, y, { numbered: true });
  });
}

/** Génère le PDF institutionnel complet. */
export function buildProfessionalFundingDossierPdf(pack = {}) {
  const packType = pack.packType || {};
  const isOnePager = ['one_pager', 'fiche_projet'].includes(packType.id);
  const sections = isOnePager ? buildOnePagerSections(pack) : buildFundingDossierSections(pack);

  const orientation = packType.format === 'landscape' ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  if (packType.id === 'pitch_deck') {
    return buildPitchDeckPdf(doc, pack, sections);
  }

  buildCoverPage(doc, pack);
  if (!isOnePager) {
    buildTableOfContents(doc, sections.filter((s) => s.id !== 'cover'));
    buildBodyPages(doc, sections, packType);
  } else {
    doc.addPage();
    fillWhite(doc);
    let y = 22;
    sections.forEach((section, index) => {
      y = writeSectionBlock(doc, { ...section, number: index + 1 }, y, { numbered: true });
    });
  }

  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    drawFooter(doc, packType, i, total);
  }

  const slug = (packType.id || 'dossier').replace(/_/g, '-');
  const filename = `${slug}-horizon-farm-${todayIso()}.pdf`;
  return { doc, filename };
}

function buildPitchDeckPdf(doc, pack, sections) {
  const slideSections = sections.filter((s) => s.body && !['annexes', 'risks'].includes(s.id)).slice(0, 8);
  slideSections.forEach((section, index) => {
    if (index > 0) doc.addPage();
    fillWhite(doc);
    const { w, h } = pageSize(doc);
    setColor(doc, COL.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Horizon Farm — ${index + 1} / ${slideSections.length}`, w - 18, 14, { align: 'right' });
    setColor(doc, COL.head);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(section.title, 20, 35);
    drawHRule(doc, 42);
    setColor(doc, COL.text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(clean(section.body), w - 40);
    doc.text(lines, 20, 52);
  });
  const slug = 'pitch-deck';
  return { doc, filename: `${slug}-horizon-farm-${todayIso()}.pdf` };
}

export default buildProfessionalFundingDossierPdf;
