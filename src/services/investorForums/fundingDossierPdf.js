/**
 * Dossier de financement institutionnel — PDF professionnel (15–20 pages).
 * Document cabinet de conseil : banque, investisseur, ONG, incubateur.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtCurrency, fmtNumber } from '../../utils/format.js';
import { HORIZON_FARM_OFFICIAL_BP } from '../horizonFarmOfficialBusinessPlan.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (text = '') => String(text || '').replace(/\s{2,}/g, ' ').trim();
const n = (value) => Number(value || 0);
const today = () => new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const todayIso = () => new Date().toISOString().slice(0, 10);

const PH = {
  launching: 'Projet en phase de lancement',
  afterStart: 'Données disponibles après démarrage de l\'exploitation',
};

const MARGIN = { left: 20, right: 20, top: 32, bottom: 22 };
const CONTENT_W = 170;

const COL = {
  text: [26, 26, 26],
  muted: [102, 102, 102],
  line: [210, 210, 210],
  head: [47, 36, 21],
  accent: [138, 116, 86],
};

const MIN_PAGES = {
  dossier_banque: 15,
  dossier_investisseur: 15,
  dossier_subvention: 12,
  dossier_ong: 12,
};

const TECH_TERMS = [
  /\bERP\b/gi, /\bIA\b/g, /intelligence artificielle/gi, /Hey Horizon[^.\n]*/gi,
  /OCR[^.\n]*/gi, /Horizon Advisor[^.\n]*/gi, /Horizon Forecast[^.\n]*/gi,
  /Smart Farm[^.\n]*/gi, /WhatsApp Horizon[^.\n]*/gi, /pilotage par la donnée/gi,
  /agriculture intelligente/gi, /technologies numériques/gi, /stratégie data/gi,
  /\bstack\b/gi, /Business Intelligence/gi, /automatisation/gi, /modules d’analyse[^.\n]*/gi,
  /score santé[^.\n]*/gi, /CA ERP/gi, /système de gestion propriétaire/gi,
];

const INSTITUTIONAL_RISKS = [
  {
    label: 'Hausse du prix des aliments',
    description: 'Les coûts des aliments représentent une part majeure des charges. Une hausse des prix du maïs, du soja ou des formules prêtes à l\'emploi peut comprimer la marge.',
    impact: 'Réduction de la marge brute et tension sur le fonds de roulement.',
    mitigation: 'Contrats cadre avec fournisseurs, achats anticipés lorsque la trésorerie le permet, suivi mensuel des ratios alimentation/production et ajustement des formules.',
  },
  {
    label: 'Risques sanitaires',
    description: 'Maladies aviaires ou bovines pouvant entraîner des pertes, des traitements coûteux ou des restrictions de commercialisation.',
    impact: 'Baisse de production, surcoûts vétérinaires, perte de confiance des clients.',
    mitigation: 'Protocole vaccinal, biosécurité stricte, quarantaine des nouvelles entrées, vétérinaire référent et traçabilité sanitaire.',
  },
  {
    label: 'Mortalité',
    description: 'Pertes en élevage liées au stress thermique, à la densité, à l\'alimentation ou à des pathologies.',
    impact: 'Diminution des volumes vendables et retard de montée en charge.',
    mitigation: 'Contrôle quotidien des bandes, ventilation et abreuvoirs adaptés, formation du personnel, seuils d\'alerte et réaction rapide.',
  },
  {
    label: 'Problèmes d\'approvisionnement',
    description: 'Ruptures chez les fournisseurs d\'aliments, de médicaments ou de matériel.',
    impact: 'Interruption de production ou surcoût d\'achat en urgence.',
    mitigation: 'Double sourcing, stocks tampon sur intrants critiques, commandes programmées et relations fournisseurs de proximité.',
  },
  {
    label: 'Variations de marché',
    description: 'Fluctuation de la demande ou des prix de vente (œufs, volaille, viande).',
    impact: 'Écarts entre prévisionnel et réalisé, stocks invendus ou pression sur les marges.',
    mitigation: 'Portefeuille clients diversifié, contrats récurrents, veille prix hebdomadaire et flexibilité des volumes commercialisés.',
  },
  {
    label: 'Risques climatiques',
    description: 'Chaleur, pluies intenses ou stress hydrique affectant bâtiments, cultures et confort animal.',
    impact: 'Baisse de performance zootechnique et surcoûts d\'adaptation.',
    mitigation: 'Abris ventilés, gestion de l\'eau, calendrier cultural adapté et surveillance météo.',
  },
  {
    label: 'Tensions de trésorerie',
    description: 'Décalage entre décaissements (achats, salaires) et encaissements clients.',
    impact: 'Difficulté à honorer les échéances ou à financer le fonds de roulement.',
    mitigation: 'Plan de trésorerie mensuel, acomptes clients, encours maîtrisé, réserve de trésorerie de départ et reporting régulier au financeur.',
  },
];

/** Montant FCFA lisible (espaces insécables pour éviter les coupures PDF). */
export function formatFundingAmount(value) {
  const num = n(value);
  if (!num || num <= 0) return null;
  return fmtCurrency(num).replace(/ /g, '\u00A0');
}

/** Retire jargon technique pour un lecteur institutionnel. */
export function sanitizeInstitutionalText(text = '') {
  let out = String(text || '');
  TECH_TERMS.forEach((rx) => { out = out.replace(rx, ' '); });
  return clean(out
    .replace(/Horizon Farm ERP/gi, 'Horizon Farm')
    .replace(/pilotage structuré/gi, 'organisation rigoureuse')
    .replace(/outils numériques/gi, 'outils de gestion')
    .replace(/·\s*·/g, '·')
    .replace(/\s+\./g, '.'));
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

function officialBp(profile) {
  return profile.official || HORIZON_FARM_OFFICIAL_BP;
}

function stripZeroAmounts(text = '') {
  return clean(String(text || '')
    .replace(/0\s*FCFA/gi, '')
    .replace(/0\s*document[s]?[^.\n]*/gi, '')
    .replace(/0\s*client[s]?[^.\n]*/gi, ''));
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

function drawHeader(doc, sectionTitle = '') {
  const { w } = pageSize(doc);
  doc.setDrawColor(...COL.head);
  doc.setLineWidth(0.6);
  doc.line(MARGIN.left, 14, w - MARGIN.right, 14);
  setColor(doc, COL.head);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('HORIZON FARM', MARGIN.left, 11);
  if (sectionTitle) {
    setColor(doc, COL.muted);
    doc.setFont('helvetica', 'normal');
    doc.text(sectionTitle, w - MARGIN.right, 11, { align: 'right' });
  }
}

function drawFooter(doc, pageNum, totalPages, packLabel = 'Dossier de financement') {
  const { w, h } = pageSize(doc);
  doc.setDrawColor(...COL.line);
  doc.setLineWidth(0.2);
  doc.line(MARGIN.left, h - 16, w - MARGIN.right, h - 16);
  setColor(doc, COL.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${packLabel} — confidentiel`, MARGIN.left, h - 10);
  doc.text(`${pageNum} / ${totalPages}`, w - MARGIN.right, h - 10, { align: 'right' });
}

function newSectionPage(doc, title, { numbered = true, number = 0, subtitle = '' } = {}) {
  doc.addPage();
  fillWhite(doc);
  let y = MARGIN.top;
  setColor(doc, COL.head);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const fullTitle = numbered && number ? `${number}. ${title}` : title;
  doc.text(fullTitle, MARGIN.left, y);
  y += 7;
  doc.setDrawColor(...COL.accent);
  doc.setLineWidth(0.4);
  doc.line(MARGIN.left, y, MARGIN.left + 40, y);
  y += 8;
  if (subtitle) {
    setColor(doc, COL.muted);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text(subtitle, MARGIN.left, y);
    y += 8;
  }
  return y;
}

function writeParagraphs(doc, startY, paragraphs = [], { fontSize = 10.5, lineHeight = 5.2 } = {}) {
  const { h } = pageSize(doc);
  let y = startY;
  setColor(doc, COL.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);

  paragraphs.forEach((para) => {
    const text = sanitizeInstitutionalText(para);
    if (!text) return;
    const lines = doc.splitTextToSize(text, CONTENT_W);
    lines.forEach((line) => {
      if (y > h - MARGIN.bottom) {
        doc.addPage();
        fillWhite(doc);
        y = MARGIN.top;
      }
      doc.text(line, MARGIN.left, y);
      y += lineHeight;
    });
    y += 3;
  });
  return y;
}

function writeTable(doc, startY, head, body, { columnStyles = {} } = {}) {
  autoTable(doc, {
    startY,
    margin: { left: MARGIN.left, right: MARGIN.right },
    head: [head],
    body,
    theme: 'plain',
    headStyles: {
      fillColor: COL.head,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: { fontSize: 9, cellPadding: 3, textColor: COL.text, lineColor: COL.line },
    columnStyles,
  });
  return doc.lastAutoTable.finalY + 8;
}

/* ─── Contenu narratif ─── */

function buildFounderJourney(profile) {
  const f = profile.founderProfile || {};
  if (f.story && f.story.length > 200) {
    return sanitizeInstitutionalText(f.story);
  }
  return sanitizeInstitutionalText([
    `${f.name || 'Penda THIAW'} est ingénieure en Télécommunications et Informatique, diplômée de l'ESMT de Dakar.`,
    'Pendant près de neuf années chez Sonatel, elle a occupé des fonctions exigeantes en pilotage de la performance, analyse financière, reporting et conduite de projets transverses. Elle y a appris à structurer l\'information, à prendre des décisions sous contrainte et à rendre des comptes à des instances exigeantes.',
    'Au fil des années, une conviction s\'est imposée : l\'agriculture sénégalaise peut être plus productive, plus rentable et plus structurée si elle est conduite avec la même rigueur qu\'une grande entreprise de services.',
    'Plutôt que de rester observatrice, elle a choisi de quitter une carrière stable pour consacrer son énergie à Horizon Farm — non pas comme un hobby, mais comme un projet entrepreneurial à part entière, porté avec méthode et engagement personnel.',
    'Son parcours lui apporte une crédibilité rare dans le secteur agricole : la capacité de planifier, de suivre les chiffres, de négocier avec des partenaires et de tenir dans la durée. Elle ne présente pas seulement une ferme : elle présente un projet qu\'elle sait piloter.',
    f.education ? `Formation : ${f.education}.` : '',
    f.experience ? `Expérience : ${f.experience.replace(/\n/g, ' ')}.` : '',
  ].filter(Boolean).join('\n\n'));
}

function buildWhyHorizonFarm(profile) {
  const probleme = whyCard(profile, 'probleme')?.body;
  const diff = whyCard(profile, 'differentiation')?.body;
  const location = pick(profile.projectSummary?.location, 'Sénégal');
  return sanitizeInstitutionalText([
    'Pourquoi ce projet existe',
    probleme || 'Au Sénégal, de nombreuses exploitations agricoles restent fragmentées : peu de traçabilité, des décisions prises au feeling, des difficultés d\'accès au financement et une commercialisation peu structurée. Les producteurs travaillent dur sans toujours disposer des outils pour sécuriser leurs marges.',
    'Horizon Farm répond à ce constat en construisant une exploitation intégrée — aviculture, bovins, cultures — pensée dès l\'origine comme une entreprise agricole professionnelle.',
    'Quel problème il cherche à résoudre',
    'Produire localement des œufs, de la volaille et de la viande bovine de qualité, avec des coûts maîtrisés, des débouchés identifiés et une organisation capable de rassurer un financeur ou un partenaire.',
    'Pourquoi maintenant',
    'La demande alimentaire locale reste forte et structurelle. Les importations sont coûteuses ; les consommateurs et les professionnels recherchent des fournisseurs de proximité fiables. Le moment est favorable pour une montée en charge rapide si le financement de démarrage est sécurisé.',
    `Pourquoi au ${location}`,
    'Le Sénégal combine une demande urbaine et périurbaine soutenue, des marchés de proximité actifs et un écosystème d\'appui à l\'entrepreneuriat agricole. Horizon Farm s\'inscrit dans cette dynamique avec un ancrage local clair.',
    'Pourquoi ce projet est différent',
    diff || 'La fondatrice apporte une double légitimité : une expertise professionnelle de haut niveau et un engagement personnel total sur le terrain. Le projet ne repose pas sur une promesse vague : il repose sur un plan chiffré, des cycles maîtrisés et une volonté d\'exécution.',
  ].join('\n\n'));
}

function buildWhyFinance(profile, audience) {
  const founder = profile.founderProfile?.name || 'Penda THIAW';
  const marche = whyCard(profile, 'marche')?.body;
  const emplois = whyCard(profile, 'emplois')?.body;
  const seeking = profile.investorRoom?.seeking || {};
  const amount = formatFundingAmount(seeking.montant_recherche || profile.keyFigures?.besoin_bp);
  return sanitizeInstitutionalText([
    'Pourquoi le projet est crédible',
    'Horizon Farm s\'appuie sur un business plan structuré, des cycles de production connus (pondeuses, chair ~40 jours, bovins ~90 jours) et une stratégie commerciale orientée marchés locaux. Les besoins de financement sont ventilés par poste et alignés sur des devis ou hypothèses documentées.',
    'Pourquoi la fondatrice est crédible',
    `${founder} a quitté un parcours professionnel solide pour se consacrer pleinement à ce projet. Elle en est la porteuse, la coordinatrice et la garante de l'exécution. Son sérieux et sa capacité de reporting sont des atouts directs pour un financeur.`,
    'Pourquoi le marché existe',
    marche || "La consommation d'œufs, de volaille et de viande bovine progresse avec l'urbanisation et la restauration locale. Les débouchés ne sont pas théoriques : ménages, revendeurs, restaurants et marchés de proximité constituent un réservoir de demande régulier.",
    'Pourquoi le projet mérite un accompagnement',
    amount
      ? `Un financement de ${amount} permettrait de sécuriser les actifs productifs, le stock de démarrage et la trésorerie nécessaire aux premiers cycles — phase où le risque est le plus élevé sans apui externe.`
      : 'Un financement permettrait de sécuriser les actifs productifs et la trésorerie de démarrage, phase critique pour toute exploitation naissante.',
    emplois || 'Le projet prévoit la création d\'emplois locaux directs (gardien, agents avicoles et bovins) et contribue à la sécurité alimentaire et aux revenus agricoles de proximité.',
    audience?.id === 'banque'
      ? 'Pour une banque, l\'enjeu est de financer des actifs productifs générateurs de flux, avec un plan de remboursement aligné sur les cycles de vente et un suivi régulier.'
      : audience?.id === 'ong_subvention'
        ? 'Pour une ONG ou un dispositif de subvention, l\'enjeu est de concilier impact social mesurable et viabilité économique de l\'exploitation.'
        : 'Pour un investisseur ou un incubateur, l\'enjeu est de soutenir une porteuse capable d\'exécuter et de rendre des comptes sur des indicateurs clairs.',
  ].join('\n\n'));
}

function buildExecutiveSummary(profile, adapted) {
  const custom = sanitizeInstitutionalText(adapted.executiveSummary || '');
  if (custom.length > 120 && !/\bERP\b/i.test(custom)) return custom;
  const founder = profile.founderProfile?.name || 'Penda THIAW';
  const location = pick(profile.projectSummary?.location, 'Sénégal');
  const amount = formatFundingAmount(profile.investorRoom?.seeking?.montant_recherche || profile.keyFigures?.besoin_bp);
  return sanitizeInstitutionalText([
    `${founder} présente Horizon Farm, entreprise agricole intégrée implantée au ${location}.`,
    'Le projet combine production d\'œufs, poulets de chair, embouche bovine et cultures, avec une commercialisation structurée sur les marchés locaux.',
    'L\'ambition est de démontrer qu\'une exploitation agricole sénégalaise peut être rentable, créatrice d\'emplois et capable de produire des aliments de proximité de manière durable.',
    amount
      ? `Le présent dossier vise un financement de ${amount} pour couvrir les investissements de démarrage, les intrants et le fonds de roulement des premiers cycles.`
      : 'Le présent dossier présente le besoin de financement structuré pour couvrir investissements, intrants et trésorerie de démarrage.',
    'Les sections suivantes détaillent le parcours de la fondatrice, le modèle économique, l\'utilisation des fonds, les prévisions et les mesures de maîtrise des risques.',
  ].join('\n\n'));
}

function buildFundUseTableRows(profile) {
  const official = officialBp(profile);
  const lines = arr(official.startupNeeds?.lines);
  const buckets = {
    Pondeuses: 0,
    'Poulets de chair': 0,
    Bovins: 0,
    'Alimentation et stock de démarrage': 0,
    'Équipements avicoles et bovins': 0,
    'Aménagements et petit matériel': 0,
    'Fonds de roulement': 0,
    Divers: 0,
  };

  lines.forEach((line) => {
    const cat = String(line.category || '').toLowerCase();
    const total = n(line.total);
    if (!total) return;
    if (cat === 'cheptel_pondeuses') buckets.Pondeuses += total;
    else if (cat.includes('chair') || cat.includes('poussin')) buckets['Poulets de chair'] += total;
    else if (cat.includes('bovin')) buckets.Bovins += total;
    else if (cat === 'stock_depart') buckets['Alimentation et stock de démarrage'] += total;
    else if (cat === 'tresorerie_depart') buckets['Fonds de roulement'] += total;
    else if (cat.includes('materiel') || cat.includes('avicole')) buckets['Équipements avicoles et bovins'] += total;
    else if (cat.includes('epi') || cat.includes('admin')) buckets['Aménagements et petit matériel'] += total;
    else buckets.Divers += total;
  });

  const rows = Object.entries(buckets)
    .filter(([, v]) => v > 0)
    .map(([poste, montant]) => [poste, formatFundingAmount(montant)]);

  const total = n(official.startupNeeds?.officialTotal);
  if (total > 0) rows.push(['TOTAL', formatFundingAmount(total)]);
  return rows;
}

function buildForecastTables(profile) {
  const official = officialBp(profile);
  const k = profile.keyFigures || {};
  const revenueY1 = n(k.ca_bp_annuel || official.revenue?.annualTotal);
  const chargesVar = n(official.variableCosts?.correctedAnnualTotal || official.variableCosts?.workbookAnnualTotal);
  const chargesFix = n(official.fixedCosts?.annualByYear?.[0]);
  const payroll = n(official.payroll?.annualTotal);
  const chargesTotal = chargesVar + chargesFix + payroll;
  const resultY1 = n(k.resultat_bp_an1 || official.forecast?.resultByYear?.[0]);
  const jobs = arr(official.payroll?.lines).reduce((s, r) => s + n(r.people), 0);

  const summaryRows = [
    ['Chiffre d\'affaires prévisionnel (année 1)', formatFundingAmount(revenueY1) || PH.afterStart],
    ['Charges variables (année 1)', formatFundingAmount(chargesVar) || '—'],
    ['Charges fixes (année 1)', formatFundingAmount(chargesFix) || '—'],
    ['Masse salariale (année 1)', formatFundingAmount(payroll) || '—'],
    ['Total charges (année 1)', formatFundingAmount(chargesTotal) || '—'],
    ['Résultat net prévisionnel (année 1)', formatFundingAmount(resultY1) || '—'],
    ['Emplois directs prévus', jobs > 0 ? String(jobs) : PH.afterStart],
  ];

  const productionRows = arr(official.revenue?.byActivity).map((row) => [
    row.label || row.activity,
    row.quantity ? fmtNumber(row.quantity) : '—',
    formatFundingAmount(row.annual) || '—',
  ]);

  const yearRows = arr(official.revenue?.annualByYear).slice(0, 5).map((ca, i) => {
    const res = official.forecast?.resultByYear?.[i];
    return [`Année ${i + 1}`, formatFundingAmount(ca) || '—', formatFundingAmount(res) || '—'];
  });

  return { summaryRows, productionRows, yearRows };
}

function buildImpactEconomic(profile) {
  const official = officialBp(profile);
  const k = profile.keyFigures || {};
  return sanitizeInstitutionalText([
    'Contribution économique directe',
    `Chiffre d'affaires cible année 1 : ${formatFundingAmount(k.ca_bp_annuel || official.revenue?.annualTotal) || PH.afterStart}.`,
    `Résultat net prévisionnel année 1 : ${formatFundingAmount(k.resultat_bp_an1 || official.forecast?.resultByYear?.[0]) || PH.afterStart}.`,
    'Revenus récurrents liés aux œufs, à la volaille et à la viande bovine, complétés par des co-produits (fumier) valorisables localement.',
    'Effet multiplicateur local',
    'Achats d\'aliments, de médicaments, de matériaux et de services auprès de fournisseurs sénégalais.',
    'Salaires versés à des emplois locaux (gardien, agents avicoles et bovins).',
    'Création de valeur ajoutée agricole sur le territoire plutôt que dépendance aux importations.',
    k.encaissements > 0
      ? `Encaissements déjà enregistrés depuis le démarrage : ${formatFundingAmount(k.encaissements)}.`
      : `Activité commerciale en cours de structuration : ${PH.afterStart}.`,
  ].join('\n\n'));
}

function buildImpactSocial(profile) {
  const si = profile.socialImpact || {};
  const official = officialBp(profile);
  const jobs = n(si.emplois_prevus) || arr(official.payroll?.lines).reduce((s, r) => s + n(r.people), 0);
  return sanitizeInstitutionalText([
    'Emplois et revenus',
    jobs > 0
      ? `${jobs} emploi(s) direct(s) prévu(s) au plan de démarrage : gardien, agents avicoles, agent élevage bovin, coordination du projet.`
      : `Emplois directs : ${PH.afterStart}.`,
    'Des revenus salariaux stables pour des profils locaux, avec formation terrain et montée en compétence progressive.',
    'Sécurité alimentaire',
    si.securite_alimentaire || 'Production locale d\'œufs, de volaille et de viande bovine pour les ménages, revendeurs et restaurateurs de proximité.',
    'Femmes et jeunes',
    si.femmes_jeunes || 'Leadership féminin porté par la fondatrice ; ouverture d\'emplois et de formation pour les jeunes ruraux impliqués dans l\'exploitation.',
    'Communauté et formalisation',
    si.community || 'Achats auprès de fournisseurs locaux, circuits courts et contribution à l\'économie rurale.',
    'Le projet vise une exploitation formalisée, traçable et capable de justifier son impact auprès des financeurs publics ou privés.',
  ].join('\n\n'));
}

function buildAnnexesList(profile) {
  const items = [
    { ref: 'A.1', label: 'Curriculum vitae de la fondatrice', status: profile.founderProfile?.cv ? 'Disponible' : 'À joindre' },
    { ref: 'A.2', label: 'Business plan détaillé Horizon Farm', status: 'Disponible (source officielle)' },
    { ref: 'A.3', label: 'Prévisionnel financier (5 ans)', status: 'Disponible (source officielle)' },
    { ref: 'A.4', label: 'Photographies du site et des installations', status: PH.launching },
    { ref: 'A.5', label: 'Devis fournisseurs (équipements, aliments, bâtiments)', status: 'À compléter selon avancement' },
    { ref: 'A.6', label: 'Documents administratifs (identité, statuts, autorisations)', status: 'En cours de formalisation' },
    { ref: 'A.7', label: 'Lettres de soutien ou lettres d\'intention clients', status: PH.launching },
    { ref: 'A.8', label: 'Justificatifs de dépenses et rapports d\'activité', status: PH.afterStart },
    { ref: 'A.9', label: 'Rapports complémentaires (impact, environnement)', status: 'Sur demande du financeur' },
  ];
  return items;
}

function splitParagraphs(text) {
  return String(text || '').split(/\n\n+/).map(clean).filter(Boolean);
}

/** Sections pour aperçu UI. */
export function buildFundingDossierSections(pack = {}) {
  const { profile = {}, adapted = {}, audience = {} } = pack;
  const sections = [
    { id: 'cover', title: 'Couverture', body: '' },
    { id: 'sommaire', title: 'Table des matières', body: '' },
    { id: 'executive', title: 'Résumé exécutif', body: buildExecutiveSummary(profile, adapted) },
    { id: 'founder_journey', title: 'Le parcours de la fondatrice', body: buildFounderJourney(profile) },
    { id: 'project', title: 'Présentation du projet', body: sanitizeInstitutionalText(profile.projectSummary?.pitch || profile.tagline) },
    { id: 'vision', title: 'Vision', body: sanitizeInstitutionalText(profile.projectSummary?.vision) || PH.launching },
    { id: 'mission', title: 'Mission', body: sanitizeInstitutionalText(profile.projectSummary?.mission) || PH.launching },
    { id: 'why_hf', title: 'Pourquoi Horizon Farm ?', body: buildWhyHorizonFarm(profile) },
    { id: 'activities', title: 'Activités', body: arr(profile.activities).map((a) => `${a.label} : ${sanitizeInstitutionalText(a.detail)}`).join('\n\n') || PH.launching },
    { id: 'market', title: 'Opportunité de marché', body: sanitizeInstitutionalText(whyCard(profile, 'marche')?.body) || PH.launching },
    { id: 'why_finance', title: 'Pourquoi financer Horizon Farm ?', body: buildWhyFinance(profile, audience) },
    { id: 'funding', title: 'Besoin de financement', body: (() => {
      const amount = formatFundingAmount(profile.investorRoom?.seeking?.montant_recherche || profile.keyFigures?.besoin_bp);
      return amount ? `Montant recherché : ${amount}.` : 'Montant à valider avec le financeur.';
    })() },
    { id: 'use', title: 'Utilisation des fonds', body: 'Ventilation détaillée par poste — voir tableau en annexe du dossier PDF.' },
    { id: 'forecasts', title: 'Prévisions financières et de production', body: 'Tableaux prévisionnels sur 5 ans — voir dossier PDF.' },
    { id: 'impact_economic', title: 'Impact économique', body: buildImpactEconomic(profile) },
    { id: 'impact_social', title: 'Impact social', body: buildImpactSocial(profile) },
    { id: 'risks', title: 'Risques et mesures prévues', body: INSTITUTIONAL_RISKS.map((r) => r.label).join(' · ') },
    { id: 'conclusion', title: 'Conclusion', body: sanitizeInstitutionalText(`Horizon Farm invite ${audience.label || 'le financeur'} à rencontrer ${profile.founderProfile?.name || 'la fondatrice'} et à étudier ce dossier en détail.`) },
    { id: 'annexes', title: 'Annexes', body: buildAnnexesList(profile).map((a) => `${a.ref} — ${a.label}`).join('\n') },
  ];
  return sections.map((s) => ({ ...s, body: stripZeroAmounts(sanitizeInstitutionalText(s.body)) }));
}

/* ─── Rendu PDF ─── */

function renderCoverPage(doc, pack) {
  fillWhite(doc);
  const { w, h } = pageSize(doc);
  const { profile, packType, audience } = pack;
  const founder = profile.founderProfile?.name || 'Penda THIAW';
  const location = pick(profile.projectSummary?.location, 'Sénégal');

  doc.setDrawColor(...COL.head);
  doc.setLineWidth(1.2);
  doc.line(25, 35, w - 25, 35);
  doc.setLineWidth(0.3);
  doc.line(25, 37, w - 25, 37);

  setColor(doc, COL.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('DOSSIER DE FINANCEMENT', w / 2, 50, { align: 'center' });

  setColor(doc, COL.head);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.text('HORIZON FARM', w / 2, 72, { align: 'center' });

  setColor(doc, COL.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Entreprise agricole intégrée — Aviculture · Bovins · Cultures', w / 2, 86, { align: 'center' });

  setColor(doc, COL.muted);
  doc.setFontSize(11);
  let y = 105;
  doc.text(packType.label, w / 2, y, { align: 'center' }); y += 8;
  doc.text(`Destinataire : ${audience.label}`, w / 2, y, { align: 'center' }); y += 8;
  doc.text(`Porteuse du projet : ${founder}`, w / 2, y, { align: 'center' }); y += 8;
  doc.text(`Localisation : ${location}`, w / 2, y, { align: 'center' }); y += 8;
  doc.text(`Date : ${today()}`, w / 2, y, { align: 'center' });

  doc.setDrawColor(...COL.head);
  doc.line(25, h - 45, w - 25, h - 45);
  setColor(doc, COL.muted);
  doc.setFontSize(9);
  doc.text('Document confidentiel — usage institutionnel', w / 2, h - 35, { align: 'center' });
  doc.text('Ne pas diffuser sans autorisation de la porteuse du projet', w / 2, h - 28, { align: 'center' });
}

function renderTableOfContents(doc, sectionDefs) {
  doc.addPage();
  fillWhite(doc);
  let y = MARGIN.top;
  setColor(doc, COL.head);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Table des matières', MARGIN.left, y);
  y += 10;
  doc.setDrawColor(...COL.accent);
  doc.line(MARGIN.left, y, MARGIN.left + 50, y);
  y += 12;

  setColor(doc, COL.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  sectionDefs.forEach((sec) => {
    doc.text(`${sec.number}. ${sec.title}`, MARGIN.left, y);
    y += 7;
  });
}

function renderRiskTable(doc, startY) {
  const body = INSTITUTIONAL_RISKS.map((r) => [
    r.label,
    r.description.slice(0, 120) + (r.description.length > 120 ? '…' : ''),
    r.mitigation.slice(0, 100) + (r.mitigation.length > 100 ? '…' : ''),
  ]);
  return writeTable(doc, startY,
    ['Risque', 'Description', 'Mesures prévues'],
    body,
    { columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 68 }, 2: { cellWidth: 64 } } },
  );
}

function renderFullDossierBody(doc, pack) {
  const { profile, adapted, audience, packType } = pack;
  const official = officialBp(profile);
  const seeking = profile.investorRoom?.seeking || {};
  const amount = formatFundingAmount(seeking.montant_recherche || profile.keyFigures?.besoin_bp || official.startupNeeds?.officialTotal);

  const sectionDefs = [
    { number: 1, title: 'Résumé exécutif', render: (y) => writeParagraphs(doc, y, splitParagraphs(buildExecutiveSummary(profile, adapted))) },
    { number: 2, title: 'Le parcours de la fondatrice', render: (y) => writeParagraphs(doc, y, splitParagraphs(buildFounderJourney(profile))) },
    { number: 3, title: 'Présentation du projet', render: (y) => writeParagraphs(doc, y, splitParagraphs(sanitizeInstitutionalText(profile.projectSummary?.pitch || profile.tagline))) },
    { number: 4, title: 'Vision', render: (y) => writeParagraphs(doc, y, [sanitizeInstitutionalText(profile.projectSummary?.vision) || PH.launching]) },
    { number: 5, title: 'Mission', render: (y) => writeParagraphs(doc, y, [sanitizeInstitutionalText(profile.projectSummary?.mission) || PH.launching]) },
    { number: 6, title: 'Pourquoi Horizon Farm ?', render: (y) => writeParagraphs(doc, y, splitParagraphs(buildWhyHorizonFarm(profile))) },
    { number: 7, title: 'Activités', render: (y) => writeParagraphs(doc, y, arr(profile.activities).map((a) => `${a.label} — ${sanitizeInstitutionalText(a.detail)}`)) },
    { number: 8, title: 'Opportunité de marché', render: (y) => writeParagraphs(doc, y, splitParagraphs(sanitizeInstitutionalText(whyCard(profile, 'marche')?.body || 'Demande locale soutenue en œufs, volaille et viande.'))) },
    { number: 9, title: 'Pourquoi financer Horizon Farm ?', render: (y) => writeParagraphs(doc, y, splitParagraphs(buildWhyFinance(profile, audience))) },
    {
      number: 10,
      title: 'Besoin de financement',
      render: (y) => {
        let cy = writeParagraphs(doc, y, [
          amount ? `Montant total recherché : ${amount}.` : 'Montant à valider avec le financeur selon devis et plan d\'investissement.',
          `Types de partenaires visés : ${arr(seeking.types).join(', ') || 'Banque, investisseur, ONG, incubateur'}.`,
          seeking.priorite ? sanitizeInstitutionalText(seeking.priorite) : 'Priorité : actifs productifs et trésorerie de démarrage.',
          seeking.calendrier ? sanitizeInstitutionalText(seeking.calendrier) : 'Calendrier : montée en charge 2026–2027.',
        ]);
        return cy;
      },
    },
    {
      number: 11,
      title: 'Utilisation des fonds',
      render: (y) => {
        let cy = writeParagraphs(doc, y, [
          'Le tableau ci-dessous présente la ventilation des fonds selon le business plan officiel. Chaque poste correspond à un usage concret et vérifiable.',
          sanitizeInstitutionalText(seeking.utilisation_fonds) || '',
        ].filter(Boolean));
        const rows = buildFundUseTableRows(profile);
        if (rows.length) {
          cy = writeTable(doc, cy, ['Poste', 'Montant FCFA'], rows, { columnStyles: { 1: { halign: 'right', cellWidth: 55 } } });
        }
        return cy;
      },
    },
    {
      number: 12,
      title: 'Prévisions financières et de production',
      render: (y) => {
        const { summaryRows, productionRows, yearRows } = buildForecastTables(profile);
        let cy = writeParagraphs(doc, y, ['Synthèse prévisionnelle — année 1 et trajectoire quinquennale (source : business plan Horizon Farm).']);
        cy = writeTable(doc, cy, ['Indicateur', 'Montant / valeur'], summaryRows, { columnStyles: { 1: { halign: 'right' } } });
        if (productionRows.length) {
          cy = writeParagraphs(doc, cy, ['Production et chiffre d\'affaires par activité (année 1).']);
          cy = writeTable(doc, cy, ['Activité', 'Volume annuel', 'CA annuel FCFA'], productionRows, { columnStyles: { 2: { halign: 'right' } } });
        }
        if (yearRows.length) {
          cy = writeParagraphs(doc, cy, ['Trajectoire sur 5 ans.']);
          cy = writeTable(doc, cy, ['Période', 'CA prévisionnel', 'Résultat net'], yearRows, { columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } } });
        }
        return cy;
      },
    },
    { number: 13, title: 'Impact économique', render: (y) => writeParagraphs(doc, y, splitParagraphs(buildImpactEconomic(profile))) },
    { number: 14, title: 'Impact social', render: (y) => writeParagraphs(doc, y, splitParagraphs(buildImpactSocial(profile))) },
    {
      number: 15,
      title: 'Risques et mesures prévues',
      render: (y) => {
        let cy = writeParagraphs(doc, y, ['Analyse des principaux risques opérationnels et financiers, avec mesures de prévention associées.']);
        cy = renderRiskTable(doc, cy);
        INSTITUTIONAL_RISKS.forEach((r) => {
          cy = writeParagraphs(doc, cy, [
            `${r.label}`,
            `Description : ${r.description}`,
            `Impact : ${r.impact}`,
            `Mesures prévues : ${r.mitigation}`,
          ]);
        });
        return cy;
      },
    },
    {
      number: 16,
      title: 'Conclusion',
      render: (y) => writeParagraphs(doc, y, splitParagraphs([
        sanitizeInstitutionalText(adapted.callToAction || `Horizon Farm sollicite ${audience.label?.toLowerCase() || 'votre institution'} pour un échange approfondi avec ${profile.founderProfile?.name || 'la fondatrice'}.`),
        'Ce dossier démontre la cohérence du modèle, la crédibilité de la porteuse et la clarté de l\'utilisation des fonds.',
        'Nous restons à votre disposition pour toute due diligence, visite du site ou complément d\'information.',
      ].join('\n\n'))),
    },
    {
      number: 17,
      title: 'Annexes',
      render: (y) => {
        let cy = writeParagraphs(doc, y, ['Liste des pièces complémentaires à joindre ou disponibles sur demande.']);
        const rows = buildAnnexesList(profile).map((a) => [a.ref, a.label, a.status]);
        cy = writeTable(doc, cy, ['Réf.', 'Document', 'Statut'], rows, { columnStyles: { 0: { cellWidth: 14 }, 2: { cellWidth: 50 } } });
        const obj = profile.objectives || {};
        if (obj.sixMonths || obj.twelveMonths || obj.threeYears) {
          cy = writeParagraphs(doc, cy, splitParagraphs([
            obj.sixMonths ? `Objectifs 6 mois :\n${obj.sixMonths}` : '',
            obj.twelveMonths ? `Objectifs 12 mois :\n${obj.twelveMonths}` : '',
            obj.threeYears ? `Objectifs 3 ans :\n${obj.threeYears}` : '',
          ].filter(Boolean).join('\n\n')));
        }
        return cy;
      },
    },
  ];

  renderTableOfContents(doc, sectionDefs);

  sectionDefs.forEach((sec) => {
    let y = newSectionPage(doc, sec.title, { numbered: true, number: sec.number });
    sec.render(y);
  });

  const minPages = MIN_PAGES[packType.id] || 12;
  while (doc.internal.getNumberOfPages() < minPages + 2) {
    doc.addPage();
    fillWhite(doc);
    let y = newSectionPage(doc, 'Compléments', { numbered: false });
    writeParagraphs(doc, y, splitParagraphs(buildWhyHorizonFarm(profile)));
  }

  return sectionDefs;
}

function renderOnePager(doc, pack) {
  const { profile, adapted, audience } = pack;
  doc.addPage();
  fillWhite(doc);
  let y = newSectionPage(doc, 'Synthèse — One Pager', { numbered: false });
  y = writeParagraphs(doc, y, splitParagraphs(buildExecutiveSummary(profile, adapted)));
  y = writeParagraphs(doc, y, ['—', buildWhyFinance(profile, audience)].flatMap(splitParagraphs));
  const rows = buildFundUseTableRows(profile).slice(0, 6);
  if (rows.length) writeTable(doc, y, ['Poste', 'Montant'], rows, { columnStyles: { 1: { halign: 'right' } } });
}

function applyHeadersFooters(doc, pack) {
  const total = doc.internal.getNumberOfPages();
  const packLabel = pack.packType?.label || 'Dossier de financement';
  for (let i = 2; i <= total; i += 1) {
    doc.setPage(i);
    drawHeader(doc, i === 2 ? 'Table des matières' : '');
    drawFooter(doc, i, total, packLabel);
  }
}

/** Génère le PDF institutionnel complet. */
export function buildProfessionalFundingDossierPdf(pack = {}) {
  const packType = pack.packType || {};
  const orientation = packType.format === 'landscape' ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  if (packType.id === 'pitch_deck') {
    return buildPitchDeckPdf(doc, pack);
  }

  renderCoverPage(doc, pack);

  if (['one_pager', 'fiche_projet'].includes(packType.id)) {
    renderOnePager(doc, pack);
  } else {
    renderFullDossierBody(doc, pack);
  }

  applyHeadersFooters(doc, pack);
  drawFooter(doc, 1, doc.internal.getNumberOfPages(), pack.packType?.label);

  const slug = (packType.id || 'dossier').replace(/_/g, '-');
  return { doc, filename: `${slug}-horizon-farm-${todayIso()}.pdf` };
}

function buildPitchDeckPdf(doc, pack) {
  const sections = buildFundingDossierSections(pack).filter((s) => s.body && !['annexes', 'risks'].includes(s.id)).slice(0, 8);
  sections.forEach((section, index) => {
    if (index > 0) doc.addPage();
    fillWhite(doc);
    let y = newSectionPage(doc, section.title, { numbered: false });
    writeParagraphs(doc, y, splitParagraphs(section.body), { fontSize: 12 });
  });
  return { doc, filename: `pitch-deck-horizon-farm-${todayIso()}.pdf` };
}

export default buildProfessionalFundingDossierPdf;
