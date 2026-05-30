import { CheckCircle2, CreditCard, PackageCheck, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmtCurrency, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();
const amount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.montant);
const paidOrder = (row = {}) => toNumber(row.montant_paye ?? row.paid_amount ?? row.amount_paid);
const paymentAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount);
const orderIdOf = (payment = {}) => clean(payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id || payment.commande_id);
const saleDate = (row = {}) => clean(row.date || row.date_vente || row.order_date || row.created_at).slice(0, 10);
const clientLabel = (row = {}) => clean(row.client_label || row.client_name || row.customer_name || row.client_id || 'Client');
const productLabel = (row = {}) => clean(row.product_name || row.produit || row.libelle || row.source_label || 'Vente');
const paidFor = (order, payments = []) => Math.max(paidOrder(order), arr(payments).filter((payment) => orderIdOf(payment) === clean(order.id)).reduce((sum, payment) => sum + paymentAmount(payment), 0));
const remainingFor = (order, payments = []) => Math.max(0, amount(order) - paidFor(order, payments));
const isDelivered = (order = {}) => ['livre', 'livré', 'recupere', 'récupéré'].includes(lower(order.statut_livraison || order.delivery_status || order.fulfillment_mode));
const isPaid = (order, payments) => remainingFor(order, payments) <= 0;

async function settleOrder(order, props, payments) {
  const remaining = remainingFor(order, payments);
  if (remaining <= 0) return toast('Vente déjà encaissée');
  const paymentId = makeId('PAY');
  const date = new Date().toISOString().slice(0, 10);
  await props.onCreatePayment?.({ id: paymentId, order_id: order.id, sale_id: order.id, source_record_id: order.id, client_id: order.client_id || '', invoice_id: order.invoice_id || '', date_paiement: date, date, montant: remaining, montant_paye: remaining, amount: remaining, moyen_paiement: order.moyen_paiement || order.payment_method || 'especes', mode_paiement: order.moyen_paiement || order.payment_method || 'especes', statut: 'paye' });
  await props.onCreateFinanceTransaction?.({ id: makeId('TRX'), type: 'entree', libelle: `Solde vente ${order.id} - ${clientLabel(order)}`, montant: remaining, date, categorie: 'Vente', module_lie: 'ventes', related_id: order.id, vente_id: order.id, client_id: order.client_id || '', statut: 'paye', source_module: 'ventes', source_record_id: order.id, invoice_id: order.invoice_id || '', payment_id: paymentId, moyen_paiement: order.moyen_paiement || order.payment_method || 'especes' });
  await props.onUpdate?.(order.id, { montant_paye: amount(order), reste_a_payer: 0, statut_paiement: 'paye', payment_status: 'paye' });
  await Promise.allSettled([props.onRefresh?.(), props.onRefreshPayments?.(), props.onRefreshFinances?.()]);
  toast.success('Vente encaissée');
}

async function markDelivered(order, props) {
  const date = new Date().toISOString().slice(0, 10);
  await props.onUpdate?.(order.id, { statut_commande: 'livre', statut_livraison: 'livre', delivery_status: 'livre', fulfillment_mode: 'livraison', date_livraison: date });
  const existingDelivery = arr(props.deliveriesList || props.deliveries).find((delivery) => clean(delivery.order_id || delivery.sale_id || delivery.source_record_id || delivery.related_id) === clean(order.id));
  if (existingDelivery?.id && props.onUpdateDelivery) await props.onUpdateDelivery(existingDelivery.id, { statut: 'livre', status: 'livre', date_livraison: date });
  else await props.onCreateDelivery?.({ id: makeId('LIV'), order_id: order.id, sale_id: order.id, date_livraison: date, statut: 'livre', status: 'livre', mode_livraison: 'livraison', destinataire: clientLabel(order), client_id: order.client_id || '' });
  await Promise.allSettled([props.onRefresh?.(), props.onRefreshDeliveries?.()]);
  toast.success('Livraison clôturée');
}

function StatusBadge({ children, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'bg-emerald-100 text-emerald-700' : tone === 'warn' ? 'bg-amber-100 text-amber-800' : 'bg-[#f5ead7] text-[#7d6a4a]';
  return <span className={`rounded-full px-2 py-0.5 text-xs font-black ${cls}`}>{children}</span>;
}

export default function SalesFollowUpPanel(props) {
  const orders = arr(props.rows).slice().sort((a, b) => clean(saleDate(b)).localeCompare(clean(saleDate(a)))).slice(0, 8);
  const payments = arr(props.paymentsList || props.payments);
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><PackageCheck size={15} /> Suivi des ventes</p><h3 className="text-xl font-black text-[#2f2415] mt-1">Encaissements, livraisons et statuts</h3><p className="text-sm text-[#8a7456] mt-1">Les actions rapides complètent les ventes déjà créées sans afficher de synchronisation technique.</p></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#7d6a4a]">{orders.length} vente(s) récente(s)</div></div>
    <div className="overflow-x-auto rounded-2xl border border-[#eadcc2] bg-[#fffdf8]"><table className="min-w-full text-sm"><thead className="bg-[#2f2415] text-white"><tr><th className="px-3 py-2 text-left">Vente</th><th className="px-3 py-2 text-left">Client</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-right">Reste</th><th className="px-3 py-2 text-left">Statut</th><th className="px-3 py-2 text-right">Actions</th></tr></thead><tbody>{orders.length ? orders.map((order) => { const remaining = remainingFor(order, payments); const delivered = isDelivered(order); return <tr key={order.id} className="border-t border-[#eadcc2]"><td className="px-3 py-2"><b className="text-[#2f2415]">{productLabel(order)}</b><p className="text-xs text-[#8a7456]">{order.id} · {saleDate(order) || 'date non renseignée'}</p></td><td className="px-3 py-2 text-[#7d6a4a]">{clientLabel(order)}</td><td className="px-3 py-2 text-right font-black text-[#2f2415]">{fmtCurrency(amount(order))}</td><td className="px-3 py-2 text-right font-black text-[#2f2415]">{fmtCurrency(remaining)}</td><td className="px-3 py-2"><div className="flex flex-wrap gap-1"><StatusBadge tone={isPaid(order, payments) ? 'good' : 'warn'}>{isPaid(order, payments) ? 'Payée' : 'À encaisser'}</StatusBadge><StatusBadge tone={delivered ? 'good' : 'warn'}>{delivered ? 'Livrée' : 'À livrer'}</StatusBadge></div></td><td className="px-3 py-2"><div className="flex justify-end gap-2">{remaining > 0 ? <button type="button" onClick={() => settleOrder(order, props, payments)} className="rounded-lg bg-[#2f2415] px-2 py-1 text-xs font-black text-white"><CreditCard size={12} className="inline" /> Encaisser</button> : null}{!delivered ? <button type="button" onClick={() => markDelivered(order, props)} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black text-[#2f2415]"><Truck size={12} className="inline" /> Livrée</button> : null}{remaining <= 0 && delivered ? <CheckCircle2 size={17} className="text-emerald-700" /> : null}</div></td></tr>; }) : <tr><td colSpan="6" className="px-3 py-6 text-center text-[#8a7456]">Aucune vente enregistrée pour le moment.</td></tr>}</tbody></table></div>
  </section>;
}
