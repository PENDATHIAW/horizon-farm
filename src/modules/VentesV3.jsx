import { AlertTriangle, BarChart3, CheckCircle2, CreditCard, Receipt, ShieldCheck, Truck } from 'lucide-react';
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
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
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

  return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Ventes à traiter maintenant</p><h3 className="font-black text-[#2f2415]">Encaissements, livraisons et factures prioritaires</h3><p className="text-sm text-[#8a7456] mt-1">On affiche d’abord ce qui bloque le cash ou la clôture des ventes.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm"><Mini icon={Receipt} label="CA" value={fmtCurrency(totalCa)} /><Mini icon={CreditCard} label="À encaisser" value={fmtCurrency(unpaidTotal)} /><Mini icon={Truck} label="À livrer" value={notDelivered.length} /><Mini icon={AlertTriangle} label="Factures" value={invoiceMissing.length} /></div>
    </div>
    {calm ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={14} className="inline" /> Rien de critique côté ventes : encaissements, livraisons et factures semblent maîtrisés.</div> : null}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
      <PriorityList title="Encaisser" rows={unpaid.slice(0, 4)} empty="Aucun reste à encaisser" render={(order) => `${order.product_name || order.libelle || order.id} · ${fmtCurrency(remainingForOrder(order, payments))}`} tone="warning" />
      <PriorityList title="Livrer / clôturer" rows={notDelivered.slice(0, 4)} empty="Aucune livraison bloquante" render={(order) => `${order.product_name || order.libelle || order.id} · ${order.order_status_label || order.statut || 'à suivre'}`} tone="neutral" />
      <PriorityList title="Facturer" rows={invoiceMissing.slice(0, 4)} empty="Aucune facture manquante" render={(order) => `${order.product_name || order.libelle || order.id} · ${fmtCurrency(amount(order))}`} tone="danger" />
    </div>
  </div>;
}
function PriorityList({ title, rows = [], empty, render, tone = 'neutral' }) {
  const cls = tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#eadcc2] bg-[#fffdf8] text-[#7d6a4a]';
  return <div className={`rounded-2xl border p-4 ${cls}`}><p className="font-black text-[#2f2415]">{title}</p><div className="mt-3 space-y-2 text-sm">{rows.length ? rows.map((row) => <div key={row.id} className="rounded-xl bg-white/60 px-3 py-2">{render(row)}</div>) : <div className="rounded-xl bg-white/60 px-3 py-2">{empty}</div>}</div></div>;
}
function Mini({ icon: Icon, label, value }) {
  return <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2 min-w-[105px]"><Icon size={14} className="text-[#9a6b12]" /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>;
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

  return <div className="space-y-6 ventes-mobile-structured"><style>{`@media (max-width: 640px){.ventes-mobile-structured .rounded-2xl{border-radius:18px}.ventes-mobile-structured table{font-size:12px}.ventes-mobile-structured th,.ventes-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.ventes-mobile-structured .text-2xl{font-size:1.35rem}.ventes-mobile-structured .grid{gap:.75rem}.ventes-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>
    <ModuleSection icon={AlertTriangle} title="Priorités commerciales" subtitle="Encaissements, livraisons et factures à traiter avant les détails."><SalesPrioritySummary orders={props.rows || []} payments={payments} deliveries={props.deliveriesList || props.deliveries || []} invoices={props.invoicesList || props.invoices || []} /></ModuleSection>
    <ObjectivePerformanceCard dataMap={dataMap} activity="global" title="Objectif & Performance commerciale" onNavigate={props.onNavigate} />
    <ModuleSection icon={Receipt} title="Commandes, clients et paiements" subtitle="Créer les ventes, suivre les paiements, factures, livraisons et statuts sans double encaissement."><VentesV2 {...props} /></ModuleSection>
    <ModuleSection icon={ShieldCheck} title="Marges et contrôle des ventes" subtitle="Vérifier le coût, l’encaissement, le reste à payer et le statut de chaque vente."><SalesMarginsBridge rows={props.rows || []} payments={payments} transactions={props.transactions || []} lots={props.lots || []} animaux={props.animaux || []} cultures={props.cultures || []} stocks={props.stocks || []} alimentationLogs={props.alimentationLogs || []} productionLogs={props.productionLogs || []} vaccins={props.vaccins || []} businessEvents={props.businessEvents || []} onUpdate={props.onUpdate} onRefresh={props.onRefresh} /></ModuleSection>
    <ModuleSection icon={BarChart3} title="Évolution des ventes" subtitle="Graphes des commandes, encaissements, impayés et performance commerciale."><SalesEvolution rows={props.rows || []} payments={payments} onNavigate={props.onNavigate} /></ModuleSection>
  </div>;
}
