import { AlertTriangle, BarChart3, CheckCircle2, ChevronDown, CreditCard, Receipt, ShieldCheck, Truck } from 'lucide-react';
import { useState } from 'react';
import ObjectivePerformanceCard from '../components/ObjectivePerformanceCard.jsx';
import { fmtCurrency } from '../utils/format';
import { enrichSalesOrderStatus, remainingForOrder } from '../utils/salesStatuses';
import SalesEvolution from './SalesEvolution.jsx';
import SalesMarginsBridge from './SalesMarginsBridge.jsx';
import VentesV2 from './VentesV2.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const amount = (row = {}) => Number(row.montant_total ?? row.total ?? row.amount ?? row.total_amount ?? 0) || 0;
const isNotClosed = (value = '') => !['livre', 'livré', 'termine', 'terminé', 'annule', 'annulé', 'cancelled'].includes(String(value || '').toLowerCase());

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} aria-hidden="true" /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

function CollapsibleSection({ icon: Icon, title, subtitle, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white shadow-sm overflow-hidden"><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex min-h-[64px] w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-[#fffdf8] transition-colors duration-200"><span><span className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} aria-hidden="true" /> {title}</span>{subtitle ? <span className="mt-1 block text-sm text-[#8a7456]">{subtitle}</span> : null}</span><ChevronDown size={20} className={`shrink-0 text-[#8a7456] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" /></button>{open ? <div className="border-t border-[#eadcc2] p-5 space-y-4">{children}</div> : null}</section>;
}

function SalesPrioritySummary({ orders = [], payments = [], deliveries = [], invoices = [] }) {
  const enriched = arr(orders).map((order) => enrichSalesOrderStatus(order, payments));
  const unpaid = enriched.filter((order) => remainingForOrder(order, payments) > 0).sort((a, b) => remainingForOrder(b, payments) - remainingForOrder(a, payments));
  const unpaidTotal = unpaid.reduce((sum, order) => sum + remainingForOrder(order, payments), 0);
  const deliveryPending = enriched.filter((order) => isNotClosed(order.delivery_status || order.statut_livraison || order.order_status)).slice(0, 5);
  const invoiceMissing = enriched.filter((order) => !order.invoice_id && !arr(invoices).some((invoice) => String(invoice.order_id || invoice.sale_id) === String(order.id))).slice(0, 5);
  const totalCa = enriched.reduce((sum, order) => sum + amount(order), 0);
  const deliveredIds = new Set(arr(deliveries).map((delivery) => String(delivery.order_id || delivery.sale_id || delivery.source_record_id || '')));
  const notDelivered = deliveryPending.filter((order) => !deliveredIds.has(String(order.id)));
  const calm = !unpaid.length && !notDelivered.length && !invoiceMissing.length;

  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-4">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm"><Mini icon={Receipt} label="CA" value={fmtCurrency(totalCa)} /><Mini icon={CreditCard} label="À encaisser" value={fmtCurrency(unpaidTotal)} /><Mini icon={Truck} label="À livrer" value={notDelivered.length} /><Mini icon={AlertTriangle} label="Factures" value={invoiceMissing.length} /></div>
    {calm ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={14} className="inline" aria-hidden="true" /> Rien de critique côté ventes : encaissements, livraisons et factures semblent maîtrisés.</div> : <div className="grid grid-cols-1 xl:grid-cols-3 gap-3"><PriorityList title="Encaisser" rows={unpaid.slice(0, 3)} empty="Aucun reste à encaisser" render={(order) => `${order.product_name || order.libelle || order.id} · ${fmtCurrency(remainingForOrder(order, payments))}`} tone="warning" /><PriorityList title="Livrer / clôturer" rows={notDelivered.slice(0, 3)} empty="Aucune livraison bloquante" render={(order) => `${order.product_name || order.libelle || order.id} · ${order.order_status_label || order.statut || 'à suivre'}`} tone="neutral" /><PriorityList title="Facturer" rows={invoiceMissing.slice(0, 3)} empty="Aucune facture manquante" render={(order) => `${order.product_name || order.libelle || order.id} · ${fmtCurrency(amount(order))}`} tone="danger" /></div>}
  </div>;
}
function PriorityList({ title, rows = [], empty, render, tone = 'neutral' }) {
  const cls = tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#eadcc2] bg-white text-[#7d6a4a]';
  return <div className={`rounded-2xl border p-3 ${cls}`}><p className="font-black text-[#2f2415]">{title}</p><div className="mt-2 space-y-2 text-sm">{rows.length ? rows.map((row) => <div key={row.id} className="rounded-xl bg-white/70 px-3 py-2">{render(row)}</div>) : <div className="rounded-xl bg-white/70 px-3 py-2">{empty}</div>}</div></div>;
}
function Mini({ icon: Icon, label, value }) {
  return <div className="rounded-xl bg-white border border-[#eadcc2] px-3 py-2 min-w-0"><Icon size={14} className="text-[#9a6b12]" aria-hidden="true" /><b className="block text-[#2f2415] break-words">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>;
}

export default function VentesV3(props) {
  const payments = props.paymentsList || props.payments || [];
  const dataMap = {
    sales_orders: props.rows || [],
    payments,
    finances: props.transactions || [],
    avicole: props.lots || [],
    animaux: props.animaux || [],
    cultures: props.cultures || [],
    stock: props.stocks || [],
  };

  return <div className="space-y-5 ventes-mobile-structured"><style>{`@media (max-width: 640px){.ventes-mobile-structured .rounded-2xl{border-radius:18px}.ventes-mobile-structured table{font-size:12px}.ventes-mobile-structured th,.ventes-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.ventes-mobile-structured .text-2xl{font-size:1.35rem}.ventes-mobile-structured .grid{gap:.75rem}.ventes-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>
    <ModuleSection icon={Receipt} title="Synthèse commerciale" subtitle="L’essentiel : objectif, CA, encaissements, livraisons et factures à traiter.">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4"><ObjectivePerformanceCard dataMap={dataMap} activity="global" title="Objectif & performance" compact onNavigate={props.onNavigate} /><SalesPrioritySummary orders={props.rows || []} payments={payments} deliveries={props.deliveriesList || props.deliveries || []} invoices={props.invoicesList || props.invoices || []} /></div>
    </ModuleSection>
    <ModuleSection icon={CreditCard} title="Vendre & encaisser" subtitle="Créer une vente, suivre paiements, factures, livraisons et statuts."><VentesV2 {...props} /></ModuleSection>
    <CollapsibleSection icon={ShieldCheck} title="Pilotage avancé" subtitle="Marges fiables et évolution des ventes, à ouvrir seulement pour analyser." defaultOpen={false}>
      <SalesMarginsBridge rows={props.rows || []} payments={payments} transactions={props.transactions || []} lots={props.lots || []} animaux={props.animaux || []} cultures={props.cultures || []} stocks={props.stocks || []} alimentationLogs={props.alimentationLogs || []} productionLogs={props.productionLogs || []} vaccins={props.vaccins || []} businessEvents={props.businessEvents || []} onUpdate={props.onUpdate} onRefresh={props.onRefresh} />
      <SalesEvolution rows={props.rows || []} payments={payments} opportunities={props.opportunities || []} lots={props.lots || []} animaux={props.animaux || []} cultures={props.cultures || []} stocks={props.stocks || []} alimentationLogs={props.alimentationLogs || []} productionLogs={props.productionLogs || []} vaccins={props.vaccins || []} businessEvents={props.businessEvents || []} transactions={props.transactions || []} onNavigate={props.onNavigate} />
    </CollapsibleSection>
  </div>;
}