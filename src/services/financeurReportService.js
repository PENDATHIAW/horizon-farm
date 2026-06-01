import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { findOrphanDocuments } from './documentsOrphanSyncService.js';
import { saveModuleReportExport } from '../utils/moduleReportExports.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const fmt = (value = 0) => Number(value || 0).toLocaleString('fr-FR');
const lower = (value = '') => String(value || '').toLowerCase();
const n = (value) => Number(value || 0) || 0;

function stockValue(rows = []) {
  return arr(rows).reduce((sum, row) => {
    const qty = n(row.quantite ?? row.quantity ?? 0);
    const price = n(row.prixunit ?? row.prixUnit ?? row.prix_unitaire ?? row.unit_price ?? 0);
    return sum + (row.valeur_stock != null ? n(row.valeur_stock) : qty * price);
  }, 0);
}

function computeCommercialKpis(salesOrders = [], payments = []) {
  const ca = arr(salesOrders).reduce((sum, row) => sum + n(row.montant_total ?? row.total ?? row.amount), 0);
  const collected = arr(payments).reduce((sum, row) => sum + n(row.montant_paye ?? row.montant ?? row.amount), 0);
  return { ca, collected, receivable: Math.max(0, ca - collected) };
}

function computeDocumentKpis(documents = [], transactions = []) {
  const orphans = findOrphanDocuments(documents);
  const missingProof = arr(transactions).filter((trx) => {
    const amount = n(trx.montant ?? trx.amount);
    if (amount <= 0) return false;
    const trxId = String(trx.id || '');
    return !arr(documents).some((doc) => String(doc.transaction_id || doc.related_id || doc.source_record_id) === trxId);
  }).length;
  const linked = arr(documents).filter((doc) => doc.source_record_id || doc.related_id || doc.order_id).length;
  const complianceScore = documents.length ? Math.round(((linked / documents.length) * 70) + (orphans.length === 0 ? 30 : 0)) : 0;
  return { orphanDocs: orphans.length, missingProof, complianceScore };
}

function buildFinanceurKpis(data = {}) {
  const salesOrders = arr(data.sales_orders || data.salesOrders);
  const payments = arr(data.payments);
  const transactions = arr(data.finances || data.transactions);
  const commercial = computeCommercialKpis(salesOrders, payments);
  const depensesPeriod = transactions
    .filter((row) => ['sortie', 'depense', 'dépense'].includes(lower(row.type || row.transaction_type)))
    .reduce((sum, row) => sum + n(row.montant || row.amount), 0);
  return {
    commercial,
    stock: { stockValue: stockValue(arr(data.stock || data.stocks)) },
    finance: { depensesPeriod, resultatPeriod: commercial.collected - depensesPeriod },
  };
}

export function buildFinanceurReportData(data = {}, options = {}) {
  const kpis = buildFinanceurKpis(data);
  const documents = computeDocumentKpis(arr(data.documents), arr(data.finances || data.transactions));
  const cultures = arr(data.cultures);
  const harvested = cultures.reduce((sum, row) => sum + n(row.quantite_recoltee || row.recolte), 0);

  return {
    financier: options.financier || 'Partenaire',
    businessPlan: options.businessPlanLabel || 'Business Plan Horizon Farm',
    amountRequested: n(options.amountRequested),
    purpose: options.purpose || '',
    kpis,
    documents,
    checklist: [
      { item: 'CA commercial (sales_orders)', ok: kpis.commercial.ca >= 0, value: `${fmt(kpis.commercial.ca)} FCFA` },
      { item: 'Encaissements (payments)', ok: kpis.commercial.collected >= 0, value: `${fmt(kpis.commercial.collected)} FCFA` },
      { item: 'Créances clients', ok: true, value: `${fmt(kpis.commercial.receivable)} FCFA` },
      { item: 'Valeur stock actuel', ok: kpis.stock.stockValue >= 0, value: `${fmt(kpis.stock.stockValue)} FCFA` },
      { item: 'Production récoltes cultures', ok: harvested >= 0, value: `${fmt(harvested)} kg/unités` },
      { item: 'Score conformité preuves', ok: documents.complianceScore >= 70, value: `${documents.complianceScore}%` },
      { item: 'Documents orphelins', ok: documents.orphanDocs === 0, value: String(documents.orphanDocs) },
      { item: 'Transactions sans preuve', ok: documents.missingProof === 0, value: String(documents.missingProof) },
    ],
    proofs: arr(data.documents).slice(0, 15).map((doc) => ({
      title: doc.title || doc.nom || doc.id,
      module: doc.source_module || doc.module_source || '—',
      linked: Boolean(doc.source_record_id || doc.related_id),
    })),
  };
}

export function exportFinanceurReportPdf(data = {}, options = {}) {
  const report = buildFinanceurReportData(data, options);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const now = new Date();
  const filename = `dossier-financeur-${String(report.financier).toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-${now.toISOString().slice(0, 10)}.pdf`;

  doc.setFontSize(18);
  doc.text('Horizon Farm — Dossier financeur', 40, 48);
  doc.setFontSize(11);
  doc.text(`Financeur : ${report.financier}`, 40, 72);
  doc.text(`Business plan : ${report.businessPlan}`, 40, 88);
  if (report.amountRequested > 0) doc.text(`Montant sollicité : ${fmt(report.amountRequested)} FCFA`, 40, 104);
  if (report.purpose) doc.text(`Objet : ${String(report.purpose).slice(0, 90)}`, 40, 120);
  doc.text(`Généré le : ${now.toLocaleString('fr-FR')}`, 40, 136);

  autoTable(doc, {
    startY: 156,
    head: [['Indicateur', 'Valeur', 'Source officielle']],
    body: [
      ['CA période', `${fmt(report.kpis.commercial.ca)} FCFA`, 'sales_orders'],
      ['Encaissements', `${fmt(report.kpis.commercial.collected)} FCFA`, 'payments'],
      ['Créances', `${fmt(report.kpis.commercial.receivable)} FCFA`, 'sales_orders + payments'],
      ['Charges période', `${fmt(report.kpis.finance.depensesPeriod)} FCFA`, 'finances'],
      ['Résultat période', `${fmt(report.kpis.finance.resultatPeriod)} FCFA`, 'payments - finances'],
      ['Valeur stock', `${fmt(report.kpis.stock.stockValue)} FCFA`, 'stock'],
    ],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [47, 36, 21] },
    margin: { left: 40, right: 40 },
  });

  const checklistY = (doc.lastAutoTable?.finalY || 156) + 24;
  doc.setFontSize(12);
  doc.text('Checklist conformité dossier', 40, checklistY);
  autoTable(doc, {
    startY: checklistY + 8,
    head: [['Contrôle', 'Statut', 'Détail']],
    body: report.checklist.map((row) => [row.item, row.ok ? 'OK' : 'À corriger', row.value]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [138, 116, 86] },
    margin: { left: 40, right: 40 },
  });

  const proofsY = (doc.lastAutoTable?.finalY || checklistY) + 20;
  if (report.proofs.length) {
    doc.setFontSize(12);
    doc.text('Preuves disponibles (extrait)', 40, proofsY);
    autoTable(doc, {
      startY: proofsY + 8,
      head: [['Document', 'Module', 'Lié']],
      body: report.proofs.map((row) => [row.title, row.module, row.linked ? 'Oui' : 'Non']),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [138, 116, 86] },
      margin: { left: 40, right: 40 },
    });
  }

  doc.save(filename);
  saveModuleReportExport({
    module: 'Rapports',
    title: `Dossier financeur ${report.financier}`,
    period: 'Global',
    filename,
    summary: `CA ${fmt(report.kpis.commercial.ca)} · Encaissements ${fmt(report.kpis.commercial.collected)}`,
  });
  return { filename, report };
}
