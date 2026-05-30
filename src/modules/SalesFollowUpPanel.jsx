import { CheckCircle2, CreditCard, Edit3, Eye, PackageCheck, Trash2, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { allocateOverheadToEntities, applyOperatingMargin } from '../services/operatingMarginService';
import { fmtCurrency, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { summarizeSalesMargins } from '../utils/salesMarginEngine';
import { costBreakdownOf, costBreakdownShort, costBreakdownTooltip, productAmountOf, SALES_MARGIN_FORMULA } from '../utils/saleCostPresentation';
import { saleQuantityDetail } from '../utils/saleQuantityLabel';
import { paidForOrder, remainingForOrder } from '../utils/salesStatuses';
import { deleteSaleComplete } from '../utils/salesDeleteWorkflow';
import { isDelivered, linkedPaymentsForOrders, saleAmount } from './commercial/commercialMetrics.js';
import SaleActionModal from './SaleActionModal.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').trim();
const saleDate = (row = {}) => clean(row.date || row.date_vente || row.order_date || row.created_at).slice(0, 10);
const clientLabel = (row = {}) => clean(row.client_label || row.client_name || row.customer_name || row.client_id || 'Client');
const productLabel = (row = {}) => clean(row.product_name || row.produit || row.libelle || row.source_label || 'Vente');
const isPaid = (order, linkedPayments) => remainingForOrder(order, linkedPayments) <= 0;
const costOf = (row = {}) => toNumber(row.cout_revient ?? row.cout_direct ?? 0);
const hasMissingCost = (row = {}) => Boolean(row.cout_a_completer || row.margin_reliable === false || (saleAmount(row) > 0 && costOf(row) <= 0));
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

async function settleOrder(order, props, linkedPayments) {
  const remaining = remainingForOrder(order, linkedPayments);
  if (remaining <= 0) return toast('Vente déjà encaissée');
  const paymentId = makeId('PAY');
  const date = new Date().toISOString().slice(0, 10);
  await props.onCreatePayment?.({ id: paymentId, order_id: order.id, sale_id: order.id, source_record_id: order.id, client_id: order.client_id || '', invoice_id: order.invoice_id || '', date_paiement: date, date, montant: remaining, montant_paye: remaining, amount: remaining, moyen_paiement: order.moyen_paiement || order.payment_method || 'especes', mode_paiement: order.moyen_paiement || order.payment_method || 'especes', statut: 'paye' });
  await props.onCreateFinanceTransaction?.({ id: makeId('TRX'), type: 'entree', libelle: `Solde vente ${order.id} - ${clientLabel(order)}`, montant: remaining, date, categorie: 'Vente', module_lie: 'ventes', related_id: order.id, vente_id: order.id, client_id: order.client_id || '', statut: 'paye', source_module: 'ventes', source_record_id: order.id, invoice_id: order.invoice_id || '', payment_id: paymentId, moyen_paiement: order.moyen_paiement || order.payment_method || 'especes' });
  await props.onUpdate?.(order.id, { montant_paye: saleAmount(order), reste_a_payer: 0, statut_paiement: 'paye', payment_status: 'paye' });
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
  if (!window.confirm(`Supprimer la vente ${order.id} (${productLabel(order)}) et toutes les pièces liées (paiements, facture, livraison) ?`)) return;
  try {
    const result = await deleteSaleComplete(order, {
      payments: props.paymentsList || props.payments || [],
      invoices: props.invoicesList || props.invoices || [],
      deliveries: props.deliveriesList || props.deliveries || [],
      documents: props.documents || props.documentsList || [],
      transactions: props.transactions || [],
      onDeletePayment: props.onDeletePayment,
      onDeleteInvoice: props.onDeleteInvoice,
      onDeleteDelivery: props.onDeleteDelivery,
      onDeleteDocument: props.onDeleteDocument,
      onDeleteFinanceTransaction: props.onDeleteFinanceTransaction || props.onDeleteTransaction,
      onDeleteOrder: props.onDelete,
      onRefresh: props.onRefresh,
      onRefreshPayments: props.onRefreshPayments,
      onRefreshInvoices: props.onRefreshInvoices,
      onRefreshDeliveries: props.onRefreshDeliveries,
      onRefreshFinances: props.onRefreshFinances,
      onRefreshDocuments: props.onRefreshDocuments,
    });
    toast.success(`Vente supprimée (${result.removed.payments} paiement(s), ${result.removed.invoices} facture(s))`);
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
    return <td className="px-5 py-4 text-right align-top"><span className="font-bold text-amber-700">Non fiable</span><p className="text-[11px] text-[#8a7456] mt-1">coût à compléter</p></td>;
  }
  const net = netMarginOf(row);
  const rate = netMarginRateOf(row);
  return <td className="px-5 py-4 text-right align-top"><span className={`font-black text-base ${net < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{fmtCurrency(net)}</span><p className="text-[11px] text-[#8a7456] mt-1">{rate}% · nette</p></td>;
}

function CostCell({ row, order, deliveries }) {
  const qty = saleQuantityDetail(order || row);
  const breakdown = costBreakdownOf(row, order, deliveries);
  const tooltip = hasMissingCost(row)
    ? 'Coût source manquant : lier la vente à son lot, animal, stock ou culture et compléter les données de production.'
    : costBreakdownTooltip(breakdown) || row.cout_source || row.source_label || '';
  if (hasMissingCost(row)) {
    return <td className="px-5 py-4 text-right align-top"><span className="font-bold text-amber-700">À compléter</span><p className="text-[11px] text-[#8a7456] mt-1 max-w-[200px] ml-auto">source production</p></td>;
  }
  const unitHint = qty.isEggSale && qty.plateaux > 0
    ? `${fmtCurrency(breakdown.productionCost / qty.plateaux)} / plateau`
    : !qty.isEggSale && breakdown.productionCost > 0 && toNumber(order?.quantity ?? order?.quantite) > 0
      ? `${fmtCurrency(breakdown.productionCost / toNumber(order.quantity ?? order.quantite))} / unité`
      : null;
  return <td className="px-5 py-4 text-right align-top font-black text-[#2f2415]" title={tooltip}><span>{fmtCurrency(costOf(row))}</span>{breakdown.lines.length ? <p className="text-[11px] font-normal text-[#8a7456] mt-1 max-w-[220px] ml-auto leading-snug">{costBreakdownShort(breakdown, 3)}</p> : null}{unitHint ? <p className="text-[11px] font-normal text-[#8a7456] mt-0.5">{unitHint}</p> : null}</td>;
}

function ActionButtons({ order, props, linkedPayments, onOpen }) {
  const remaining = remainingForOrder(order, linkedPayments);
  const delivered = isDelivered(order);
  return <div className="flex flex-wrap justify-end gap-1"><button type="button" title="Voir" onClick={() => onOpen(order, 'view')} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black text-[#2f2415]"><Eye size={12} className="inline" /></button><button type="button" title="Modifier" onClick={() => onOpen(order, 'edit')} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black text-[#2f2415]"><Edit3 size={12} className="inline" /></button><button type="button" title="Supprimer" onClick={() => deleteOrder(order, props)} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-black text-red-700"><Trash2 size={12} className="inline" /></button>{remaining > 0 ? <button type="button" onClick={() => settleOrder(order, props, linkedPayments)} className="rounded-lg bg-[#2f2415] px-2 py-1 text-xs font-black text-white"><CreditCard size={12} className="inline" /> Encaisser</button> : null}{!delivered ? <button type="button" onClick={() => markDelivered(order, props)} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black text-[#2f2415]"><Truck size={12} className="inline" /> Livrée</button> : null}{remaining <= 0 && delivered ? <CheckCircle2 size={17} className="text-emerald-700 self-center" /> : null}</div>;
}

function MobileSaleCard({ order, linkedPayments, props, marginRow, deliveries, onOpen }) {
  const remaining = remainingForOrder(order, linkedPayments);
  const delivered = isDelivered(order);
  const qty = saleQuantityDetail(order);
  const productTotal = productAmountOf(order, deliveries);
  const breakdown = costBreakdownOf(marginRow, order, deliveries);
  const total = saleAmount(order);
  return <article className="rounded-2xl border border-[#eadcc2] bg-white p-5 space-y-4 md:hidden"><div><p className="text-[11px] font-bold uppercase text-[#8a7456]">Vente</p><p className="font-black text-[#2f2415]">{productLabel(order)}</p><p className="text-xs text-[#8a7456]">{order.id} · {saleDate(order) || 'date non renseignée'}</p><p className="text-sm font-bold text-[#2f2415] mt-2">{qty.label}</p></div><div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-[11px] font-bold uppercase text-[#8a7456]">Client</p><p>{clientLabel(order)}</p></div><div><p className="text-[11px] font-bold uppercase text-[#8a7456]">Produits</p><p className="font-black">{fmtCurrency(productTotal)}</p></div><div><p className="text-[11px] font-bold uppercase text-[#8a7456]">Total</p><p className="font-black">{fmtCurrency(total)}</p></div><div><p className="text-[11px] font-bold uppercase text-[#8a7456]">Reste</p><p className="font-black">{fmtCurrency(remaining)}</p></div><div className="col-span-2"><p className="text-[11px] font-bold uppercase text-[#8a7456]">Coût direct</p><p className="font-black">{hasMissingCost(marginRow) ? 'À compléter' : fmtCurrency(costOf(marginRow))}</p>{!hasMissingCost(marginRow) && breakdown.lines.length ? <p className="text-xs text-[#8a7456] mt-1">{costBreakdownShort(breakdown, 4)}</p> : null}</div><div><p className="text-[11px] font-bold uppercase text-[#8a7456]">Marge nette</p><p className={`font-black ${hasMissingCost(marginRow) ? 'text-amber-700' : netMarginOf(marginRow) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{hasMissingCost(marginRow) ? 'Non fiable' : fmtCurrency(netMarginOf(marginRow))}</p></div><div><p className="text-[11px] font-bold uppercase text-[#8a7456]">Statut</p><div className="flex flex-wrap gap-1 mt-1"><StatusBadge tone={isPaid(order, linkedPayments) ? 'good' : 'warn'}>{isPaid(order, linkedPayments) ? 'Payée' : 'À encaisser'}</StatusBadge><StatusBadge tone={delivered ? 'good' : 'warn'}>{delivered ? 'Livrée' : 'À livrer'}</StatusBadge></div></div></div><ActionButtons order={order} props={props} linkedPayments={linkedPayments} onOpen={onOpen} /></article>;
}

export default function SalesFollowUpPanel(props) {
  const payments = arr(props.paymentsList || props.payments);
  const deliveries = arr(props.deliveriesList || props.deliveries);
  const [selected, setSelected] = useState(null);
  const [initialMode, setInitialMode] = useState('view');
  const orders = useMemo(() => arr(props.rows).slice().sort((a, b) => clean(saleDate(b)).localeCompare(clean(saleDate(a)))), [props.rows]);
  const linkedPayments = useMemo(() => linkedPaymentsForOrders(orders, payments), [orders, payments]);
  const marginContext = useMemo(() => buildMarginContext(props, payments), [props.lots, props.avicole, props.animaux, props.cultures, props.stocks, props.stock, props.alimentationLogs, props.alimentation_logs, props.productionLogs, props.production_oeufs_logs, props.vaccins, props.sante, props.businessEvents, props.business_events, props.transactions, payments]);
  const enrichedOrders = useMemo(() => {
    const base = summarizeSalesMargins(orders, marginContext);
    const overhead = allocateOverheadToEntities({ module: 'ventes', entities: orders, transactions: marginContext.transactions });
    const allocated = overhead.perEntity;
    return base.details.map((row) => {
      if (hasMissingCost(row)) return row;
      const margin = applyOperatingMargin({ directRevenue: saleAmount(row), directCosts: costOf(row), rhCost: allocated.rhCost, operatingCost: allocated.operatingCost });
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
        <p className="text-sm text-[#8a7456] mt-1">Un seul coût direct par vente (production + livraison + pertes). La marge nette déduit en plus les charges RH et d’exploitation allouées.</p>
      </div>
      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#7d6a4a]">{orders.length} vente(s){missingCostCount ? ` · ${missingCostCount} coût(s) à compléter` : ''}</div>
    </div>
    {missingCostCount ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{missingCostCount} vente(s) sans coût source fiable. Lier chaque vente à sa source (lot chair, lot pondeuse, animal, stock ou culture) et compléter alimentation / production dans le module concerné.</div> : null}
    <details className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#7d6a4a]"><summary className="cursor-pointer font-black text-[#2f2415]">Comment est calculée la marge ?</summary><p className="mt-3 leading-relaxed">{SALES_MARGIN_FORMULA}</p><p className="mt-2 text-xs">Livraison : comptée uniquement si mode livré/à livrer et montant renseigné — retrait sur place = 0 FCFA. Viande abattue : vendre depuis le stock (kg), coût déjà consolidé au journal d’abattage.</p></details>
    <div className="space-y-3 md:hidden">{orders.length ? orders.map((order) => <MobileSaleCard key={order.id} order={order} linkedPayments={linkedPayments} props={props} marginRow={marginById.get(String(order.id)) || order} deliveries={deliveries} onOpen={openSale} />) : <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-6 text-center text-[#8a7456]">Aucune vente enregistrée pour le moment.</div>}</div>
    <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#eadcc2] bg-[#fffdf8] -mx-1 px-1">
      <table className="min-w-[1580px] w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="border-b-2 border-[#d6c3a0] bg-[#fffdf8] text-left text-xs uppercase tracking-wide text-[#8a7456]">
            <th scope="col" className="px-5 py-4 font-black whitespace-nowrap">Date</th>
            <th scope="col" className="px-5 py-4 font-black min-w-[200px]">Vente</th>
            <th scope="col" className="px-5 py-4 font-black min-w-[140px]">Quantité</th>
            <th scope="col" className="px-5 py-4 font-black min-w-[120px]">Client</th>
            <th scope="col" className="px-5 py-4 font-black text-right whitespace-nowrap" title="Montant produits hors livraison">Produits</th>
            <th scope="col" className="px-5 py-4 font-black text-right whitespace-nowrap">Total</th>
            <th scope="col" className="px-5 py-4 font-black text-right whitespace-nowrap">Payé</th>
            <th scope="col" className="px-5 py-4 font-black text-right whitespace-nowrap">Reste</th>
            <th scope="col" className="px-5 py-4 font-black text-right min-w-[180px]" title="Production + livraison + pertes (calcul unique)">Coût direct</th>
            <th scope="col" className="px-5 py-4 font-black text-right min-w-[120px]">Marge nette</th>
            <th scope="col" className="px-5 py-4 font-black min-w-[140px]">Statut</th>
            <th scope="col" className="px-5 py-4 font-black text-right min-w-[180px]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.length ? orders.map((order) => {
            const marginRow = marginById.get(String(order.id)) || order;
            const remaining = remainingForOrder(order, linkedPayments);
            const delivered = isDelivered(order);
            const qty = saleQuantityDetail(order);
            const productTotal = productAmountOf(order, deliveries);
            const total = saleAmount(order);
            return <tr key={order.id} className="border-t border-[#eadcc2] hover:bg-white align-top">
              <td className="px-5 py-4 text-[#7d6a4a] whitespace-nowrap">{saleDate(order) || '—'}</td>
              <td className="px-5 py-4"><b className="text-[#2f2415] text-base">{productLabel(order)}</b><p className="text-xs text-[#8a7456] mt-1">{order.id}</p>{marginRow.source_label ? <p className="text-[11px] text-[#8a7456] mt-1">Source : {marginRow.source_label}</p> : null}</td>
              <td className="px-5 py-4 font-bold text-[#2f2415]">{qty.label}</td>
              <td className="px-5 py-4 text-[#7d6a4a]">{clientLabel(order)}</td>
              <td className="px-5 py-4 text-right text-[#2f2415] whitespace-nowrap">{fmtCurrency(productTotal)}</td>
              <td className="px-5 py-4 text-right font-black text-[#2f2415] whitespace-nowrap">{fmtCurrency(total)}</td>
              <td className="px-5 py-4 text-right text-[#2f2415] whitespace-nowrap">{fmtCurrency(paidForOrder(order, linkedPayments))}</td>
              <td className="px-5 py-4 text-right font-black text-[#2f2415] whitespace-nowrap">{fmtCurrency(remaining)}</td>
              <CostCell row={marginRow} order={order} deliveries={deliveries} />
              <MarginCell row={marginRow} />
              <td className="px-5 py-4"><div className="flex flex-wrap gap-1.5"><StatusBadge tone={isPaid(order, linkedPayments) ? 'good' : 'warn'}>{isPaid(order, linkedPayments) ? 'Payée' : 'À encaisser'}</StatusBadge><StatusBadge tone={delivered ? 'good' : 'warn'}>{delivered ? 'Livrée' : 'À livrer'}</StatusBadge></div></td>
              <td className="px-5 py-4"><ActionButtons order={order} props={props} linkedPayments={linkedPayments} onOpen={openSale} /></td>
            </tr>;
          }) : <tr><td colSpan="12" className="px-5 py-8 text-center text-[#8a7456]">Aucune vente enregistrée pour le moment.</td></tr>}
        </tbody>
      </table>
    </div>
  </section>;
}
