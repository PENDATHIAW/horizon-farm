import { Download, FileText, Presentation, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import useCrudModule from '../hooks/useCrudModule';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';

const arr = (v) => Array.isArray(v) ? v : [];
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const n = (v) => toNumber(v);
const sumBy = (rows, keys) => arr(rows).reduce((s, r) => s + keys.reduce((v, k) => v || n(r?.[k]), 0), 0);
const stockValue = (rows) => arr(rows).reduce((s, r) => s + n(r.quantite ?? r.quantity) * n(r.prixUnit ?? r.prixunit ?? r.prix_unitaire ?? r.unit_price), 0);
const activePoultry = (lots) => arr(lots).reduce((s, l) => s + Math.max(0, n(l.current_count ?? l.effectif_actuel ?? l.initial_count) - n(l.mortality ?? l.morts) - n(l.vendus)), 0);

function buildSummary(data, bp) {
  const sales = sumBy(data.salesOrders, ['montant_total', 'total', 'amount']);
  const paid = Math.max(sumBy(data.payments, ['montant_paye', 'montant', 'amount']), sumBy(data.salesOrders, ['montant_paye', 'paid_amount']));
  const inCash = arr(data.transactions).filter((r) => String(r.type || '').toLowerCase() === 'entree').reduce((s, r) => s + n(r.montant), 0);
  const outCash = arr(data.transactions).filter((r) => String(r.type || '').toLowerCase() === 'sortie').reduce((s, r) => s + n(r.montant), 0);
  const investment = sumBy(bp.investmentLines, ['amount', 'montant', 'cost', 'cout']) || sumBy(bp.businessPlans, ['budget_total', 'investment_total', 'montant_total']);
  const recurring = sumBy(bp.recurringCosts, ['amount', 'montant', 'monthly_amount', 'cout']);
  const projected = sumBy(bp.revenueProjections, ['amount', 'montant', 'revenue', 'ca_prevu']);
  return {
    sales, paid, receivables: Math.max(0, sales - paid), revenue: Math.max(sales, inCash), expenses: outCash, margin: Math.max(sales, inCash) - outCash,
    animals: arr(data.animaux).length, lots: arr(data.lots).length, poultry: activePoultry(data.lots), cultures: arr(data.cultures).filter((r) => !['parcelle', 'campagne', 'performance'].includes(String(r.record_type || r.type_fiche || '').toLowerCase())).length,
    stock: stockValue(data.stocks), stockCritical: arr(data.stocks).filter((r) => n(r.seuil) > 0 && n(r.quantite) <= n(r.seuil)).length,
    clients: arr(data.clients).length, suppliers: arr(data.fournisseurs).length, tasks: arr(data.taches).length, alerts: arr(data.alertes).length,
    plans: arr(bp.businessPlans).length, investment, recurring, projected, funding: sumBy(bp.fundingSources, ['amount', 'montant', 'value', 'valeur']), risks: arr(bp.risks).length,
  };
}

function addPageTitle(doc, title) {
  doc.setFillColor(47, 36, 21);
  doc.rect(0, 0, 297, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('HORIZON FARM + ERP', 12, 12);
  doc.text(title, 285, 12, { align: 'right' });
  doc.setTextColor(47, 36, 21);
}

function addFooter(doc) {
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(125, 106, 74);
    doc.text(`Horizon Farm ERP · ${today()} · ${i}/${pages}`, 148, 202, { align: 'center' });
  }
  doc.setTextColor(47, 36, 21);
}

function writeBullets(doc, items, x, y) {
  let cy = y;
  items.forEach((item) => {
    const lines = doc.splitTextToSize(item, 255);
    doc.circle(x, cy - 1.5, 1, 'F');
    doc.text(lines, x + 5, cy);
    cy += Math.max(8, lines.length * 5 + 3);
  });
}

function generatePdf(summary, bp) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFillColor(248, 245, 239);
  doc.rect(0, 0, 297, 210, 'F');
  doc.setTextColor(47, 36, 21);
  doc.setFontSize(30);
  doc.text('HORIZON FARM', 18, 45);
  doc.setFontSize(18);
  doc.text('Présentation projet · ERP · Business Plan', 18, 58);
  doc.setFontSize(11);
  doc.text('Moins de saisie, plus d’interconnexion, plus de pilotage.', 18, 70);
  autoTable(doc, { startY: 88, head: [['Indicateur', 'Valeur']], body: [['Ventes suivies', fmtCurrency(summary.sales)], ['Encaissements', fmtCurrency(summary.paid)], ['Créances', fmtCurrency(summary.receivables)], ['Stock valorisé', fmtCurrency(summary.stock)], ['Investissements BP', fmtCurrency(summary.investment)], ['Revenus projetés BP', fmtCurrency(summary.projected)]], headStyles: { fillColor: [47, 36, 21] }, styles: { fontSize: 10 } });

  doc.addPage(); addPageTitle(doc, 'Vision & architecture'); doc.setFontSize(17); doc.text('Vision du projet', 16, 34); doc.setFontSize(10);
  writeBullets(doc, ['Centraliser les activités agricoles dans un ERP simple et opérationnel.', 'Transformer une saisie métier en mises à jour automatiques dans les modules liés.', 'Piloter la ferme avec des indicateurs fiables : ventes, cash, stock, santé, production, alertes.', 'Tracer les actions importantes pour sécuriser les décisions et les preuves.'], 18, 50);
  autoTable(doc, { startY: 95, head: [['Bloc', 'Modules', 'Connexion principale']], body: [['Production', 'Animaux, Avicole, Cultures', 'Stock, Santé, Ventes, Traçabilité'], ['Gestion', 'Stock, Fournisseurs, Équipements', 'Tâches, Alertes, Finances'], ['Commerce', 'Ventes, Clients, Documents', 'Paiements, Factures, WhatsApp'], ['Pilotage', 'Dashboard, Impact Business, Rapports', 'Synthèse globale'], ['Contrôle', 'Audit Logs, Sync Offline', 'Preuve et continuité terrain']], headStyles: { fillColor: [47, 36, 21] }, styles: { fontSize: 9 } });

  doc.addPage(); addPageTitle(doc, 'Business Plan'); doc.setFontSize(17); doc.text('Synthèse BP', 16, 34);
  autoTable(doc, { startY: 45, head: [['Élément', 'Valeur']], body: [['Business plans', fmtNumber(summary.plans)], ['Investissements', fmtCurrency(summary.investment)], ['Charges récurrentes', fmtCurrency(summary.recurring)], ['Financements', fmtCurrency(summary.funding)], ['Revenus projetés', fmtCurrency(summary.projected)], ['Risques', fmtNumber(summary.risks)]], headStyles: { fillColor: [47, 36, 21] }, styles: { fontSize: 10 } });
  const plans = arr(bp.businessPlans).slice(0, 8).map((p) => [p.title || p.nom || p.name || p.id, p.status || p.statut || '—', fmtCurrency(n(p.budget_total || p.investment_total || p.montant_total))]);
  if (plans.length) autoTable(doc, { startY: doc.lastAutoTable.finalY + 10, head: [['Plan', 'Statut', 'Budget']], body: plans, headStyles: { fillColor: [201, 169, 106] }, styles: { fontSize: 8 } });

  doc.addPage(); addPageTitle(doc, 'Exploitation & ERP'); doc.setFontSize(17); doc.text('Données opérationnelles', 16, 34);
  autoTable(doc, { startY: 45, head: [['Famille', 'Indicateurs']], body: [['Animaux', `${fmtNumber(summary.animals)} animal(aux)`], ['Avicole', `${fmtNumber(summary.lots)} lot(s), ${fmtNumber(summary.poultry)} sujet(s) actifs`], ['Cultures', `${fmtNumber(summary.cultures)} culture(s)`], ['Stock', `${fmtCurrency(summary.stock)} · ${summary.stockCritical} critique(s)`], ['Clients / Fournisseurs', `${summary.clients} client(s), ${summary.suppliers} fournisseur(s)`], ['Actions ERP', `${summary.tasks} tâche(s), ${summary.alerts} alerte(s)`], ['Marge estimée', fmtCurrency(summary.margin)]], headStyles: { fillColor: [47, 36, 21] }, styles: { fontSize: 10 } });

  doc.addPage(); addPageTitle(doc, 'Plan d’exécution'); doc.setFontSize(17); doc.text('Priorités de déploiement', 16, 34); doc.setFontSize(10);
  writeBullets(doc, ['Tester les formulaires avec des cas réels : sélection, champs liés, statuts et actions.', 'Valider les anti-doublons : opportunités, tâches, alertes, factures et paiements.', 'Contrôler que chaque action visible écrit bien dans le module lié.', 'Utiliser les rapports pour présenter le projet et suivre l’avancement opérationnel.', 'Former l’équipe : saisir moins, confirmer plus, suivre les alertes et les tâches.'], 18, 50);
  addFooter(doc);
  doc.save(`presentation-horizon-farm-erp-bp-${today()}.pdf`);
}

export default function RapportsProjectPresentationBridge({ data = {}, onCreateDocument, onRefreshDocuments, onCreateBusinessEvent, onRefreshBusinessEvents }) {
  const [saving, setSaving] = useState(false);
  const businessPlans = useCrudModule('business_plans');
  const investmentLines = useCrudModule('bp_investment_lines');
  const recurringCosts = useCrudModule('bp_recurring_costs');
  const revenueProjections = useCrudModule('bp_revenue_projections');
  const fundingSources = useCrudModule('bp_funding_sources');
  const risks = useCrudModule('bp_risks');
  const bp = { businessPlans: businessPlans.rows, investmentLines: investmentLines.rows, recurringCosts: recurringCosts.rows, revenueProjections: revenueProjections.rows, fundingSources: fundingSources.rows, risks: risks.rows };
  const summary = useMemo(() => buildSummary(data, bp), [data, businessPlans.rows, investmentLines.rows, recurringCosts.rows, revenueProjections.rows, fundingSources.rows, risks.rows]);

  const generate = async () => {
    try {
      setSaving(true);
      generatePdf(summary, bp);
      const docId = makeId('DOC');
      await onCreateDocument?.({ id: docId, title: `Présentation Horizon Farm ERP BP ${today()}`, document_category: 'presentation_projet', module_source: 'rapports', entity_type: 'projet', entity_id: 'horizon-farm-erp', related_id: 'horizon-farm-erp', status: 'genere', generated_at: now(), summary: 'Présentation PDF Horizon Farm + ERP + Business Plan générée.' });
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'presentation_projet_generee', module_source: 'rapports', entity_type: 'projet', entity_id: 'horizon-farm-erp', title: 'Présentation Horizon Farm ERP BP générée', description: `${fmtCurrency(summary.investment)} investissements · ${fmtCurrency(summary.sales)} ventes suivies`, event_date: today(), severity: 'info', linked_document_id: docId, saisies_evitees: 4 });
      await Promise.allSettled([onRefreshDocuments?.(), onRefreshBusinessEvents?.()]);
      toast.success('Présentation PDF générée');
    } catch (error) {
      toast.error(error.message || 'Génération PDF impossible');
    } finally { setSaving(false); }
  };

  return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Présentation projet</p><h3 className="font-black text-[#2f2415]">Horizon Farm + ERP + Business Plan</h3><p className="text-sm text-[#8a7456] mt-1">PDF structuré pour présenter le projet, le BP et l’ERP.</p></div><button type="button" disabled={saving} onClick={generate} className="rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? <RefreshCw size={14} className="inline animate-spin" /> : <Download size={14} className="inline" />} Générer PDF</button></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-2"><Metric icon={Presentation} label="BP" value={`${summary.plans} plan(s)`} /><Metric icon={FileText} label="Investissements" value={fmtCurrency(summary.investment)} /><Metric icon={FileText} label="Ventes ERP" value={fmtCurrency(summary.sales)} /><Metric icon={FileText} label="Stock" value={fmtCurrency(summary.stock)} /></div></div>;
}
function Metric({ icon: Icon, label, value }) { return <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><Icon size={14} className="text-[#9a6b12]" /><p className="text-xs text-[#8a7456] mt-1">{label}</p><p className="font-black text-[#2f2415]">{value}</p></div>; }
