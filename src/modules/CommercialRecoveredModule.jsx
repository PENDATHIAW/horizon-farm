import { Handshake, Lightbulb, ShoppingCart, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { fmtCurrency, fmtNumber } from '../utils/format';
import VentesV3 from './VentesV3';
import ClientsReadable from './ClientsReadable';

const arr = (v) => Array.isArray(v) ? v : [];
const rowsOf = (provided, crud) => arr(provided).length ? arr(provided) : arr(crud?.rows);
const n = (v = 0) => Number(v || 0);
const amount = (r = {}) => n(r.montant_total ?? r.total ?? r.amount ?? r.montant ?? r.estimated_amount ?? r.montant_estime);
const paid = (r = {}) => n(r.montant_paye ?? r.paid_amount ?? r.amount_paid);
const lower = (v) => String(v || '').toLowerCase();
const isOpenOrder = (r = {}) => !['cloture', 'clôture', 'annule', 'annulé', 'termine', 'terminé'].includes(lower(r.statut_commande || r.status || r.statut));
const isOpportunityOpen = (r = {}) => !['fermee', 'fermée', 'closed', 'gagnee', 'gagnée', 'perdue'].includes(lower(r.status || r.statut));
const isDelivered = (r = {}) => ['livre', 'livré', 'delivered', 'termine', 'terminé', 'recupere', 'récupéré'].includes(lower(r.delivery_status || r.statut_livraison || r.status_livraison || r.status || r.statut));
const isInvoiced = (r = {}) => r.invoice_id || r.facture_id || ['facture', 'facturé', 'invoiced', 'emise', 'émise'].includes(lower(r.invoice_status || r.facture_status || r.status_facture));
const remainingOf = (order = {}, payments = []) => Math.max(0, amount(order) - paid(order) - payments.filter((p) => String(p.order_id || p.sale_id || p.source_record_id) === String(order.id)).reduce((s, p) => s + n(p.montant ?? p.amount ?? p.montant_paye), 0));

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>;
}
function Pill({ children, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]';
  return <span className={`rounded-full border px-3 py-1 text-xs font-black ${cls}`}>{children}</span>;
}
function Section({ icon: Icon, title, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</h2>{children}</section>;
}
function Tabs({ active, onChange }) {
  return <ModuleTabsBar moduleId="commercial" active={active} onChange={onChange} />;
}
function Summary({ data, setTab }) {
  return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-6"><Stat label="Ventes" value={fmtNumber(data.orders.length)} /><Stat label="Ventes du jour" value={fmtNumber(data.todayOrders.length)} tone="good" /><Stat label="CA encaissé" value={fmtCurrency(data.collected)} tone="good" /><Stat label="Reste à encaisser" value={fmtCurrency(data.receivable)} tone={data.receivable ? 'warn' : 'good'} /><Stat label="À livrer" value={fmtNumber(data.toDeliver.length)} tone={data.toDeliver.length ? 'warn' : 'good'} /><Stat label="Opportunités" value={fmtNumber(data.openOpportunities.length)} tone="good" /></div>{data.topClients.length ? <Section icon={UserRound} title="Top clients">{data.topClients.map(([name, total]) => <div key={name} className="flex items-center justify-between border-b border-[#eadcc2]/70 py-3 last:border-b-0"><span className="font-black text-[#2f2415]">{name}</span><span className="text-sm font-black text-emerald-700">{fmtCurrency(total)}</span></div>)}</Section> : null}<Section icon={Handshake} title="Parcours commercial simplifié"><p className="text-sm leading-relaxed text-[#8a7456]">La vente se saisit une seule fois dans Ventes avec client, produits, paiement, livraison et facture. Les encaissements, restes à payer, livraisons et factures restent visibles dans Ventes, au lieu d’être éclatés dans plusieurs sous-onglets.</p><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"><button type="button" onClick={() => setTab('Ventes')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Ventes</b><p className="mt-1 text-sm text-[#8a7456]">Créer, encaisser, livrer, facturer et clôturer.</p></button><button type="button" onClick={() => setTab('Clients')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Clients</b><p className="mt-1 text-sm text-[#8a7456]">Fidéliser, relancer, suivre l’historique et les créances.</p></button><button type="button" onClick={() => setTab('Opportunités')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Opportunités</b><p className="mt-1 text-sm text-[#8a7456]">Préparer les ventes à venir.</p></button></div><div className="mt-4 flex flex-wrap gap-2"><Pill tone="good">Encaissements visibles dans Ventes</Pill><Pill tone="good">Livraison gérée dans Ventes</Pill><Pill tone="good">Facture gérée dans Ventes</Pill></div></Section></div>;
}
function Empty({ label }) { return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-5 text-sm text-[#8a7456]">{label}</div>; }
function Opportunities({ opportunities, setTab }) {
  return <Section icon={Lightbulb} title="Opportunités commerciales">{opportunities.length ? opportunities.slice(0, 20).map((row) => <button key={row.id || row.title || row.libelle} type="button" onClick={() => setTab('Ventes')} className="grid w-full grid-cols-1 gap-2 border-b border-[#eadcc2]/70 py-4 text-left last:border-b-0 md:grid-cols-[260px_1fr_auto] md:items-center hover:bg-[#fffdf8]"><b className="text-[#2f2415]">{row.title || row.libelle || row.product_name || 'Opportunité'}</b><span className="text-sm text-[#8a7456]">{row.client_nom || row.customer_name || row.notes || row.source_module || 'Commercial'}</span><Pill tone="good">Convertir</Pill></button>) : <Empty label="Aucune opportunité ouverte." />}</Section>;
}

export default function CommercialRecoveredModule(props) {
  const [tab, setTab] = useState('Résumé');
  const ordersCrud = useCrudModule('sales_orders');
  const itemsCrud = useCrudModule('sales_order_items');
  const deliveriesCrud = useCrudModule('deliveries');
  const invoicesCrud = useCrudModule('invoices');
  const paymentsCrud = useCrudModule('payments');
  const opportunitiesCrud = useCrudModule('sales_opportunities');
  const clientsCrud = useCrudModule('clients');
  const stockCrud = useCrudModule('stock');
  const animalsCrud = useCrudModule('animaux');
  const lotsCrud = useCrudModule('avicole');
  const culturesCrud = useCrudModule('cultures');
  const financesCrud = useCrudModule('finances');
  const docsCrud = useCrudModule('documents');
  const traceCrud = useCrudModule('tracabilite');
  const eventsCrud = useCrudModule('business_events');
  const alertsCrud = useCrudModule('alertes_center');
  const orders = rowsOf(props.salesOrders || props.rows, ordersCrud);
  const payments = rowsOf(props.payments, paymentsCrud);
  const clients = rowsOf(props.clients, clientsCrud);
  const opportunities = rowsOf(props.opportunities, opportunitiesCrud);
  const data = useMemo(() => {
    const openOrders = orders.filter(isOpenOrder);
    const receivable = orders.reduce((sum, row) => sum + remainingOf(row, payments), 0);
    const collected = payments.reduce((sum, row) => sum + n(row.montant ?? row.amount ?? row.montant_paye), 0);
    const today = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter((row) => String(row.date || row.created_at || '').slice(0, 10) === today);
    const clientTotals = {};
    orders.forEach((row) => { const name = row.client_nom || row.customer_name || row.client_id || 'Client'; clientTotals[name] = (clientTotals[name] || 0) + amount(row); });
    const topClients = Object.entries(clientTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { orders, openOrders, receivable, collected, todayOrders, topClients, clients, payments, toDeliver: orders.filter((row) => !isDelivered(row)), toInvoice: orders.filter((row) => !isInvoiced(row)), openOpportunities: opportunities.filter(isOpportunityOpen) };
  }, [orders, payments, clients, opportunities]);
  const refreshWorkflow = props.onRefreshWorkflow || (async () => Promise.allSettled([ordersCrud.refresh?.(), itemsCrud.refresh?.(), deliveriesCrud.refresh?.(), invoicesCrud.refresh?.(), paymentsCrud.refresh?.(), opportunitiesCrud.refresh?.(), clientsCrud.refresh?.(), stockCrud.refresh?.(), animalsCrud.refresh?.(), lotsCrud.refresh?.(), culturesCrud.refresh?.(), financesCrud.refresh?.(), docsCrud.refresh?.(), eventsCrud.refresh?.(), alertsCrud.refresh?.()]));
  const salesProps = { rows: orders, clients, orderItems: rowsOf(props.orderItems, itemsCrud), deliveriesList: rowsOf(props.deliveries, deliveriesCrud), invoicesList: rowsOf(props.invoices, invoicesCrud), paymentsList: payments, opportunities, animaux: rowsOf(props.animals || props.animaux, animalsCrud), lots: rowsOf(props.lots, lotsCrud), cultures: rowsOf(props.cultures, culturesCrud), stocks: rowsOf(props.stocks, stockCrud), transactions: rowsOf(props.transactions, financesCrud), businessEvents: rowsOf(props.businessEvents, eventsCrud), documents: rowsOf(props.documents, docsCrud), alertes: rowsOf(props.alertes, alertsCrud), onCreate: props.onCreate || ordersCrud.create, onUpdate: props.onUpdate || ordersCrud.update, onDelete: props.onDelete || ordersCrud.remove, onRefresh: props.onRefresh || ordersCrud.refresh, onCreateItem: props.onCreateItem || itemsCrud.create, onUpdateItem: props.onUpdateItem || itemsCrud.update, onDeleteItem: props.onDeleteItem || itemsCrud.remove, onCreateDelivery: props.onCreateDelivery || deliveriesCrud.create, onUpdateDelivery: props.onUpdateDelivery || deliveriesCrud.update, onDeleteDelivery: props.onDeleteDelivery || deliveriesCrud.remove, onRefreshDeliveries: props.onRefreshDeliveries || deliveriesCrud.refresh, onCreateInvoice: props.onCreateInvoice || invoicesCrud.create, onUpdateInvoice: props.onUpdateInvoice || invoicesCrud.update, onDeleteInvoice: props.onDeleteInvoice || invoicesCrud.remove, onRefreshInvoices: props.onRefreshInvoices || invoicesCrud.refresh, onCreatePayment: props.onCreatePayment || paymentsCrud.create, onUpdatePayment: props.onUpdatePayment || paymentsCrud.update, onDeletePayment: props.onDeletePayment || paymentsCrud.remove, onRefreshPayments: props.onRefreshPayments || paymentsCrud.refresh, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onDeleteOpportunity: props.onDeleteOpportunity || opportunitiesCrud.remove, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh, onUpdateAnimal: props.onUpdateAnimal || animalsCrud.update, onRefreshAnimals: props.onRefreshAnimals || animalsCrud.refresh, onUpdateLot: props.onUpdateLot || lotsCrud.update, onRefreshLots: props.onRefreshLots || lotsCrud.refresh, onUpdateCulture: props.onUpdateCulture || culturesCrud.update, onRefreshCultures: props.onRefreshCultures || culturesCrud.refresh, onUpdateStock: props.onUpdateStock || stockCrud.update, onRefreshStocks: props.onRefreshStocks || stockCrud.refresh, onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create, onRefreshFinances: props.onRefreshFinances || financesCrud.refresh, onCreateTrace: props.onCreateTrace || traceCrud.create, onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onCreateDocument: props.onCreateDocument || docsCrud.create, onRefreshDocuments: props.onRefreshDocuments || docsCrud.refresh, onCreateAlert: props.onCreateAlert || alertsCrud.create, onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh, onUpdateClient: props.onUpdateClient || clientsCrud.update, onRefreshWorkflow: refreshWorkflow, onNavigate: props.onNavigate };
  const clientProps = { rows: clients, salesOrders: orders, payments, transactions: rowsOf(props.transactions, financesCrud), onCreate: props.onCreateClient || clientsCrud.create, onUpdate: props.onUpdateClient || clientsCrud.update, onDelete: props.onDeleteClient || clientsCrud.remove, onRefresh: props.onRefreshClients || clientsCrud.refresh, onNavigate: props.onNavigate };
  return <div className="space-y-6"><section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Gestion</p><h1 className="mt-1 text-2xl font-black text-[#2f2415]">Commercial</h1><p className="mt-1 text-sm text-[#8a7456]">Saisir les ventes une seule fois, puis suivre encaissements, livraisons et factures directement dans Ventes.</p></section><Tabs active={tab} onChange={setTab} />{tab === 'Résumé' ? <Summary data={data} setTab={setTab} /> : tab === 'Ventes' ? <VentesV3 {...salesProps} /> : tab === 'Clients' ? <ClientsReadable {...clientProps} /> : tab === 'Opportunités' ? <Opportunities opportunities={data.openOpportunities} setTab={setTab} /> : <ModuleGraphiquesTab moduleId="commercial" salesOrders={orders} payments={payments} opportunities={opportunities} clients={clients} onNavigate={props.onNavigate} />}</div>;
}
