import { BrainCircuit, Handshake, Lightbulb, ShoppingCart, UserRound, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { emitHorizonForm } from '../services/formModalManager';
import { applyOneClickRecommendation, createClientFollowUpTask } from '../services/heyHorizonRecommendationActions.js';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { aggregateClientReceivables, buildCommercialCoherenceRows, buildCommercialHealthSnapshot } from './commercial/commercialVisionHelpers.js';
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
function Empty({ label }) { return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-5 text-sm text-[#8a7456]">{label}</div>; }

function CommercialIaPanel({ findings = [], predictions = [], onApply, busyId, onNavigate }) {
  if (!findings.length && !predictions.length) return null;
  return (
    <Section icon={BrainCircuit} title="Surveillance IA commercial">
      <p className="mb-3 text-sm text-[#8a7456]">Cohérence vente → facture → livraison → paiement → finance → documents.</p>
      <div className="space-y-2">
        {findings.slice(0, 6).map((f) => (
          <div key={f.id} className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div><b className="text-sm text-[#2f2415]">{f.title}</b><p className="text-xs text-amber-800">{f.recommended_action || f.description}</p></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => onNavigate?.('finance_pilotage')} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black">Finance</button>
              <button type="button" disabled={busyId === f.id} onClick={() => onApply?.(f)} className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50">{busyId === f.id ? '…' : f.auto_action === 'create_task' ? 'Créer tâche' : f.auto_action === 'create_alert' ? 'Créer alerte' : 'Appliquer'}</button>
            </div>
          </div>
        ))}
        {predictions.slice(0, 2).map((p) => (
          <div key={p.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm"><b>{p.title}</b><p className="text-xs text-[#8a7456]">{p.description}</p></div>
        ))}
      </div>
    </Section>
  );
}

function CoherencePanel({ rows = [], onApply, busyId, setTab }) {
  if (!rows.length) return null;
  return (
    <Section icon={Zap} title="Incohérences à traiter">
      {rows.slice(0, 8).map((row) => (
        <div key={row.id} className="flex flex-col gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => setTab('Ventes')} className="text-left"><b className="text-[#2f2415]">{row.title}</b><p className="text-xs text-[#8a7456]">{row.detail}</p></button>
          <button type="button" disabled={busyId === row.id} onClick={() => row.finding && onApply?.(row.finding)} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-black text-emerald-700 disabled:opacity-50">{busyId === row.id ? '…' : 'Corriger'}</button>
        </div>
      ))}
    </Section>
  );
}

function ReceivablesPanel({ clients = [], onRelance, busyId, setTab }) {
  if (!clients.length) return null;
  return (
    <Section icon={UserRound} title="Clients à relancer">
      {clients.slice(0, 6).map((c) => (
        <div key={c.name} className="flex flex-col gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => setTab('Clients')} className="text-left"><b className="text-[#2f2415]">{c.name}</b><p className="text-xs text-[#8a7456]">{c.orders.length} vente(s) · {fmtCurrency(c.total)}</p></button>
          <button type="button" disabled={busyId === c.name} onClick={() => onRelance?.(c)} className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50">{busyId === c.name ? '…' : 'Créer relance'}</button>
        </div>
      ))}
    </Section>
  );
}

function Summary({ data, setTab, onApply, onRelance, busyId, onNavigate }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-8">
        <Stat label="Santé commercial" value={`${data.healthScore}/100`} tone={data.healthScore >= 75 ? 'good' : 'warn'} />
        <Stat label="Ventes" value={fmtNumber(data.orders.length)} />
        <Stat label="CA encaissé" value={fmtCurrency(data.collected)} tone="good" />
        <Stat label="Créances" value={fmtCurrency(data.receivable)} tone={data.receivable ? 'warn' : 'good'} />
        <Stat label="Sans facture" value={fmtNumber(data.toInvoice.length)} tone={data.toInvoice.length ? 'warn' : 'good'} />
        <Stat label="Sans livraison" value={fmtNumber(data.toDeliver.length)} tone={data.toDeliver.length ? 'warn' : 'good'} />
        <Stat label="Signaux IA" value={fmtNumber(data.healthFindings.length)} tone={data.healthFindings.length ? 'warn' : 'good'} />
        <Stat label="Opportunités" value={fmtNumber(data.openOpportunities.length)} tone="good" />
      </div>
      <CommercialIaPanel findings={data.healthFindings} predictions={data.healthPredictions} onApply={onApply} busyId={busyId} onNavigate={onNavigate} />
      <ReceivablesPanel clients={data.clientReceivables} onRelance={onRelance} busyId={busyId} setTab={setTab} />
      <CoherencePanel rows={data.coherenceRows} onApply={onApply} busyId={busyId} setTab={setTab} />
      {data.topClients.length ? (
        <Section icon={UserRound} title="Top clients CA">
          {data.topClients.map(([name, total]) => (
            <div key={name} className="flex items-center justify-between border-b border-[#eadcc2]/70 py-3 last:border-b-0">
              <span className="font-black text-[#2f2415]">{name}</span>
              <span className="text-sm font-black text-emerald-700">{fmtCurrency(total)}</span>
            </div>
          ))}
        </Section>
      ) : null}
      <Section icon={Handshake} title="Parcours commercial">
        <p className="text-sm leading-relaxed text-[#8a7456]">Une vente déclenche impacts : commercial, finance, documents, activité, vision IA.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <button type="button" onClick={() => { emitHorizonForm('ventes', 'sale_record', 'Nouvelle vente', { date: new Date().toISOString().slice(0, 10) }); setTab('Ventes'); }} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left"><b className="text-[#2f2415]">+ Vente</b><p className="mt-1 text-sm text-[#8a7456]">Client, produits, paiement, livraison.</p></button>
          <button type="button" onClick={() => setTab('Ventes')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Ventes</b><p className="mt-1 text-sm text-[#8a7456]">Encaisser, livrer, facturer.</p></button>
          <button type="button" onClick={() => setTab('Clients')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Clients</b><p className="mt-1 text-sm text-[#8a7456]">Historique et créances.</p></button>
          <button type="button" onClick={() => setTab('Opportunités')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Opportunités</b><p className="mt-1 text-sm text-[#8a7456]">Pipeline à venir.</p></button>
        </div>
      </Section>
    </div>
  );
}
function Opportunities({ opportunities, setTab, onNavigate }) {
  return (
    <Section icon={Lightbulb} title="Opportunités commerciales" action={<button type="button" onClick={() => { emitHorizonForm('ventes', 'sale_record', 'Convertir opportunité', {}); setTab('Ventes'); }} className="rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-black text-white">+ Vente</button>}>
      {opportunities.length ? opportunities.slice(0, 20).map((row) => (
        <button key={row.id || row.title || row.libelle} type="button" onClick={() => setTab('Ventes')} className="grid w-full grid-cols-1 gap-2 border-b border-[#eadcc2]/70 py-4 text-left last:border-b-0 md:grid-cols-[260px_1fr_auto] md:items-center hover:bg-[#fffdf8]">
          <b className="text-[#2f2415]">{row.title || row.libelle || row.product_name || 'Opportunité'}</b>
          <span className="text-sm text-[#8a7456]">{row.client_nom || row.customer_name || row.notes || '—'} · {fmtCurrency(row.montant_estime || row.estimated_amount || 0)}</span>
          <Pill tone="good">Convertir → Ventes</Pill>
        </button>
      )) : <Empty label="Aucune opportunité ouverte." />}
    </Section>
  );
}

export default function CommercialRecoveredModule(props) {
  const [tab, setTab] = useState('Résumé');
  const [busyId, setBusyId] = useState(null);
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
  const alimentationCrud = useCrudModule('alimentation_logs');
  const productionCrud = useCrudModule('production_oeufs_logs');
  const santeCrud = useCrudModule('sante');
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
    const toDeliver = orders.filter((row) => !isDelivered(row));
    const toInvoice = orders.filter((row) => !isInvoiced(row));
    const openOpportunities = opportunities.filter(isOpportunityOpen);
    const healthSnap = buildCommercialHealthSnapshot({ salesOrders: orders, payments, clients, opportunities });
    const coherenceRows = buildCommercialCoherenceRows(orders, payments);
    const clientReceivables = aggregateClientReceivables(orders, payments);
    return {
      orders, openOrders, receivable, collected, todayOrders, topClients, clients, payments,
      toDeliver, toInvoice, openOpportunities, coherenceRows, clientReceivables,
      healthScore: healthSnap.score,
      healthFindings: healthSnap.findings,
      healthPredictions: healthSnap.predictions,
    };
  }, [orders, payments, clients, opportunities]);
  const tasksCrud = useCrudModule('taches');
  const actionHandlers = {
    onNavigate: props.onNavigate,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onUpdateAlert: props.onUpdateAlert || alertsCrud.update,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    existingTasks: rowsOf(props.existingTasks, tasksCrud),
    existingAlerts: rowsOf(props.existingAlerts, alertsCrud),
  };
  const applyFinding = async (finding) => {
    setBusyId(finding.id);
    try {
      const result = await applyOneClickRecommendation(finding, actionHandlers);
      if (result.createdTasks || result.createdAlerts) toast.success('Action IA créée');
      else { toast.success('Module ouvert'); setTab('Ventes'); }
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };
  const relanceClient = async (client) => {
    setBusyId(client.name);
    try {
      await createClientFollowUpTask({
        clientName: client.name,
        amount: fmtCurrency(client.total),
        orderId: client.orders[0],
        handlers: actionHandlers,
      });
      toast.success(`Relance créée pour ${client.name}`);
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };

  const refreshWorkflow = props.onRefreshWorkflow || (async () => Promise.allSettled([ordersCrud.refresh?.(), itemsCrud.refresh?.(), deliveriesCrud.refresh?.(), invoicesCrud.refresh?.(), paymentsCrud.refresh?.(), opportunitiesCrud.refresh?.(), clientsCrud.refresh?.(), stockCrud.refresh?.(), animalsCrud.refresh?.(), lotsCrud.refresh?.(), culturesCrud.refresh?.(), financesCrud.refresh?.(), docsCrud.refresh?.(), eventsCrud.refresh?.(), alertsCrud.refresh?.(), alimentationCrud.refresh?.(), productionCrud.refresh?.(), santeCrud.refresh?.()]));
  const salesProps = { rows: orders, clients, orderItems: rowsOf(props.orderItems, itemsCrud), deliveriesList: rowsOf(props.deliveries, deliveriesCrud), invoicesList: rowsOf(props.invoices, invoicesCrud), paymentsList: payments, opportunities, animaux: rowsOf(props.animals || props.animaux, animalsCrud), lots: rowsOf(props.lots, lotsCrud), cultures: rowsOf(props.cultures, culturesCrud), stocks: rowsOf(props.stocks, stockCrud), alimentationLogs: rowsOf(props.alimentationLogs, alimentationCrud), productionLogs: rowsOf(props.productionLogs, productionCrud), vaccins: rowsOf(props.vaccins || props.sante, santeCrud), transactions: rowsOf(props.transactions, financesCrud), businessEvents: rowsOf(props.businessEvents, eventsCrud), documents: rowsOf(props.documents, docsCrud), alertes: rowsOf(props.alertes, alertsCrud), onCreate: props.onCreate || ordersCrud.create, onUpdate: props.onUpdate || ordersCrud.update, onDelete: props.onDelete || ordersCrud.remove, onRefresh: props.onRefresh || ordersCrud.refresh, onCreateItem: props.onCreateItem || itemsCrud.create, onUpdateItem: props.onUpdateItem || itemsCrud.update, onDeleteItem: props.onDeleteItem || itemsCrud.remove, onCreateDelivery: props.onCreateDelivery || deliveriesCrud.create, onUpdateDelivery: props.onUpdateDelivery || deliveriesCrud.update, onDeleteDelivery: props.onDeleteDelivery || deliveriesCrud.remove, onRefreshDeliveries: props.onRefreshDeliveries || deliveriesCrud.refresh, onCreateInvoice: props.onCreateInvoice || invoicesCrud.create, onUpdateInvoice: props.onUpdateInvoice || invoicesCrud.update, onDeleteInvoice: props.onDeleteInvoice || invoicesCrud.remove, onRefreshInvoices: props.onRefreshInvoices || invoicesCrud.refresh, onCreatePayment: props.onCreatePayment || paymentsCrud.create, onUpdatePayment: props.onUpdatePayment || paymentsCrud.update, onDeletePayment: props.onDeletePayment || paymentsCrud.remove, onRefreshPayments: props.onRefreshPayments || paymentsCrud.refresh, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onDeleteOpportunity: props.onDeleteOpportunity || opportunitiesCrud.remove, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh, onUpdateAnimal: props.onUpdateAnimal || animalsCrud.update, onRefreshAnimals: props.onRefreshAnimals || animalsCrud.refresh, onUpdateLot: props.onUpdateLot || lotsCrud.update, onRefreshLots: props.onRefreshLots || lotsCrud.refresh, onUpdateCulture: props.onUpdateCulture || culturesCrud.update, onRefreshCultures: props.onRefreshCultures || culturesCrud.refresh, onUpdateStock: props.onUpdateStock || stockCrud.update, onRefreshStocks: props.onRefreshStocks || stockCrud.refresh, onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create, onRefreshFinances: props.onRefreshFinances || financesCrud.refresh, onCreateTrace: props.onCreateTrace || traceCrud.create, onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onCreateDocument: props.onCreateDocument || docsCrud.create, onRefreshDocuments: props.onRefreshDocuments || docsCrud.refresh, onCreateAlert: props.onCreateAlert || alertsCrud.create, onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh, onUpdateClient: props.onUpdateClient || clientsCrud.update, onRefreshWorkflow: refreshWorkflow, onNavigate: props.onNavigate };
  const clientProps = { rows: clients, salesOrders: orders, payments, transactions: rowsOf(props.transactions, financesCrud), onCreate: props.onCreateClient || clientsCrud.create, onUpdate: props.onUpdateClient || clientsCrud.update, onDelete: props.onDeleteClient || clientsCrud.remove, onRefresh: props.onRefreshClients || clientsCrud.refresh, onNavigate: props.onNavigate };
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Gestion</p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Commercial</h1>
            <p className="mt-1 text-sm text-[#8a7456]">Ventes, clients, opportunités — cohérence IA facture/livraison/paiement.</p>
          </div>
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm"><span className="text-[#8a7456]">Santé </span><b className={data.healthScore >= 75 ? 'text-emerald-700' : 'text-amber-700'}>{data.healthScore}/100</b></div>
        </div>
      </section>
      <Tabs active={tab} onChange={setTab} />
      {tab === 'Résumé' ? <Summary data={data} setTab={setTab} onApply={applyFinding} onRelance={relanceClient} busyId={busyId} onNavigate={props.onNavigate} /> : tab === 'Ventes' ? <VentesV3 {...salesProps} /> : tab === 'Clients' ? <ClientsReadable {...clientProps} /> : tab === 'Opportunités' ? <Opportunities opportunities={data.openOpportunities} setTab={setTab} onNavigate={props.onNavigate} /> : <ModuleGraphiquesTab moduleId="commercial" salesOrders={orders} payments={payments} opportunities={opportunities} clients={clients} onNavigate={props.onNavigate} />}
    </div>
  );
}
