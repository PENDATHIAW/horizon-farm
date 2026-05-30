import { CheckCircle2, CreditCard, Edit3, Eye, PackageCheck, Trash2, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { allocateOverheadToEntities, applyOperatingMargin } from '../services/operatingMarginService';
import { fmtCurrency, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { summarizeSalesMargins } from '../utils/salesMarginEngine';
import SaleActionModal from './SaleActionModal.jsx';

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
const costOf = (row = {}) => toNumber(row.cout_revient ?? row.cout_direct ?? 0);
const hasMissingCost = (row = {}) => Boolean(row.cout_a_completer || row.margin_reliable === false || (amount(row) > 0 && costOf(row) <= 0));
const netMarginOf = (row = {}) => toNumber(row.marge_nette_exploitation ?? row.marge_directe ?? row.marge ?? 0);
const netMarginRateOf = (row = {}) => toNumber(row.taux_marge_nette_exploitation ?? row.taux_marge_directe ?? row.marge_taux ?? 0);

function buildMarginContext(props, payments) {
  return {
    lots: props.lots || props.avicole || [],
    animaux: props.animaux || [],
    cultures: props.cultures || [],
    stocks: props.stocks || props.stock || [],
    alimentationLogs: props.alimentationLogs || props.alimentation_logs || [],
    productionLogs: props.productionLogs || props.production_oeufs_logs || [],
    vaccins: props.vaccins || props.sante || [],
    businessEvents: props.businessEvents || props.business_events || [],
    payments,
    transactions: props.transactions || [],
  };
}

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

async function deleteOrder(order, props) {
  if (!window.confirm(`Supprimer la vente ${order.id} (${productLabel(order)}) ? Cette action est irréversible.`)) return;
  try {
    await props.onDelete?.(order.id);
    await props.onRefresh?.();
    toast.success('Vente supprimée');
  } catch (error) {
    toast.error(error.message || 'Suppression impossible');
  }
}

function StatusBadge({ children, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'bg-emerald-100 text-emerald-700' : tone === 'warn' ? 'bg-amber-100 text-amber-800' : 'bg-[#f5ead7] text-[#7d6a4a]';
  return <span className={`rounded-full px-2 py-0.5 text-xs font-black ${cls}`}>{children}</span>;
}

function MarginCell({ row }) {
  if (hasMissingCost(row)) {
    return <td className="px-3 py-2 text-right"><span className="font-bold text-amber-700">Non fiable</span><p className="text-[11px] text-[#8a7456]">coût à compléter</p></td>;
  }
  const net = netMarginOf(row);
  const rate = netMarginRateOf(row);
  return <td className="px-3 py-2 text-right"><span className={`font-black ${net < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{fmtCurrency(net)}</span><p className="text-[11px] text-[#8a7456]">{rate}% · nette</p></td>;
}

function CostCell({ row }) {
  if (hasMissingCost(row)) return <td className="px-3 py-2 text-right"><span className="font-bold text-amber-700">À compléter</span></td>;
  return <td className="px-3 py-2 text-right font-black text-[#2f2415]" title={row.cout_source || ''}>{fmtCurrency(costOf(row))}</td>;
}

function ActionButtons({ order, props, payments, onOpen }) {
  const remaining = remainingFor(order, payments);
  const delivered = isDelivered(order);
  return <div className="flex flex-wrap justify-end gap-1"><button type="button" title="Voir" onClick={() => onOpen(order, 'view')} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black text-[#2f2415]"><Eye size={12} className="inline" /></button><button type="button" title="Modifier" onClick={() => onOpen(order, 'edit')} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black text-[#2f2415]"><Edit3 size={12} className="inline" /></button><button type="button" title="Supprimer" onClick={() => deleteOrder(order, props)} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-black text-red-700"><Trash2 size={12} className="inline" /></button>{remaining > 0 ? <button type="button" onClick={() => settleOrder(order, props, payments)} className="rounded-lg bg-[#2f2415] px-2 py-1 text-xs font-black text-white"><CreditCard size={12} className="inline" /> Encaisser</button> : null}{!delivered ? <button type="button" onClick={() => markDelivered(order, props)} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black text-[#2f2415]"><Truck size={12} className="inline" /> Livrée</button> : null}{remaining <= 0 && delivered ? <CheckCircle2 size={17} className="text-emerald-700 self-center" /> : null}</div>;
}

function MobileSaleCard({ order, payments, props, marginRow, onOpen }) {
  const remaining = remainingFor(order, payments);
  const delivered = isDelivered(order);
  return <article className="rounded-2xl border border-[#eadcc2] bg-white p-4 space-y-3 md:hidden"><div><p className="text-[11px] font-bold uppercase text-[#8a7456]">Vente</p><p className="font-black text-[#2f2415]">{productLabel(order)}</p><p className="text-xs text-[#8a7456]">{order.id} · {saleDate(order) || 'date non renseignée'}</p></div><div className="grid grid-cols-2 gap-2 text-sm"><div><p className="text-[11px] font-bold uppercase text-[#8a7456]">Client</p><p>{clientLabel(order)}</p></div><div><p className="text-[11px] font-bold uppercase text-[#8a7456]">Total</p><p className="font-black">{fmtCurrency(amount(order))}</p></div><div><p className="text-[11px] font-bold uppercase text-[#8a7456]">Reste</p><p className="font-black">{fmtCurrency(remaining)}</p></div><div><p className="text-[11px] font-bold uppercase text-[#8a7456]">Coût</p><p className="font-black">{hasMissingCost(marginRow) ? 'À compléter' : fmtCurrency(costOf(marginRow))}</p></div><div><p className="text-[11px] font-bold uppercase text-[#8a7456]">Marge nette</p><p className={`font-black ${hasMissingCost(marginRow) ? 'text-amber-700' : netMarginOf(marginRow) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{hasMissingCost(marginRow) ? 'Non fiable' : fmtCurrency(netMarginOf(marginRow))}</p></div><div><p className="text-[11px] font-bold uppercase text-[#8a7456]">Statut</p><div className="flex flex-wrap gap-1 mt-1"><StatusBadge tone={isPaid(order, payments) ? 'good' : 'warn'}>{isPaid(order, payments) ? 'Payée' : 'À encaisser'}</StatusBadge><StatusBadge tone={delivered ? 'good' : 'warn'}>{delivered ? 'Livrée' : 'À livrer'}</StatusBadge></div></div></div><ActionButtons order={order} props={props} payments={payments} onOpen={onOpen} /></article>;
}

export default function SalesFollowUpPanel(props) {
  const payments = arr(props.paymentsList || props.payments);
  const [selected, setSelected] = useState(null);
  const [initialMode, setInitialMode] = useState('view');
  const orders = useMemo(() => arr(props.rows).slice().sort((a, b) => clean(saleDate(b)).localeCompare(clean(saleDate(a)))), [props.rows]);
  const marginContext = useMemo(() => buildMarginContext(props, payments), [props.lots, props.avicole, props.animaux, props.cultures, props.stocks, props.stock, props.alimentationLogs, props.alimentation_logs, props.productionLogs, props.production_oeufs_logs, props.vaccins, props.sante, props.businessEvents, props.business_events, props.transactions, payments]);
  const enrichedOrders = useMemo(() => {
    const base = summarizeSalesMargins(orders, marginContext);
    const overhead = allocateOverheadToEntities({ module: 'ventes', entities: orders, transactions: marginContext.transactions });
    const allocated = overhead.perEntity;
    return base.details.map((row) => {
      if (hasMissingCost(row)) return row;
      const margin = applyOperatingMargin({ directRevenue: amount(row), directCosts: costOf(row), rhCost: allocated.rhCost, operatingCost: allocated.operatingCost });
      return { ...row, cout_rh_alloue: margin.rhCost, cout_exploitation_alloue: margin.operatingCost, marge_nette_exploitation: margin.netOperatingMargin, taux_marge_nette_exploitation: Number(margin.netMarginRate.toFixed(1)) };
    });
  }, [orders, marginContext]);
  const marginById = useMemo(() => new Map(enrichedOrders.map((row) => [String(row.id), row])), [enrichedOrders]);
  const openSale = (order, mode = 'view') => { setSelected(order); setInitialMode(mode); };
  const missingCostCount = enrichedOrders.filter(hasMissingCost).length;

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    {selected ? <SaleActionModal sale={selected} payments={payments} props={props} initialMode={initialMode} marginDetail={marginById.get(String(selected.id))} onClose={() => setSelected(null)} /> : null}
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><PackageCheck size={15} /> Suivi des ventes</p>
        <h3 className="text-xl font-black text-[#2f2415] mt-1">Historique, marges et actions</h3>
        <p className="text-sm text-[#8a7456] mt-1">Consultez, modifiez ou supprimez chaque vente. La marge nette intègre coûts directs, alimentation, santé, stock source et charges RH/exploitation allouées.</p>
      </div>
      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#7d6a4a]">{orders.length} vente(s){missingCostCount ? ` · ${missingCostCount} coût(s) à compléter` : ''}</div>
    </div>
    {missingCostCount ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{missingCostCount} vente(s) sans coût source fiable : la marge est neutralisée jusqu’à complétion des coûts (stock, lot, animal ou culture lié).</div> : null}
    <div className="space-y-3 md:hidden">{orders.length ? orders.map((order) => <MobileSaleCard key={order.id} order={order} payments={payments} props={props} marginRow={marginById.get(String(order.id)) || order} onOpen={openSale} />) : <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-6 text-center text-[#8a7456]">Aucune vente enregistrée pour le moment.</div>}</div>
    <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#eadcc2] bg-[#fffdf8]">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-[#eadcc2] bg-[#fffdf8] text-left text-xs uppercase tracking-wide text-[#8a7456]">
            <th scope="col" className="px-3 py-3 font-black">Date</th>
            <th scope="col" className="px-3 py-3 font-black">Vente</th>
            <th scope="col" className="px-3 py-3 font-black">Client</th>
            <th scope="col" className="px-3 py-3 font-black text-right">Total</th>
            <th scope="col" className="px-3 py-3 font-black text-right">Payé</th>
            <th scope="col" className="px-3 py-3 font-black text-right">Reste</th>
            <th scope="col" className="px-3 py-3 font-black text-right">Coût</th>
            <th scope="col" className="px-3 py-3 font-black text-right">Marge nette</th>
            <th scope="col" className="px-3 py-3 font-black">Statut</th>
            <th scope="col" className="px-3 py-3 font-black text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.length ? orders.map((order) => {
            const marginRow = marginById.get(String(order.id)) || order;
            const remaining = remainingFor(order, payments);
            const delivered = isDelivered(order);
            return <tr key={order.id} className="border-t border-[#eadcc2] hover:bg-white">
              <td className="px-3 py-2 text-[#7d6a4a] whitespace-nowrap">{saleDate(order) || '—'}</td>
              <td className="px-3 py-2"><b className="text-[#2f2415]">{productLabel(order)}</b><p className="text-xs text-[#8a7456]">{order.id}</p></td>
              <td className="px-3 py-2 text-[#7d6a4a]">{clientLabel(order)}</td>
              <td className="px-3 py-2 text-right font-black text-[#2f2415]">{fmtCurrency(amount(order))}</td>
              <td className="px-3 py-2 text-right text-[#2f2415]">{fmtCurrency(paidFor(order, payments))}</td>
              <td className="px-3 py-2 text-right font-black text-[#2f2415]">{fmtCurrency(remaining)}</td>
              <CostCell row={marginRow} />
              <MarginCell row={marginRow} />
              <td className="px-3 py-2"><div className="flex flex-wrap gap-1"><StatusBadge tone={isPaid(order, payments) ? 'good' : 'warn'}>{isPaid(order, payments) ? 'Payée' : 'À encaisser'}</StatusBadge><StatusBadge tone={delivered ? 'good' : 'warn'}>{delivered ? 'Livrée' : 'À livrer'}</StatusBadge></div></td>
              <td className="px-3 py-2"><ActionButtons order={order} props={props} payments={payments} onOpen={openSale} /></td>
            </tr>;
          }) : <tr><td colSpan="10" className="px-3 py-6 text-center text-[#8a7456]">Aucune vente enregistrée pour le moment.</td></tr>}
        </tbody>
      </table>
    </div>
  </section>;
}
