import { AlertTriangle, CheckCircle2, CreditCard, Receipt, Truck } from 'lucide-react';
import { fmtCurrency, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const amount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.total_amount ?? row.montant);
const paidForOrder = (order = {}, payments = []) => arr(payments).filter((p) => clean(p.order_id || p.sale_id || p.source_record_id || p.related_id || p.commande_id) === clean(order.id)).reduce((sum, p) => sum + toNumber(p.montant_paye ?? p.montant ?? p.amount ?? p.paid_amount), 0);
const dueDate = (row = {}) => clean(row.echeance || row.due_date || row.date_echeance || row.date_relance);
const orderDate = (row = {}) => clean(row.date || row.date_vente || row.order_date || row.created_at).slice(0, 10);
const isClosedDelivery = (row = {}) => ['livre', 'livré', 'annule', 'annulé', 'closed', 'done'].includes(lower(row.statut_livraison || row.delivery_status || row.status));
const hasInvoice = (order = {}, invoices = []) => Boolean(order.invoice_id || arr(invoices).some((invoice) => clean(invoice.order_id || invoice.sale_id || invoice.source_record_id || invoice.related_id) === clean(order.id)));
const hasDelivery = (order = {}, deliveries = []) => Boolean(arr(deliveries).some((delivery) => clean(delivery.order_id || delivery.sale_id || delivery.source_record_id || delivery.related_id) === clean(order.id)));

function saleMargin(order = {}) {
  const total = amount(order);
  const cost = toNumber(order.cout_total || order.cost_total || order.total_cost || order.cout_revient || order.purchase_cost);
  return { total, cost, margin: total - cost };
}

function buildQuality(props) {
  const orders = arr(props.orders || props.rows);
  const payments = arr(props.payments || props.paymentsList);
  const invoices = arr(props.invoices || props.invoicesList);
  const deliveries = arr(props.deliveries || props.deliveriesList);
  const incomplete = [];
  const credits = [];
  const lateDeliveries = [];
  const invoicesToSend = [];
  const marginWatch = [];
  const legacyToRegularize = [];

  orders.forEach((order) => {
    const total = amount(order);
    const paid = paidForOrder(order, payments);
    const missing = [];
    if (!clean(order.client_id || order.client || order.customer_id)) missing.push('client');
    if (!clean(order.product_name || order.produit || order.libelle || order.item_name)) missing.push('produit');
    if (!toNumber(order.quantity_sold ?? order.quantite_vendue ?? order.quantite ?? order.quantity ?? order.order_quantity)) missing.push('quantité');
    if (!total) missing.push('montant');
    if (!orderDate(order)) missing.push('date');
    if (missing.length) incomplete.push({ order, missing });

    if (total > paid) credits.push({ order, remaining: total - paid, due: dueDate(order) });
    if (!isClosedDelivery(order) && (!hasDelivery(order, deliveries) || (dueDate(order) && dueDate(order) < today()))) lateDeliveries.push(order);
    if (!hasInvoice(order, invoices)) invoicesToSend.push(order);

    const margin = saleMargin(order);
    if (margin.cost > 0 && margin.margin < 0) marginWatch.push({ order, ...margin });

    const sourceKnown = clean(order.source_id || order.product_id || order.entity_id || order.asset_id || order.stock_id || order.lot_id || order.animal_id || order.culture_id);
    const oldSale = orderDate(order) && orderDate(order) < '2026-01-01';
    if (!sourceKnown && oldSale) legacyToRegularize.push(order);
  });

  return { incomplete, credits, lateDeliveries, invoicesToSend, marginWatch, legacyToRegularize };
}

function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border px-3 py-2 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-white'}`}><Icon size={14} className={danger ? 'text-amber-700' : 'text-[#9a6b12]'} /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>;
}

function List({ title, rows = [], empty, render }) {
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="font-black text-[#2f2415]">{title}</p><div className="mt-3 space-y-2 text-sm">{rows.length ? rows.slice(0, 4).map((item, idx) => <div key={`${title}-${idx}`} className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2">{render(item)}</div>) : <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">{empty}</div>}</div></div>;
}

export default function SalesWorkflowHealth(props) {
  const q = buildQuality(props);
  const issueCount = q.incomplete.length + q.credits.length + q.lateDeliveries.length + q.invoicesToSend.length + q.marginWatch.length + q.legacyToRegularize.length;
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><CheckCircle2 size={15} /> Qualité des ventes</p><h3 className="text-xl font-black text-[#2f2415] mt-1">Suivi commercial à régulariser</h3><p className="text-sm text-[#8a7456] mt-1">Les nouvelles ventes doivent créer automatiquement client, paiement, écriture, stock, livraison et facture. Cette zone sert surtout aux anciennes ventes ou cas exceptionnels.</p></div>{issueCount ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="inline" /> {issueCount} point(s) métier à suivre</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={15} className="inline" /> Ventes complètes</div>}</div>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 text-sm"><Mini icon={AlertTriangle} label="Ventes incomplètes" value={q.incomplete.length} danger={q.incomplete.length > 0} /><Mini icon={CreditCard} label="Crédits à relancer" value={q.credits.length} danger={q.credits.length > 0} /><Mini icon={Truck} label="Livraisons en retard" value={q.lateDeliveries.length} danger={q.lateDeliveries.length > 0} /><Mini icon={Receipt} label="Factures à envoyer" value={q.invoicesToSend.length} danger={q.invoicesToSend.length > 0} /><Mini icon={AlertTriangle} label="Marge à surveiller" value={q.marginWatch.length} danger={q.marginWatch.length > 0} /><Mini icon={AlertTriangle} label="Anciennes ventes" value={q.legacyToRegularize.length} danger={q.legacyToRegularize.length > 0} /></div>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3"><List title="Crédits à relancer" rows={q.credits} empty="Aucune créance commerciale à relancer." render={({ order, remaining, due }) => <><b className="text-[#2f2415]">{order.product_name || order.libelle || order.id}</b><p className="text-xs text-[#8a7456]">Reste {fmtCurrency(remaining)}{due ? ` · échéance ${due}` : ''}</p></>} /><List title="Ventes incomplètes" rows={q.incomplete} empty="Toutes les ventes ont les informations essentielles." render={({ order, missing }) => <><b className="text-[#2f2415]">{order.id || order.product_name}</b><p className="text-xs text-[#8a7456]">À compléter : {missing.join(', ')}</p></>} /><List title="Factures et livraisons" rows={[...q.invoicesToSend, ...q.lateDeliveries]} empty="Aucune facture ou livraison en attente." render={(order) => <><b className="text-[#2f2415]">{order.product_name || order.libelle || order.id}</b><p className="text-xs text-[#8a7456]">Préparer la pièce commerciale ou clôturer la livraison.</p></>} /></div>
  </section>;
}
