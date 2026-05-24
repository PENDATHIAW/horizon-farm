import { AlertTriangle, CheckCircle2, CreditCard, PackageCheck, Receipt, Truck } from 'lucide-react';
import Btn from '../components/Btn';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { remainingForOrder } from '../utils/salesStatuses';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();
const amount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.total_amount ?? row.montant);
const paymentAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount);
const paymentOrderId = (row = {}) => clean(row.order_id || row.sale_id || row.source_record_id || row.related_id || row.commande_id);
const financeOrderId = (row = {}) => clean(row.related_id || row.source_record_id || row.order_id || row.sale_id || row.commande_id);
const financePaymentId = (row = {}) => clean(row.payment_id || row.paiement_id || row.source_payment_id);
const sourceIdOf = (order = {}) => clean(order.source_id || order.product_id || order.entity_id || order.asset_id || order.stock_id || order.lot_id || order.animal_id || order.culture_id);
const sourceTypeOf = (order = {}) => lower(order.source_type || order.type_vente || order.product_type || order.source_module || order.module_lie);
const qtySold = (order = {}) => Math.max(1, toNumber(order.quantity_sold ?? order.quantite_vendue ?? order.sale_quantity ?? order.order_quantity ?? order.quantite_commandee ?? order.quantite ?? order.quantity ?? 1));
const isSaleFinance = (tx = {}) => lower(`${tx.type || ''} ${tx.module_lie || ''} ${tx.source_module || ''} ${tx.categorie || ''} ${tx.libelle || ''}`).includes('vente') || lower(tx.type).includes('entree') || lower(tx.libelle).includes('encaissement');

function sameAmount(a, b) { return Math.abs(toNumber(a) - toNumber(b)) < 1; }
function findAsset(order, { stocks = [], lots = [], animaux = [], cultures = [] }) {
  const id = sourceIdOf(order);
  const type = sourceTypeOf(order);
  if (!id) return null;
  if (type.includes('stock')) return arr(stocks).find((row) => clean(row.id) === id);
  if (type.includes('lot') || type.includes('avicole')) return arr(lots).find((row) => clean(row.id) === id);
  if (type.includes('animal') || type.includes('animaux')) return arr(animaux).find((row) => clean(row.id) === id || clean(row.tag) === id);
  if (type.includes('culture')) return arr(cultures).find((row) => clean(row.id) === id);
  return arr(stocks).find((row) => clean(row.id) === id) || arr(lots).find((row) => clean(row.id) === id) || arr(animaux).find((row) => clean(row.id) === id || clean(row.tag) === id) || arr(cultures).find((row) => clean(row.id) === id);
}
function assetLinkedToSale(asset = {}, order = {}) {
  const id = clean(order.id);
  return [asset.last_sale_id, asset.sale_order_id, asset.commande_id, asset.vente_id, asset.linked_sale_id].some((value) => clean(value) === id);
}
function buildHealth(props) {
  const orders = arr(props.orders || props.rows);
  const payments = arr(props.payments || props.paymentsList);
  const transactions = arr(props.transactions);
  const invoices = arr(props.invoices || props.invoicesList);
  const deliveries = arr(props.deliveries || props.deliveriesList);
  const duplicatePayments = [];
  const missingFinance = [];
  const overpaid = [];
  const missingAssetUpdate = [];
  const missingInvoices = [];
  const missingDeliveries = [];

  orders.forEach((order) => {
    const orderPayments = payments.filter((payment) => paymentOrderId(payment) === clean(order.id));
    const paid = orderPayments.reduce((sum, payment) => sum + paymentAmount(payment), 0);
    const total = amount(order);
    if (total > 0 && paid > total + 1) overpaid.push({ order, paid, total });
    orderPayments.forEach((payment, index) => {
      const duplicateIndex = orderPayments.findIndex((candidate) => candidate !== payment && sameAmount(paymentAmount(candidate), paymentAmount(payment)) && clean(candidate.date || candidate.date_paiement) === clean(payment.date || payment.date_paiement));
      if (duplicateIndex >= 0 && duplicateIndex < index) duplicatePayments.push({ order, payment });
      const hasFinance = transactions.some((tx) => isSaleFinance(tx) && (financePaymentId(tx) === clean(payment.id) || (financeOrderId(tx) === clean(order.id) && sameAmount(tx.montant ?? tx.amount, paymentAmount(payment)))));
      if (!hasFinance) missingFinance.push({ order, payment });
    });
    const asset = findAsset(order, props);
    if (sourceIdOf(order) && asset && !assetLinkedToSale(asset, order)) missingAssetUpdate.push({ order, asset, qty: qtySold(order) });
    if (!invoices.some((invoice) => clean(invoice.order_id || invoice.sale_id || invoice.source_record_id || invoice.related_id) === clean(order.id))) missingInvoices.push(order);
    if (!deliveries.some((delivery) => clean(delivery.order_id || delivery.sale_id || delivery.source_record_id || delivery.related_id) === clean(order.id)) && !['annule', 'annulé', 'livre', 'livré'].includes(lower(order.statut_livraison || order.delivery_status))) missingDeliveries.push(order);
  });

  return { duplicatePayments, missingFinance, overpaid, missingAssetUpdate, missingInvoices, missingDeliveries };
}
function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border px-3 py-2 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-white'}`}><Icon size={14} className={danger ? 'text-amber-700' : 'text-[#9a6b12]'} /><b className="block text-[#2f2415] break-words">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>;
}
function List({ title, rows = [], empty, render }) {
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="font-black text-[#2f2415]">{title}</p><div className="mt-3 space-y-2 text-sm">{rows.length ? rows.slice(0, 4).map((item, idx) => <div key={`${title}-${idx}`} className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2">{render(item)}</div>) : <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">{empty}</div>}</div></div>;
}

export default function SalesWorkflowHealth(props) {
  const health = buildHealth(props);
  const issueCount = health.duplicatePayments.length + health.missingFinance.length + health.overpaid.length + health.missingAssetUpdate.length;
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><ShieldIcon /> Workflow vente</p><h3 className="text-xl font-black text-[#2f2415] mt-1">Paiements, stock, actifs et pièces</h3><p className="text-sm text-[#8a7456] mt-1">Contrôle rapide avant clôture : chaque vente doit encaisser, comptabiliser et mettre à jour l’actif vendu.</p></div>{issueCount ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="inline" /> {issueCount} point(s) à traiter</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={15} className="inline" /> Workflow cohérent</div>}</div>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 text-sm"><Mini icon={CreditCard} label="Paiements doublons" value={health.duplicatePayments.length} danger={health.duplicatePayments.length > 0} /><Mini icon={Receipt} label="Sans finance" value={health.missingFinance.length} danger={health.missingFinance.length > 0} /><Mini icon={AlertTriangle} label="Surpaiements" value={health.overpaid.length} danger={health.overpaid.length > 0} /><Mini icon={PackageCheck} label="Actifs non liés" value={health.missingAssetUpdate.length} danger={health.missingAssetUpdate.length > 0} /><Mini icon={Receipt} label="Factures manquantes" value={health.missingInvoices.length} danger={health.missingInvoices.length > 0} /><Mini icon={Truck} label="Livraisons à suivre" value={health.missingDeliveries.length} danger={health.missingDeliveries.length > 0} /></div>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3"><List title="Actifs à vérifier" rows={health.missingAssetUpdate} empty="Aucun actif vendu non lié." render={({ order, asset, qty }) => <><b className="text-[#2f2415]">{order.product_name || order.libelle || order.id}</b><p className="text-xs text-[#8a7456]">{sourceTypeOf(order) || 'source'} · {asset.name || asset.nom || asset.produit || asset.id} · quantité {fmtNumber(qty)}</p></>} /><List title="Paiements sans finance" rows={health.missingFinance} empty="Tous les paiements ont une écriture finance." render={({ order, payment }) => <><b className="text-[#2f2415]">{order.id} · {payment.id}</b><p className="text-xs text-[#8a7456]">{fmtCurrency(paymentAmount(payment))}</p></>} /><List title="Surpaiements / doublons" rows={[...health.overpaid, ...health.duplicatePayments]} empty="Aucun surpaiement ou doublon détecté." render={(item) => <><b className="text-[#2f2415]">{item.order?.id || 'Commande'}</b><p className="text-xs text-[#8a7456]">{item.payment ? `Doublon ${fmtCurrency(paymentAmount(item.payment))}` : `Payé ${fmtCurrency(item.paid)} / total ${fmtCurrency(item.total)}`}</p></>} /></div>
    <div className="flex flex-wrap justify-end gap-2"><Btn small variant="outline" onClick={() => props.onNavigate?.('finances')}>Ouvrir finances</Btn><Btn small variant="outline" onClick={() => props.onNavigate?.('stock')}>Ouvrir stock</Btn><Btn small variant="outline" onClick={() => props.onNavigate?.('documents')}>Ouvrir documents</Btn></div>
  </section>;
}
function ShieldIcon() { return <PackageCheck size={15} />; }
