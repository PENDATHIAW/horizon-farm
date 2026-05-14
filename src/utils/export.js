import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const sanitizeRows = (rows = [], columns = []) => {
  if (!Array.isArray(rows)) return [];
  if (!columns.length) return rows;
  return rows.map((row) => {
    const out = {};
    columns.forEach((col) => {
      out[col] = row?.[col] ?? '';
    });
    return out;
  });
};

const number = (value) => Number(value || 0) || 0;
const today = () => new Date().toISOString().slice(0, 10);
const safeName = (value = 'business-plan') => String(value || 'business-plan').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'business-plan';
const clean = (value = '') => String(value ?? '').replace(/\s{2,}/g, ' ').trim();
const money = (value) => Math.round(number(value));
const pct = (value) => Number(number(value).toFixed(2));
const lineTotal = (line = {}) => money(line.total ?? (number(line.quantite) * number(line.prix_unitaire)));
const sum = (rows = [], getter) => rows.reduce((total, row) => total + number(typeof getter === 'function' ? getter(row) : row?.[getter]), 0);

function addSheet(workbook, name, rows, widths = []) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = widths.map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(workbook, worksheet, name.slice(0, 31));
  return worksheet;
}
function tableRows(headers, rows) {
  return [headers, ...rows];
}
function bpRowsForPlan(plan, rows = []) {
  if (!plan?.id) return [];
  return rows.filter((row) => String(row.business_plan_id || '') === String(plan.id));
}
function computedBusinessPlanMetrics({ plan, lines, costs, projections, fundings }) {
  const investment = sum(lines, lineTotal);
  const effective = sum(lines.filter((row) => ['effectif', 'paye', 'payé'].includes(String(row.statut || row.status || '').toLowerCase())), lineTotal);
  const remaining = Math.max(0, investment - effective);
  const monthlyCosts = sum(costs, (row) => row.montant_mensuel ?? row.monthly_amount ?? row.montant ?? row.amount);
  const cycleMonths = number(plan?.duree_cycle_mois) || 12;
  const cycleCosts = sum(projections, (row) => row.charges_estimees ?? row.projected_charges ?? row.charges) || monthlyCosts * cycleMonths;
  const revenue = sum(projections, (row) => row.ca_estime ?? row.revenue ?? row.ca_prevu ?? row.montant);
  const funding = sum(fundings, (row) => row.montant ?? row.amount ?? row.valeur);
  const net = revenue - cycleCosts - investment;
  const roi = investment > 0 ? (net / investment) * 100 : 0;
  return { investment, effective, remaining, monthlyCosts, cycleMonths, cycleCosts, revenue, funding, net, roi };
}

export const exportToCsv = ({ rows = [], columns = [], fileName = 'export.csv' }) => {
  const safeRows = sanitizeRows(rows, columns);
  const header = columns.length ? columns : Object.keys(safeRows[0] || {});
  const lines = [header.join(';')];

  safeRows.forEach((row) => {
    const line = header
      .map((key) => {
        const raw = row?.[key] ?? '';
        const value = String(raw).replaceAll('"', '""');
        return `"${value}"`;
      })
      .join(';');
    lines.push(line);
  });

  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToExcel = ({ rows = [], columns = [], sheetName = 'Data', fileName = 'export.xlsx' }) => {
  const safeRows = sanitizeRows(rows, columns);
  const worksheet = XLSX.utils.json_to_sheet(safeRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
};

export const exportBusinessPlanToExcel = ({ plan, lines = [], costs = [], projections = [], fundings = [], risks = [], metrics = null, fileName }) => {
  if (!plan) throw new Error('Aucun Business Plan à exporter');
  const planLines = bpRowsForPlan(plan, lines);
  const planCosts = bpRowsForPlan(plan, costs);
  const planProjections = bpRowsForPlan(plan, projections);
  const planFundings = bpRowsForPlan(plan, fundings);
  const planRisks = bpRowsForPlan(plan, risks);
  const m = metrics || computedBusinessPlanMetrics({ plan, lines: planLines, costs: planCosts, projections: planProjections, fundings: planFundings });
  const workbook = XLSX.utils.book_new();
  workbook.Props = { Title: `Business Plan ${plan.nom || plan.name || ''}`, Subject: 'Horizon Farm ERP', Author: 'Horizon Farm ERP', CreatedDate: new Date() };

  addSheet(workbook, 'Résumé', [
    ['HORIZON FARM - BUSINESS PLAN'],
    ['Exporté le', today()],
    ['Nom du projet', plan.nom || plan.name || plan.title || 'Business Plan'],
    ['Localisation', plan.localisation || ''],
    ['Statut', plan.statut || plan.status || ''],
    ['Durée du cycle', `${m.cycleMonths || plan.duree_cycle_mois || ''} mois`],
    [],
    ['Indicateur', 'Valeur'],
    ['Investissement prévu', money(m.investment ?? m.investissementInitial)],
    ['Investi effectif', money(m.effective ?? m.investiEffectif)],
    ['Reste à financer / engager', money(m.remaining ?? m.reste)],
    ['Charges mensuelles', money(m.monthlyCosts ?? m.chargesMensuelles)],
    ['Charges du cycle', money(m.cycleCosts ?? m.chargesRecurrentesCycle ?? m.chargesProjetees)],
    ['Chiffre d’affaires prévu', money(m.revenue ?? m.caProjete ?? m.projectedRevenue)],
    ['Financement obtenu', money(m.funding ?? m.financementObtenu)],
    ['Gain / perte fin cycle', money(m.net ?? m.margeNetteCycle ?? m.margeProjetee)],
    ['ROI prévu (%)', pct(m.roi ?? m.roiPrevu)],
    ['Payback', m.paybackMois || m.paybackMonths ? `Mois ${m.paybackMois || m.paybackMonths}` : 'Non atteint / à compléter'],
    [],
    ['Lecture simple'],
    ['Ce fichier contient le résumé du business plan, les dépenses, les charges mensuelles, les prévisions, les financements et les risques.'],
  ], [28, 28, 18, 18, 18]);

  addSheet(workbook, 'Dépenses BP', tableRows(['Dépense', 'Catégorie', 'Quantité', 'Unité', 'Prix unitaire', 'Total', 'Statut', 'Preuve', 'Transaction'], planLines.map((line) => [
    clean(line.designation || line.libelle || line.name), line.categorie || line.category || '', number(line.quantite), line.unite || '', money(line.prix_unitaire), lineTotal(line), line.statut || line.status || 'prévu', line.preuve_url || '', line.transaction_id || '',
  ])), [36, 18, 12, 12, 16, 16, 14, 28, 20]);

  addSheet(workbook, 'Charges mensuelles', tableRows(['Charge', 'Catégorie', 'Montant mensuel', 'Fréquence', 'Notes'], planCosts.map((cost) => [
    clean(cost.designation || cost.libelle || cost.name), cost.categorie || cost.category || '', money(cost.montant_mensuel ?? cost.monthly_amount ?? cost.montant ?? cost.amount), cost.frequence || 'mensuelle', cost.notes || '',
  ])), [36, 18, 18, 16, 34]);

  addSheet(workbook, 'Prévisions', tableRows(['Mois', 'Chiffre d’affaires prévu', 'Charges prévues', 'Marge prévue', 'Notes'], planProjections.map((row) => {
    const ca = money(row.ca_estime ?? row.revenue ?? row.ca_prevu ?? row.montant);
    const charges = money(row.charges_estimees ?? row.projected_charges ?? row.charges);
    return [row.mois_index || row.mois || row.month || '', ca, charges, ca - charges, row.notes || ''];
  })), [12, 24, 20, 20, 34]);

  addSheet(workbook, 'Financement', tableRows(['Source', 'Type', 'Montant', 'Statut', 'Notes'], planFundings.map((row) => [
    clean(row.nom || row.source || row.libelle || row.name), row.type || row.categorie || '', money(row.montant ?? row.amount ?? row.valeur), row.statut || row.status || '', row.notes || '',
  ])), [30, 18, 18, 16, 34]);

  addSheet(workbook, 'Risques', tableRows(['Risque', 'Niveau', 'Impact', 'Prévention / action', 'Statut'], planRisks.map((row) => [
    clean(row.title || row.risque || row.nom || row.description), row.niveau || row.severity || row.gravite || '', row.impact || '', row.mitigation || row.action || row.notes || '', row.statut || row.status || '',
  ])), [34, 14, 28, 42, 16]);

  XLSX.writeFile(workbook, fileName || `business-plan-${safeName(plan.nom || plan.name || 'horizon-farm')}-${today()}.xlsx`);
};

export const exportToPdf = ({ rows = [], columns = [], title = 'Export', fileName = 'export.pdf' }) => {
  const safeRows = sanitizeRows(rows, columns);
  const header = columns.length ? columns : Object.keys(safeRows[0] || {});
  const body = safeRows.map((row) => header.map((key) => String(row?.[key] ?? '')));

  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 16);

  autoTable(doc, {
    head: [header],
    body,
    startY: 22,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [34, 197, 94] },
  });

  doc.save(fileName);
};


