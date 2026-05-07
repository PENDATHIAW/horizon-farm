import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = {
  primary: [47, 36, 21],
  accent: [201, 169, 106],
  light: [214, 195, 160],
  white: [255, 255, 255],
  green: [34, 197, 94],
  red: [239, 68, 68],
};

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Number(n) || 0);
const fmtF = (n) => `${fmt(n)} FCFA`;
const fmtPct = (n) => `${(Number(n) || 0).toFixed(1)}%`;

const addSectionTitle = (doc, title, y) => {
  doc.setFillColor(...COLORS.primary);
  doc.rect(14, y, doc.internal.pageSize.width - 28, 7, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text(title.toUpperCase(), 17, y + 5);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  return y + 10;
};

const getY = (doc) => doc.autoTable.previous?.finalY ?? 30;

export function exportBpPdf({ bp = {}, metrics = {}, lines = [], costs = [], projections = [], fundings = [], risks = [] }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.width;

  // ==== PAGE DE GARDE ====
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageW, 60, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.text('BUSINESS PLAN', pageW / 2, 28, { align: 'center' });
  doc.setFontSize(14);
  doc.text(String(bp.nom || 'Horizon Farm'), pageW / 2, 40, { align: 'center' });

  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 60, pageW, 2, 'F');

  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  let y = 72;
  const infoRows = [
    ['Activite', String(bp.activity_type || '').replace(/_/g, ' ')],
    ['Localisation', String(bp.localisation || '-')],
    ['Date debut', String(bp.date_debut || '-')],
    ['Duree cycle', `${bp.duree_cycle_mois || '-'} mois`],
    ['Statut', String(bp.statut || '-')],
    ['Objectif', String(bp.objectif_production || '-')],
  ];
  infoRows.forEach(([label, val]) => {
    doc.setFont(undefined, 'bold');
    doc.text(`${label} :`, 14, y);
    doc.setFont(undefined, 'normal');
    doc.text(val, 60, y);
    y += 7;
  });

  // ==== RESUME EXECUTIF ====
  doc.addPage();
  y = 20;
  y = addSectionTitle(doc, 'Resume Executif', y);

  autoTable(doc, {
    startY: y,
    head: [['Indicateur', 'Valeur prevue']],
    body: [
      ['Investissement initial', fmtF(metrics.investissementInitial)],
      ['Charges mensuelles', fmtF(metrics.chargesMensuelles)],
      ['CA projete (cycle)', fmtF(metrics.caProjete)],
      ['Marge projetee', fmtF(metrics.margeProjetee)],
      ['ROI prevu', fmtPct(metrics.roiPrevu)],
      ['Payback', metrics.paybackMois ? `Mois ${metrics.paybackMois}` : 'Non calculable'],
      ['Financement obtenu', fmtF(metrics.financementObtenu)],
      ['Couverture financement', fmtPct(metrics.couvertureFinancement)],
    ],
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [250, 247, 241] },
    margin: { left: 14, right: 14 },
  });

  // ==== COUTS UNITAIRES ====
  y = getY(doc) + 10;
  if (y > 240) { doc.addPage(); y = 20; }
  y = addSectionTitle(doc, 'Couts Unitaires', y);

  const unitRows = (metrics.unitCostRows || []).filter((r) => (r.planned || 0) > 0);
  if (unitRows.length) {
    autoTable(doc, {
      startY: y,
      head: [['Indicateur', 'Prevu', 'Unite']],
      body: unitRows.map((r) => [
        r.label,
        r.unit === '%' ? fmtPct(r.planned) : fmtF(r.planned),
        r.unit,
      ]),
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [250, 247, 241] },
      margin: { left: 14, right: 14 },
    });
  }

  // ==== PLAN OPERATIONNEL — INVESTISSEMENT ====
  if (lines.length) {
    doc.addPage();
    y = 20;
    y = addSectionTitle(doc, 'Plan Operationnel — Investissement Initial', y);

    autoTable(doc, {
      startY: y,
      head: [['Designation', 'Categorie', 'Qte', 'Prix unit.', 'Total']],
      body: lines.map((l) => [
        l.designation,
        l.categorie || '',
        fmt(l.quantite),
        fmtF(l.prix_unitaire),
        fmtF(l.total || (Number(l.quantite) * Number(l.prix_unitaire))),
      ]),
      foot: [['', '', '', 'TOTAL', fmtF(metrics.investissementInitial)]],
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      footStyles: { fillColor: COLORS.accent, fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [250, 247, 241] },
      margin: { left: 14, right: 14 },
    });
  }

  // ==== CHARGES RECURRENTES ====
  if (costs.length) {
    y = getY(doc) + 10;
    if (y > 220) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, 'Charges Recurrentes', y);

    autoTable(doc, {
      startY: y,
      head: [['Designation', 'Categorie', 'Montant mensuel', 'Frequence']],
      body: costs.map((c) => [c.designation, c.categorie || '', fmtF(c.montant_mensuel), c.frequence || 'mensuelle']),
      foot: [['', '', fmtF(metrics.chargesMensuelles), 'TOTAL/MOIS']],
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      footStyles: { fillColor: COLORS.accent, fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [250, 247, 241] },
      margin: { left: 14, right: 14 },
    });
  }

  // ==== PREVISIONS FINANCIERES ====
  if (projections.length) {
    doc.addPage();
    y = 20;
    y = addSectionTitle(doc, 'Previsions Financieres Mensuelles', y);

    autoTable(doc, {
      startY: y,
      head: [['Mois', 'Production', 'Unite', 'Prix unit.', 'CA estime', 'Charges', 'Marge']],
      body: projections.map((p) => [
        `M${p.mois_index}`,
        fmt(p.production_estimee),
        p.unite_production || '',
        fmtF(p.prix_unitaire_estime),
        fmtF(p.ca_estime),
        fmtF(p.charges_estimees),
        fmtF(p.marge_estimee),
      ]),
      foot: [['', '', '', 'TOTAL', fmtF(metrics.caProjete), fmtF(metrics.chargesProjetees), fmtF(metrics.margeProjetee)]],
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      footStyles: { fillColor: COLORS.accent, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [250, 247, 241] },
      columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 16 } },
      margin: { left: 14, right: 14 },
    });
  }

  // ==== PLAN DE FINANCEMENT ====
  if (fundings.length) {
    y = getY(doc) + 10;
    if (y > 230) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, 'Plan de Financement', y);

    autoTable(doc, {
      startY: y,
      head: [['Source', 'Type', 'Montant', 'Statut', 'Taux %', 'Duree']],
      body: fundings.map((f) => [
        f.nom_source || '',
        (f.source_type || '').replace(/_/g, ' '),
        fmtF(f.montant),
        f.statut || '',
        fmtPct(f.taux_interet_pct),
        f.duree_remboursement_mois ? `${f.duree_remboursement_mois} mois` : '-',
      ]),
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [250, 247, 241] },
      margin: { left: 14, right: 14 },
    });
  }

  // ==== ANALYSE DES RISQUES ====
  if (risks.length) {
    y = getY(doc) + 10;
    if (y > 220) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, 'Analyse des Risques', y);

    autoTable(doc, {
      startY: y,
      head: [['Risque', 'Categorie', 'Probabilite', 'Impact', 'Mesure attenuation']],
      body: risks.map((r) => [
        r.titre || '',
        r.categorie || '',
        r.probabilite || '',
        r.impact || '',
        r.mesure_attenuation || '-',
      ]),
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [250, 247, 241] },
      margin: { left: 14, right: 14 },
    });
  }

  // ==== FOOTER SUR CHAQUE PAGE ====
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Horizon Farm — ${bp.nom || 'Business Plan'} — Page ${i}/${pageCount}`, pageW / 2, doc.internal.pageSize.height - 5, { align: 'center' });
    doc.text('Document de pilotage interne. A valider par un comptable/banquier avant depot officiel.', pageW / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  doc.save(`BP-${(bp.nom || 'business-plan').replace(/[^a-z0-9]/gi, '-')}.pdf`);
}
