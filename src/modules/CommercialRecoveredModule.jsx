import { Lightbulb } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { emitHorizonForm } from '../services/formModalManager';
import { applyOneClickRecommendation } from '../services/heyHorizonRecommendationActions.js';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { buildCommercialHealthSnapshot } from './commercial/commercialVisionHelpers.js';
import {
  aggregateClientReceivables,
  buildCommercialCoherenceRows,
  buildSummaryTodos,
  collectedFromOrders,
  isOpportunityOpen,
  openSalesCount,
  receivableFromOrders,
  saleAmount,
  uniqueTodoCount,
} from './commercial/commercialMetrics.js';
import { CommercialKpi, CommercialModuleHeader, CommercialQuickActions, CommercialTodoRow, CommercialTopClients } from './commercial/CommercialShell.jsx';
import VentesV3 from './VentesV3';
import ClientsReadable from './ClientsReadable';

const arr = (v) => (Array.isArray(v) ? v : []);
const rowsOf = (provided, crud) => (arr(provided).length ? arr(provided) : arr(crud?.rows));

function Summary({ data, setTab, onApply, busyId }) {
  const todoCount = data.todoCount;
  const todos = data.summaryTodos.slice(0, 8);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CommercialKpi label="CA encaissé" value={fmtCurrency(data.collected)} tone="good" onClick={() => setTab('Graphiques')} />
        <CommercialKpi label="Créances" value={fmtCurrency(data.receivable)} tone={data.receivable ? 'warn' : 'good'} onClick={() => setTab('Clients')} />
        <CommercialKpi label="Ventes à traiter" value={fmtNumber(data.openSalesCount)} tone={data.openSalesCount ? 'warn' : 'good'} onClick={() => setTab('Ventes')} />
        <CommercialKpi label="Opportunités" value={fmtNumber(data.openOpportunities.length)} tone="good" onClick={() => setTab('Opportunités')} />
      </div>

      <CommercialQuickActions setTab={setTab} />

      {todoCount > 0 ? (
        <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-black text-[#2f2415]">À traiter ({todoCount})</h2>
            <button type="button" onClick={() => setTab('Ventes')} className="text-xs font-black text-[#9a6b12]">Tout voir →</button>
          </div>
          <div className="divide-y divide-[#eadcc2]/60">
            {todos.map((row) => (
              <CommercialTodoRow
                key={row.id}
                title={row.title}
                detail={row.detail}
                actionLabel={row.finding ? (row.finding.auto_action === 'create_task' ? 'Créer tâche' : 'Appliquer') : row.issues.includes('encaissement') ? 'Clients' : 'Ventes'}
                busy={busyId === row.id}
                onAction={() => (row.finding ? onApply?.(row.finding) : setTab(row.tab))}
                onOpen={() => setTab(row.tab)}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Rien d&apos;urgent : ventes, factures et livraisons sont à jour.</div>
      )}

      <CommercialTopClients rows={data.topClients} setTab={setTab} />
    </div>
  );
}

function Opportunities({ opportunities, setTab }) {
  const pipeline = opportunities.reduce((sum, row) => sum + saleAmount(row), 0);
  const convertOpportunity = (row) => {
    emitHorizonForm('ventes', 'sale_record', `Convertir: ${row.title || row.libelle || 'Opportunité'}`, {
      source_id: row.source_id || '',
      source_type: row.source_type || '',
      product_name: row.title || row.libelle || row.product_name || 'Opportunité',
      quantity: row.quantity || 1,
      unit: row.unit || 'unité',
      estimated_value: row.montant_estime || row.estimated_amount || row.estimated_value || 0,
      client_id: row.client_id || '',
      client_name: row.client_nom || row.customer_name || '',
      notes: row.notes || row.reason || '',
      date: new Date().toISOString().slice(0, 10),
    });
    setTab('Ventes');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-[#8a7456]">Pipeline</p>
          <p className="text-2xl font-black text-[#2f2415]">{fmtCurrency(pipeline)}</p>
          <p className="text-sm text-[#8a7456]">{opportunities.length} opportunité(s) ouverte(s)</p>
        </div>
        <button type="button" onClick={() => { emitHorizonForm('ventes', 'sale_record', 'Nouvelle vente', { date: new Date().toISOString().slice(0, 10) }); setTab('Ventes'); }} className="min-h-[44px] rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white">+ Vente directe</button>
      </div>
      {opportunities.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {opportunities.slice(0, 20).map((row) => (
            <button key={row.id || row.title || row.libelle} type="button" onClick={() => convertOpportunity(row)} className="rounded-2xl border border-[#d6c3a0] bg-white p-4 text-left shadow-sm transition hover:border-[#c9a96a] hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2"><Lightbulb size={16} className="text-[#9a6b12]" /><b className="text-[#2f2415]">{row.title || row.libelle || row.product_name || 'Opportunité'}</b></div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">Convertir</span>
              </div>
              <p className="mt-2 text-sm text-[#8a7456]">{row.client_nom || row.customer_name || 'Client à préciser'}</p>
              <p className="mt-1 text-lg font-black text-emerald-700">{fmtCurrency(row.montant_estime || row.estimated_amount || 0)}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-6 text-center text-sm text-[#8a7456]">Aucune opportunité ouverte. Les signaux IA apparaîtront ici ou dans le Résumé.</div>
      )}
    </div>
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
    const receivable = receivableFromOrders(orders, payments);
    const collected = collectedFromOrders(orders, payments);
    const openSalesCountVal = openSalesCount(orders, payments);
    const clientTotals = {};
    orders.forEach((row) => { const name = row.client_nom || row.customer_name || row.client_label || row.client_id || 'Client'; clientTotals[name] = (clientTotals[name] || 0) + saleAmount(row); });
    const topClients = Object.entries(clientTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const openOpportunities = opportunities.filter(isOpportunityOpen);
    const healthSnap = buildCommercialHealthSnapshot({ salesOrders: orders, payments, clients, opportunities });
    const coherenceRows = buildCommercialCoherenceRows(orders, payments);
    const clientReceivables = aggregateClientReceivables(orders, payments);
    const summaryTodos = buildSummaryTodos(orders, payments, healthSnap.findings);
    return {
      orders, openSalesCount: openSalesCountVal, receivable, collected, topClients, openOpportunities,
      coherenceRows, clientReceivables, summaryTodos,
      todoCount: uniqueTodoCount({ orders, payments, healthFindings: healthSnap.findings }),
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


  const refreshWorkflow = props.onRefreshWorkflow || (async () => Promise.allSettled([ordersCrud.refresh?.(), itemsCrud.refresh?.(), deliveriesCrud.refresh?.(), invoicesCrud.refresh?.(), paymentsCrud.refresh?.(), opportunitiesCrud.refresh?.(), clientsCrud.refresh?.(), stockCrud.refresh?.(), animalsCrud.refresh?.(), lotsCrud.refresh?.(), culturesCrud.refresh?.(), financesCrud.refresh?.(), docsCrud.refresh?.(), eventsCrud.refresh?.(), alertsCrud.refresh?.(), alimentationCrud.refresh?.(), productionCrud.refresh?.(), santeCrud.refresh?.()]));
  const salesProps = { embedded: true, rows: orders, clients, orderItems: rowsOf(props.orderItems, itemsCrud), deliveriesList: rowsOf(props.deliveries, deliveriesCrud), invoicesList: rowsOf(props.invoices, invoicesCrud), paymentsList: payments, opportunities, animaux: rowsOf(props.animals || props.animaux, animalsCrud), lots: rowsOf(props.lots, lotsCrud), cultures: rowsOf(props.cultures, culturesCrud), stocks: rowsOf(props.stocks, stockCrud), alimentationLogs: rowsOf(props.alimentationLogs, alimentationCrud), productionLogs: rowsOf(props.productionLogs, productionCrud), vaccins: rowsOf(props.vaccins || props.sante, santeCrud), transactions: rowsOf(props.transactions, financesCrud), businessEvents: rowsOf(props.businessEvents, eventsCrud), documents: rowsOf(props.documents, docsCrud), alertes: rowsOf(props.alertes, alertsCrud), onCreate: props.onCreate || ordersCrud.create, onUpdate: props.onUpdate || ordersCrud.update, onDelete: props.onDelete || ordersCrud.remove, onRefresh: props.onRefresh || ordersCrud.refresh, onCreateItem: props.onCreateItem || itemsCrud.create, onUpdateItem: props.onUpdateItem || itemsCrud.update, onDeleteItem: props.onDeleteItem || itemsCrud.remove, onCreateDelivery: props.onCreateDelivery || deliveriesCrud.create, onUpdateDelivery: props.onUpdateDelivery || deliveriesCrud.update, onDeleteDelivery: props.onDeleteDelivery || deliveriesCrud.remove, onRefreshDeliveries: props.onRefreshDeliveries || deliveriesCrud.refresh, onCreateInvoice: props.onCreateInvoice || invoicesCrud.create, onUpdateInvoice: props.onUpdateInvoice || invoicesCrud.update, onDeleteInvoice: props.onDeleteInvoice || invoicesCrud.remove, onRefreshInvoices: props.onRefreshInvoices || invoicesCrud.refresh, onCreatePayment: props.onCreatePayment || paymentsCrud.create, onUpdatePayment: props.onUpdatePayment || paymentsCrud.update, onDeletePayment: props.onDeletePayment || paymentsCrud.remove, onRefreshPayments: props.onRefreshPayments || paymentsCrud.refresh, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onDeleteOpportunity: props.onDeleteOpportunity || opportunitiesCrud.remove, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh, onUpdateAnimal: props.onUpdateAnimal || animalsCrud.update, onRefreshAnimals: props.onRefreshAnimals || animalsCrud.refresh, onUpdateLot: props.onUpdateLot || lotsCrud.update, onRefreshLots: props.onRefreshLots || lotsCrud.refresh, onUpdateCulture: props.onUpdateCulture || culturesCrud.update, onRefreshCultures: props.onRefreshCultures || culturesCrud.refresh, onUpdateStock: props.onUpdateStock || stockCrud.update, onRefreshStocks: props.onRefreshStocks || stockCrud.refresh, onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create, onRefreshFinances: props.onRefreshFinances || financesCrud.refresh, onCreateTrace: props.onCreateTrace || traceCrud.create, onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onCreateDocument: props.onCreateDocument || docsCrud.create, onRefreshDocuments: props.onRefreshDocuments || docsCrud.refresh, onCreateAlert: props.onCreateAlert || alertsCrud.create, onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh, onUpdateClient: props.onUpdateClient || clientsCrud.update, onRefreshWorkflow: refreshWorkflow, onNavigate: props.onNavigate };
  const clientProps = { embedded: true, rows: clients, salesOrders: orders, payments, transactions: rowsOf(props.transactions, financesCrud), onCreate: props.onCreateClient || clientsCrud.create, onUpdate: props.onUpdateClient || clientsCrud.update, onDelete: props.onDeleteClient || clientsCrud.remove, onRefresh: props.onRefreshClients || clientsCrud.refresh, onNavigate: props.onNavigate };

  const todoBadge = data.todoCount;

  return (
    <div className="space-y-4">
      <CommercialModuleHeader tab={tab} setTab={setTab} healthScore={data.healthScore} badges={{ receivable: data.receivable, todo: todoBadge }} />
      {tab === 'Résumé' ? <Summary data={data} setTab={setTab} onApply={applyFinding} busyId={busyId} /> : null}
      {tab === 'Ventes' ? <VentesV3 {...salesProps} /> : null}
      {tab === 'Clients' ? <ClientsReadable {...clientProps} /> : null}
      {tab === 'Opportunités' ? <Opportunities opportunities={data.openOpportunities} setTab={setTab} /> : null}
      {tab === 'Graphiques' ? <ModuleGraphiquesTab moduleId="commercial" salesOrders={orders} payments={payments} opportunities={opportunities} clients={clients} onNavigate={props.onNavigate} /> : null}
    </div>
  );
}
