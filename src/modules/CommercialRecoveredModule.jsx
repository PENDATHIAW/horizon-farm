import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { applyOneClickRecommendation } from '../services/heyHorizonRecommendationActions.js';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import MarginGlossaryPanel from '../components/MarginGlossaryPanel.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { buildSaleFormFromOpportunity } from '../utils/saleFormDraft';
import { resolveCommercialTab } from '../utils/commercialNavigation';
import { makeId } from '../utils/ids';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { buildCommercialHealthSnapshot } from './commercial/commercialVisionHelpers.js';
import {
  aggregateClientReceivables,
  buildCommercialCoherenceRows,
  buildSummaryTodos,
  buildTopClients,
  clientsWithReceivableCount,
  collectedFromOrders,
  enrichCommercialOrders,
  isOpportunityOpen,
  openSalesCount,
  receivableFromOrders,
  uniqueTodoCount,
} from './commercial/commercialMetrics.js';
import { resolveCommercialDataset } from '../utils/commercialLiveRows.js';
import { resolveCommercialClients } from '../utils/clientWorkflows.js';
import { buildConsolidatedCommercialKpis } from '../utils/commercialKpiConsolidated.js';
import { buildCommercialReconciliationRows } from '../utils/commercialReconciliation.js';
import { buildScheduledRelanceRows } from '../utils/commercialScheduledRelances.js';
import { buildCommercialDeliveryQueue } from '../utils/commercialDeliveries.js';
import { readAllCommercialSubscriptions, subscriptionsToPrepare } from '../utils/commercialSubscriptions.js';
import { buildCommercialStartupJourney, isCommercialStartupMode } from '../utils/commercialStartup.js';
import { buildAutoCommercialOpportunities } from '../utils/commercialAutoOpportunities.js';
import { buildWhatsAppLogPayload, WHATSAPP_STATUSES } from '../utils/whatsappCommercial.js';
import { listSellableStocks } from '../utils/sellableStock.js';
import { rowsOf, allRows } from '../utils/moduleRows';
import { CommercialKpi, CommercialModuleHeader, CommercialQuickActions, CommercialTodoRow, CommercialTopClients } from './commercial/CommercialShell.jsx';
import CommercialAnnexeTab from './commercial/CommercialAnnexeTab.jsx';
import CommercialOpportunitiesPanel from './commercial/CommercialOpportunitiesPanel.jsx';
import CommercialQuotesPanel from './commercial/CommercialQuotesPanel.jsx';
import CommercialReconciliationPanel from './commercial/CommercialReconciliationPanel.jsx';
import CommercialRelancesTeaser from './commercial/CommercialRelancesTeaser.jsx';
import CommercialDeliveriesPanel from './commercial/CommercialDeliveriesPanel.jsx';
import CommercialSubscriptionsPanel from './commercial/CommercialSubscriptionsPanel.jsx';
import CommercialProspectsPanel from './commercial/CommercialProspectsPanel.jsx';
import CommercialSegmentsPanel from './commercial/CommercialSegmentsPanel.jsx';
import CommercialScheduledRelancesPanel from './commercial/CommercialScheduledRelancesPanel.jsx';
import CommercialPilotagePanel from './commercial/CommercialPilotagePanel.jsx';
import CommercialMobileToolbar from './commercial/CommercialMobileToolbar.jsx';
import CommercialStartupPanel from './commercial/CommercialStartupPanel.jsx';
import CommercialInsightPanel from './commercial/CommercialInsightPanel.jsx';
import VentesV5 from './VentesV5.jsx';
import ClientsReadable from './ClientsReadable';

const arr = (v) => (Array.isArray(v) ? v : []);

function Summary({ data, setTab, onNewSale, onNavigate, onOpenClient, onApplyFinding, busyId }) {
  const todos = data.summaryTodos.slice(0, 6);
  const kpis = data.consolidatedKpis;
  const showStartup = data.startupJourney?.isEmpty || (data.startupJourney?.completed ?? 0) < 3;

  return (
    <div className="space-y-5">
      {showStartup ? (
        <CommercialStartupPanel journey={data.startupJourney} setTab={setTab} onNavigate={onNavigate} />
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <CommercialKpi label="CA" value={fmtCurrency(kpis?.ca ?? data.collected)} tone="good" onClick={() => setTab('Graphiques')} />
        <CommercialKpi label="Encaissé" value={fmtCurrency(kpis?.collected ?? data.collected)} tone="good" onClick={() => setTab('Graphiques')} />
        <CommercialKpi label="Créances" value={fmtCurrency(kpis?.receivable ?? data.receivable)} tone={(kpis?.receivable ?? data.receivable) ? 'warn' : 'good'} onClick={() => setTab('Clients')} />
        <CommercialKpi label="Commandes ouvertes" value={fmtNumber(kpis?.openOrders ?? data.openSalesCount)} tone={(kpis?.openOrders ?? data.openSalesCount) ? 'warn' : 'good'} onClick={() => setTab('Ventes')} />
        <CommercialKpi label="Clients actifs" value={fmtNumber(kpis?.activeClients ?? 0)} tone="good" onClick={() => setTab('Clients')} />
        <CommercialKpi label="Panier moyen" value={fmtCurrency(kpis?.basketAvg ?? 0)} tone="good" onClick={() => setTab('Graphiques')} />
      </div>

      <CommercialQuickActions setTab={setTab} onNewSale={onNewSale} />

      <CommercialInsightPanel
        findings={data.healthFindings}
        predictions={data.healthPredictions}
        coherenceRows={data.coherenceRows}
        onApplyFinding={onApplyFinding}
        onNavigate={onNavigate}
        setTab={setTab}
        busyId={busyId}
      />

      <CommercialQuotesPanel
        orders={data.ordersAll}
        orderItems={data.orderItems}
        clients={data.clients}
        onCreateOrder={data.handlers.onCreateOrder}
        onCreateItem={data.handlers.onCreateItem}
        onUpdateOrder={data.handlers.onUpdateOrder}
        onCreateDelivery={data.handlers.onCreateDelivery}
        onCreateInvoice={data.handlers.onCreateInvoice}
        onCreateDocument={data.handlers.onCreateDocument}
        onCreatePayment={data.handlers.onCreatePayment}
        onCreateBusinessEvent={data.handlers.onCreateBusinessEvent}
        onRefreshWorkflow={data.handlers.onRefreshWorkflow}
        farmScope={data.farmScope}
        accessibleFarms={data.accessibleFarms}
        activeFarm={data.activeFarm}
        stocks={data.stocks}
        lots={data.lots}
        cultures={data.cultures}
        animaux={data.animaux}
        payments={data.paymentsAll}
        transactions={data.transactions}
      />

      <CommercialReconciliationPanel rows={data.reconciliationRows} setTab={setTab} />

      <CommercialRelancesTeaser rows={data.relanceRows} setTab={setTab} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="lg:col-span-3 rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black text-[#2f2415]">À traiter aujourd&apos;hui</h2>
              <p className="text-[11px] text-[#8a7456]">Encaissements, livraisons, factures — actions directes.</p>
            </div>
            {data.todoCount > 0 ? (
              <button type="button" onClick={() => setTab('Ventes')} className="text-xs font-black text-[#9a6b12]">Tout voir →</button>
            ) : null}
          </div>
          {todos.length ? (
            <div className="divide-y divide-[#eadcc2]/60">
              {todos.map((row) => (
                <CommercialTodoRow
                  key={row.id}
                  title={row.title}
                  detail={row.detail}
                  actionLabel="Ouvrir"
                  onAction={() => setTab(row.tab || 'Ventes')}
                  onOpen={() => setTab(row.tab || 'Ventes')}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-800">
              Rien d&apos;urgent — ventes, factures et livraisons sont à jour.
            </div>
          )}
        </section>

        <div className="lg:col-span-2 space-y-4">
          {data.receivable > 0 ? (
            <button type="button" onClick={() => setTab('Clients')} className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left hover:bg-amber-100/80">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">Créances clients</p>
              <p className="mt-1 text-2xl font-black text-amber-900">{fmtCurrency(data.receivable)}</p>
              <p className="mt-1 text-xs text-amber-800">{data.clientsDebtCount} client(s) à relancer</p>
            </button>
          ) : null}
          <CommercialTopClients rows={data.topClients} setTab={setTab} />
        </div>
      </div>
    </div>
  );
}

export default function CommercialRecoveredModule(props) {
  const [tab, setTabRaw] = useState(() => resolveCommercialTab(props.initialTab));
  const setTab = (value) => setTabRaw(resolveCommercialTab(value));
  const [pendingSaleDraft, setPendingSaleDraft] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (props.initialTab) setTab(resolveCommercialTab(props.initialTab));
  }, [props.initialTab]);

  useEffect(() => {
    const handler = (event) => {
      const draft = event.detail?.draft;
      const module = event.detail?.module;
      if ((module === 'commercial' || module === 'ventes') && draft?.form_type === 'sale_record') {
        setPendingSaleDraft(draft);
        setTab('Ventes');
      }
    };
    window.addEventListener('horizon-open-form', handler);
    return () => window.removeEventListener('horizon-open-form', handler);
  }, []);
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
  const tasksCrud = useCrudModule('taches');
  const alimentationCrud = useCrudModule('alimentation_logs');
  const productionCrud = useCrudModule('production_oeufs_logs');
  const santeCrud = useCrudModule('sante');
  const businessPlansCrud = useCrudModule('business_plans');
  const investissementsCrud = useCrudModule('investissements');
  const whatsappLogsCrud = useCrudModule('whatsapp_logs');
  const periodFiltered = Boolean(props.periodFiltered);
  const live = useMemo(() => resolveCommercialDataset({
    props,
    ordersCrud,
    paymentsCrud,
    clientsCrud,
    opportunitiesCrud,
    deliveriesCrud,
    invoicesCrud,
    periodFiltered,
    periodScope: props.periodScope,
  }), [
    props.salesOrders,
    props.salesOrdersAll,
    props.payments,
    props.paymentsAll,
    props.clients,
    props.opportunities,
    props.deliveries,
    props.invoices,
    props.periodScope,
    periodFiltered,
    ordersCrud.rows,
    paymentsCrud.rows,
    clientsCrud.rows,
    opportunitiesCrud.rows,
    deliveriesCrud.rows,
    invoicesCrud.rows,
  ]);

  const { orders, ordersAll, payments, paymentsAll, deliveriesAll, invoicesAll, clients: clientsRaw, opportunities } = live;

  const clients = useMemo(
    () => resolveCommercialClients(clientsRaw, ordersAll),
    [clientsRaw, ordersAll],
  );

  const pf = periodFiltered;
  const stockRows = rowsOf(props.stocks, stockCrud, false);
  const orderItemRows = rowsOf(props.orderItems, itemsCrud, pf);
  const transactionRows = rowsOf(props.transactions, financesCrud, pf);
  const whatsappLogRows = allRows(props.whatsappLogs, whatsappLogsCrud).length
    ? allRows(props.whatsappLogs, whatsappLogsCrud)
    : rowsOf(props.whatsappLogs, whatsappLogsCrud, false);
  const animauxRows = rowsOf(props.animals || props.animaux, animalsCrud, false);
  const lotsRows = rowsOf(props.lots, lotsCrud, false);
  const culturesRows = rowsOf(props.cultures, culturesCrud, false);
  const documentsRows = rowsOf(props.documents, docsCrud, pf);
  const alertRows = rowsOf(props.alertes, alertsCrud, false);
  const taskRows = rowsOf(props.tasks || props.existingTasks, tasksCrud, false);
  const sellableStocks = useMemo(() => listSellableStocks(stockRows, 50), [stockRows]);

  const refreshWorkflow = props.onRefreshWorkflow || (async () => Promise.allSettled([
    ordersCrud.refresh?.(), itemsCrud.refresh?.(), deliveriesCrud.refresh?.(), invoicesCrud.refresh?.(),
    paymentsCrud.refresh?.(), opportunitiesCrud.refresh?.(), clientsCrud.refresh?.(), financesCrud.refresh?.(),
    docsCrud.refresh?.(), eventsCrud.refresh?.(), tasksCrud.refresh?.(), alertsCrud.refresh?.(),
    whatsappLogsCrud.refresh?.(),
  ]));

  const workflowHandlers = useMemo(() => ({
    onCreateOrder: props.onCreate || ordersCrud.create,
    onCreateItem: props.onCreateItem || itemsCrud.create,
    onUpdateOrder: props.onUpdate || ordersCrud.update,
    onCreateDelivery: props.onCreateDelivery || deliveriesCrud.create,
    onCreateInvoice: props.onCreateInvoice || invoicesCrud.create,
    onCreateDocument: props.onCreateDocument || docsCrud.create,
    onCreatePayment: props.onCreatePayment || paymentsCrud.create,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    onUpdateDelivery: props.onUpdateDelivery || deliveriesCrud.update,
    onUpdateClient: props.onUpdateClient || clientsCrud.update,
    onCreateClient: props.onCreateClient || clientsCrud.create,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onUpdateTask: props.onUpdateTask || tasksCrud.update,
    onUpdateOrder: props.onUpdate || ordersCrud.update,
    onRefreshWorkflow: refreshWorkflow,
  }), [props.onCreate, props.onCreateItem, props.onUpdate, props.onCreateDelivery, props.onCreateInvoice, props.onCreateDocument, props.onCreatePayment, props.onCreateBusinessEvent, props.onUpdateDelivery, props.onUpdateClient, props.onCreateClient, props.onCreateTask, props.onUpdateTask, refreshWorkflow]);

  const data = useMemo(() => {
    const enrichOpts = { deliveries: deliveriesAll, invoices: invoicesAll };
    const snapshotOrders = enrichCommercialOrders(ordersAll, enrichOpts);
    const snapshotPayments = paymentsAll;
    const periodOrders = enrichCommercialOrders(orders, enrichOpts);
    const receivable = receivableFromOrders(snapshotOrders, snapshotPayments);
    const collected = collectedFromOrders(periodOrders, paymentsAll);
    const openSalesCountVal = openSalesCount(snapshotOrders, snapshotPayments);
    const topClients = buildTopClients(periodOrders, clients, 5);
    const clientsDebtCount = clientsWithReceivableCount(snapshotOrders, snapshotPayments);
    const openOpportunities = opportunities.filter(isOpportunityOpen);
    const healthSnap = buildCommercialHealthSnapshot({
      salesOrders: ordersAll,
      payments: snapshotPayments,
      clients,
      opportunities,
      deliveries: deliveriesAll,
      invoices: invoicesAll,
    });
    const coherenceRows = buildCommercialCoherenceRows(periodOrders, paymentsAll);
    const clientReceivables = aggregateClientReceivables(snapshotOrders, snapshotPayments);
    const summaryTodos = buildSummaryTodos(snapshotOrders, snapshotPayments);
    const consolidatedKpis = buildConsolidatedCommercialKpis({
      orders: snapshotOrders,
      payments: snapshotPayments,
      clients,
      deliveries: deliveriesAll,
      invoices: invoicesAll,
      periodScope: props.periodScope,
    });
    const headlineKpis = props.periodFiltered
      ? buildConsolidatedCommercialKpis({
        orders: periodOrders,
        payments: snapshotPayments,
        clients,
        deliveries: deliveriesAll,
        invoices: invoicesAll,
        periodScope: props.periodScope,
      })
      : consolidatedKpis;
    const reconciliationRows = buildCommercialReconciliationRows({
      orders: snapshotOrders,
      items: orderItemRows,
      payments: snapshotPayments,
      transactions: transactionRows,
      deliveries: deliveriesAll,
      invoices: invoicesAll,
      documents: documentsRows,
      stocks: stockRows,
      animaux: animauxRows,
      lots: lotsRows,
      alertes: alertRows,
    });
    const relanceRows = buildScheduledRelanceRows({
      clients,
      orders: snapshotOrders,
      payments: snapshotPayments,
      whatsappLogs: whatsappLogRows,
      tasks: taskRows,
    });
    const deliveryQueue = buildCommercialDeliveryQueue({
      deliveries: deliveriesAll,
      orders: snapshotOrders,
      clients,
      documents: documentsRows,
    });
    const subscriptions = readAllCommercialSubscriptions(clients);
    const subscriptionsDue = subscriptionsToPrepare(subscriptions);
    const startupJourney = buildCommercialStartupJourney({
      clients,
      salesOrders: snapshotOrders,
      payments: snapshotPayments,
      invoices: invoicesAll,
      whatsappLogs: whatsappLogRows,
      sellableStocks,
      receivable,
    });
    const autoOpportunities = buildAutoCommercialOpportunities({
      stocks: stockRows,
      cultures: culturesRows,
      lots: lotsRows,
      animaux: animauxRows,
      salesOrders: snapshotOrders,
    });
    const marginContext = {
      lots: lotsRows,
      animaux: animauxRows,
      cultures: culturesRows,
      stocks: stockRows,
      alimentationLogs: rowsOf(props.alimentationLogs, alimentationCrud, pf),
      productionLogs: rowsOf(props.productionLogs, productionCrud, pf),
      vaccins: rowsOf(props.vaccins || props.sante, santeCrud, pf),
      businessEvents: rowsOf(props.businessEvents, eventsCrud, pf),
      payments: snapshotPayments,
      transactions: transactionRows,
    };
    const chartOptions = {
      businessPlans: rowsOf(props.businessPlans, businessPlansCrud, false),
      rows: snapshotOrders,
    };
    return {
      orders: periodOrders,
      ordersAll: snapshotOrders,
      orderItems: orderItemRows,
      clients,
      paymentsAll: snapshotPayments,
      transactions: transactionRows,
      stocks: stockRows,
      lots: lotsRows,
      cultures: culturesRows,
      animaux: animauxRows,
      farmScope: props.farmScope,
      accessibleFarms: props.accessibleFarms,
      activeFarm: props.activeFarm,
      handlers: workflowHandlers,
      consolidatedKpis: headlineKpis,
      consolidatedKpisAll: consolidatedKpis,
      reconciliationRows,
      relanceRows,
      deliveryQueue,
      subscriptions,
      subscriptionsDue,
      deliveries: deliveriesAll,
      invoices: invoicesAll,
      tasks: taskRows,
      startupJourney,
      startupMode: isCommercialStartupMode({
        clients,
        salesOrders: snapshotOrders,
        payments: snapshotPayments,
        sellableStocks,
      }),
      openSalesCount: openSalesCountVal,
      receivable,
      collected,
      topClients,
      openOpportunities,
      clientsDebtCount,
      coherenceRows,
      clientReceivables,
      summaryTodos,
      todoCount: uniqueTodoCount({ orders: snapshotOrders, payments: snapshotPayments, healthFindings: healthSnap.findings }),
      healthScore: healthSnap.score,
      healthFindings: healthSnap.findings,
      healthPredictions: healthSnap.predictions,
      autoOpportunities,
      marginContext,
      chartOptions,
    };
  }, [
    orders, ordersAll, payments, paymentsAll, deliveriesAll, invoicesAll, clients, opportunities,
    orderItemRows, transactionRows, documentsRows, stockRows, animauxRows, lotsRows, culturesRows,
    alertRows, whatsappLogRows, taskRows, sellableStocks, workflowHandlers, props.periodScope, props.farmScope,
    props.accessibleFarms, props.activeFarm,
  ]);

  const openNewSale = (draft = null) => {
    setPendingSaleDraft(draft || { form_type: 'sale_record', date: new Date().toISOString().slice(0, 10) });
    setTab('Ventes');
  };

  const insightActionHandlers = useMemo(() => ({
    onNavigate: props.onNavigate,
    onCreateTask: workflowHandlers.onCreateTask,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onCreateBusinessEvent: workflowHandlers.onCreateBusinessEvent,
    existingTasks: taskRows,
    existingAlerts: alertRows,
  }), [props.onNavigate, props.onCreateAlert, workflowHandlers, taskRows, alertRows]);

  const applyFinding = async (finding) => {
    setBusyId(finding.id);
    try {
      const result = await applyOneClickRecommendation(finding, insightActionHandlers);
      if (result.createdTasks || result.createdAlerts) toast.success('Action créée');
      else toast.success('Module ouvert');
    } catch (err) {
      toast.error(err?.message || 'Action impossible');
    } finally {
      setBusyId(null);
    }
  };

  const traceRows = allRows(props.tracabiliteAll, traceCrud).length ? allRows(props.tracabiliteAll, traceCrud) : rowsOf(props.tracabilite, traceCrud, pf);
  const salesProps = { embedded: true, rows: data.orders, clients, initialSaleDraft: pendingSaleDraft, onConsumeSaleDraft: () => setPendingSaleDraft(null), orderItems: orderItemRows, deliveriesList: deliveriesAll.length ? deliveriesAll : rowsOf(props.deliveries, deliveriesCrud, pf), invoicesList: rowsOf(props.invoices, invoicesCrud, pf), paymentsList: paymentsAll, payments: paymentsAll, opportunities, tasks: rowsOf(props.tasks || props.existingTasks, tasksCrud, false), existingTasks: rowsOf(props.existingTasks || props.tasks, tasksCrud, false), animaux: animauxRows, lots: lotsRows, cultures: culturesRows, stocks: stockRows, alimentationLogs: rowsOf(props.alimentationLogs, alimentationCrud, pf), productionLogs: rowsOf(props.productionLogs, productionCrud, pf), vaccins: rowsOf(props.vaccins || props.sante, santeCrud, pf), transactions: transactionRows, businessEvents: rowsOf(props.businessEvents, eventsCrud, pf), documents: documentsRows, alertes: alertRows, farmScope: props.farmScope, accessibleFarms: props.accessibleFarms, activeFarm: props.activeFarm, onCreate: workflowHandlers.onCreateOrder, onUpdate: workflowHandlers.onUpdateOrder, onDelete: props.onDelete || ordersCrud.remove, onRefresh: props.onRefresh || ordersCrud.refresh, onCreateItem: workflowHandlers.onCreateItem, onUpdateItem: props.onUpdateItem || itemsCrud.update, onDeleteItem: props.onDeleteItem || itemsCrud.remove, onCreateDelivery: workflowHandlers.onCreateDelivery, onUpdateDelivery: props.onUpdateDelivery || deliveriesCrud.update, onDeleteDelivery: props.onDeleteDelivery || deliveriesCrud.remove, onRefreshDeliveries: props.onRefreshDeliveries || deliveriesCrud.refresh, onCreateInvoice: workflowHandlers.onCreateInvoice, onUpdateInvoice: props.onUpdateInvoice || invoicesCrud.update, onDeleteInvoice: props.onDeleteInvoice || invoicesCrud.remove, onRefreshInvoices: props.onRefreshInvoices || invoicesCrud.refresh, onCreatePayment: workflowHandlers.onCreatePayment, onUpdatePayment: props.onUpdatePayment || paymentsCrud.update, onDeletePayment: props.onDeletePayment || paymentsCrud.remove, onRefreshPayments: props.onRefreshPayments || paymentsCrud.refresh, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onDeleteOpportunity: props.onDeleteOpportunity || opportunitiesCrud.remove, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh, onUpdateAnimal: props.onUpdateAnimal || animalsCrud.update, onRefreshAnimals: props.onRefreshAnimals || animalsCrud.refresh, onUpdateLot: props.onUpdateLot || lotsCrud.update, onRefreshLots: props.onRefreshLots || lotsCrud.refresh, onUpdateCulture: props.onUpdateCulture || culturesCrud.update, onRefreshCultures: props.onRefreshCultures || culturesCrud.refresh, onUpdateStock: props.onUpdateStock || stockCrud.update, onRefreshStocks: props.onRefreshStocks || stockCrud.refresh, onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create, onUpdateFinanceTransaction: props.onUpdateFinanceTransaction || financesCrud.update, onDeleteFinanceTransaction: props.onDeleteFinanceTransaction || financesCrud.remove, onRefreshFinances: props.onRefreshFinances || financesCrud.refresh, onCreateTrace: props.onCreateTrace || traceCrud.create, onUpdateTrace: props.onUpdateTrace || traceCrud.update, onRefreshTrace: props.onRefreshTrace || traceCrud.refresh, traces: traceRows, onCreateBusinessEvent: workflowHandlers.onCreateBusinessEvent, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onCreateDocument: workflowHandlers.onCreateDocument, onUpdateDocument: props.onUpdateDocument || docsCrud.update, onDeleteDocument: props.onDeleteDocument || docsCrud.remove, onRefreshDocuments: props.onRefreshDocuments || docsCrud.refresh, onCreateAlert: props.onCreateAlert || alertsCrud.create, onUpdateAlert: props.onUpdateAlert || alertsCrud.update, onDeleteAlert: props.onDeleteAlert || alertsCrud.remove, onCreateTask: props.onCreateTask || tasksCrud.create, onUpdateTask: props.onUpdateTask || tasksCrud.update, onDeleteTask: props.onDeleteTask || tasksCrud.remove, onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh, onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh, onUpdateClient: props.onUpdateClient || clientsCrud.update, onRefreshClients: props.onRefreshClients || clientsCrud.refresh, onRefreshWorkflow: refreshWorkflow, onNavigate: props.onNavigate };
  const clientProps = { embedded: true, rows: clients, salesOrders: enrichCommercialOrders(ordersAll, { deliveries: deliveriesAll, invoices: invoicesAll }), payments: paymentsAll, opportunities: data.openOpportunities, transactions: transactionRows, whatsappLogs: whatsappLogRows, onCreateWhatsappLog: whatsappLogsCrud.create, onUpdateWhatsappLog: whatsappLogsCrud.update, onRefreshWhatsappLogs: whatsappLogsCrud.refresh, onCreate: props.onCreateClient || clientsCrud.create, onUpdate: props.onUpdateClient || clientsCrud.update, onDelete: props.onDeleteClient || clientsCrud.remove, onRefresh: props.onRefreshClients || clientsCrud.refresh, onNavigate: props.onNavigate };
  const panelCommon = {
    farmScope: props.farmScope,
    accessibleFarms: props.accessibleFarms,
    activeFarm: props.activeFarm,
    onRefreshWorkflow: refreshWorkflow,
  };

  const logOpportunityWhatsApp = async (client, message) => {
    const payload = buildWhatsAppLogPayload({
      client,
      message,
      reason: 'proposition_opportunite',
      status: WHATSAPP_STATUSES.PREPARE,
      logId: makeId('WALOG'),
    });
    await whatsappLogsCrud.create?.(payload);
    await whatsappLogsCrud.refresh?.();
  };

  const prepareRelanceWhatsApp = async (row) => {
    const client = clients.find((c) => String(c.id) === String(row.clientId));
    if (!client) {
      toast.error('Client introuvable');
      return;
    }
    const payload = buildWhatsAppLogPayload({
      client,
      message: row.message,
      reason: `relance_${row.type}`,
      status: WHATSAPP_STATUSES.PREPARE,
      logId: makeId('WALOG'),
      orderId: row.orderId || '',
    });
    await whatsappLogsCrud.create?.(payload);
    await whatsappLogsCrud.refresh?.();
    setTab('Clients');
    toast.success('Message préparé — confirmez l\'envoi depuis la fiche client');
  };

  const openClientTab = () => setTab('Clients');

  const convertOpportunityToSale = async (opportunity, client) => {
    const formDraft = buildSaleFormFromOpportunity(
      opportunity,
      { clients, lots: rowsOf(props.lots, lotsCrud), animaux: rowsOf(props.animals || props.animaux, animalsCrud), stocks: rowsOf(props.stocks, stockCrud), cultures: rowsOf(props.cultures, culturesCrud) },
      client,
    );
    setPendingSaleDraft({ form_type: 'sale_record', intent_label: `Convertir: ${opportunity.title || opportunity.libelle || 'Opportunité'}`, ...formDraft });
    setTab('Ventes');
    if (opportunity.id) {
      await (props.onUpdateOpportunity || opportunitiesCrud.update)?.(opportunity.id, {
        status: 'en_conversion',
        statut: 'en_conversion',
        client_id: client?.id || opportunity.client_id || '',
        client_nom: client?.nom || client?.name || opportunity.client_nom || '',
        converted_at: new Date().toISOString(),
      });
      await opportunitiesCrud.refresh?.();
    }
    toast.success('Formulaire vente prérempli — complétez la vente pour clôturer l’opportunité');
  };

  const todoBadge = data.todoCount;
  const tabBadges = {
    Ventes: data.openSalesCount,
    Opportunités: data.openOpportunities.length,
    'Clients & créances': data.clientsDebtCount + (data.relanceRows?.length || 0),
    Livraisons: data.deliveryQueue?.late?.length || 0,
    Abonnements: data.subscriptionsDue?.length || 0,
  };

  const opportunitiesPanel = (
    <CommercialOpportunitiesPanel
      opportunities={data.openOpportunities}
      autoOpportunities={data.autoOpportunities}
      clients={clients}
      stocks={stockRows}
      cultures={culturesRows}
      lots={lotsRows}
      animaux={animauxRows}
      salesOrders={data.orders}
      setTab={setTab}
      onWhatsAppLog={logOpportunityWhatsApp}
      onConvertSale={convertOpportunityToSale}
      onUpdateLot={workflowHandlers.onUpdateLot || props.onUpdateLot || lotsCrud.update}
      onRefreshLots={props.onRefreshLots || lotsCrud.refresh}
      onUpdateAnimal={props.onUpdateAnimal || animalsCrud.update}
      onRefreshAnimals={props.onRefreshAnimals || animalsCrud.refresh}
      onCreateOpportunity={props.onCreateOpportunity || opportunitiesCrud.create}
      onUpdateOpportunity={props.onUpdateOpportunity || opportunitiesCrud.update}
      onRefreshOpportunities={props.onRefreshOpportunities || opportunitiesCrud.refresh}
      onCreateBusinessEvent={workflowHandlers.onCreateBusinessEvent}
      onRefreshBusinessEvents={props.onRefreshBusinessEvents || eventsCrud.refresh}
    />
  );

  return (
    <div className="space-y-4">
      <CommercialModuleHeader tab={tab} setTab={setTab} healthScore={data.healthScore} periodLabel={props.periodLabel} onNavigate={props.onNavigate} onOpenAssistant={props.onOpenAssistant} badges={{ receivable: data.receivable, todo: todoBadge, tabs: tabBadges }} />
      {tab === 'Ventes' ? (
        <div className="space-y-4">
          <CommercialQuickActions setTab={setTab} onNewSale={openNewSale} />
          <VentesV5 {...salesProps} />
        </div>
      ) : null}
      {tab === 'Opportunités' ? (
        <div className="space-y-4">{opportunitiesPanel}</div>
      ) : null}
      {tab === 'Clients & créances' ? (
        <div className="space-y-4">
          <ClientsReadable {...clientProps} />
          <CommercialSegmentsPanel clients={clients} orders={data.ordersAll} payments={data.paymentsAll} relanceRows={data.relanceRows} />
          <CommercialProspectsPanel
            clients={clients}
            onCreateClient={workflowHandlers.onCreateClient}
            onUpdateClient={workflowHandlers.onUpdateClient}
            onCreateOrder={workflowHandlers.onCreateOrder}
            onCreateItem={workflowHandlers.onCreateItem}
            onRefreshWorkflow={refreshWorkflow}
            onNewQuote={() => setTab('Ventes')}
            {...panelCommon}
          />
          <CommercialScheduledRelancesPanel
            rows={data.relanceRows}
            clients={clients}
            onCreateTask={workflowHandlers.onCreateTask}
            onRefreshTasks={props.onRefreshTasks || tasksCrud.refresh}
            onOpenClient={openClientTab}
            onPrepareWhatsApp={prepareRelanceWhatsApp}
          />
        </div>
      ) : null}
      {tab === 'Livraisons' ? (
        <CommercialDeliveriesPanel
          deliveries={deliveriesAll}
          orders={data.ordersAll}
          clients={clients}
          documents={documentsRows}
          payments={paymentsAll}
          invoices={invoicesAll}
          tasks={taskRows}
          onUpdateDelivery={workflowHandlers.onUpdateDelivery}
          onCreateDocument={workflowHandlers.onCreateDocument}
          onUpdateOrder={workflowHandlers.onUpdateOrder}
          onCreateDelivery={workflowHandlers.onCreateDelivery}
          onCreateTask={workflowHandlers.onCreateTask}
          onUpdateTask={workflowHandlers.onUpdateTask}
          onRefreshWorkflow={refreshWorkflow}
          setTab={setTab}
        />
      ) : null}
      {tab === 'Abonnements' ? (
        <CommercialSubscriptionsPanel
          clients={clients}
          onUpdateClient={workflowHandlers.onUpdateClient}
          onNewSale={openNewSale}
          activeFarm={props.activeFarm}
        />
      ) : null}
      {tab === 'Pilotage' ? (
        <div className="space-y-4">
          <Summary
            data={data}
            setTab={setTab}
            onNewSale={openNewSale}
            onNavigate={props.onNavigate}
            onOpenClient={openClientTab}
            onApplyFinding={applyFinding}
            busyId={busyId}
          />
          <CommercialPilotagePanel
            data={data}
            setTab={setTab}
            periodLabel={props.periodLabel}
            marginContext={data.marginContext}
            chartOptions={data.chartOptions}
          />
          <MarginGlossaryPanel />
          <details className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
            <summary className="cursor-pointer font-black text-sm text-[#2f2415]">Annexe & graphiques</summary>
            <div className="mt-3 space-y-4">
              <CommercialAnnexeTab
                documents={documentsRows}
                orders={enrichCommercialOrders(ordersAll, { deliveries: deliveriesAll, invoices: invoicesAll })}
                invoices={invoicesAll}
                deliveries={deliveriesAll}
                clients={clients}
                onNavigate={props.onNavigate}
              />
              <ModuleGraphiquesTab
                moduleId="commercial"
                salesOrders={enrichCommercialOrders(ordersAll, { deliveries: deliveriesAll, invoices: invoicesAll })}
                payments={paymentsAll}
                opportunities={opportunities}
                clients={clients}
                lots={rowsOf(props.lots, lotsCrud, false)}
                animaux={rowsOf(props.animals || props.animaux, animalsCrud, false)}
                cultures={rowsOf(props.cultures, culturesCrud, false)}
                stocks={rowsOf(props.stocks, stockCrud, false)}
                alimentationLogs={rowsOf(props.alimentationLogs, alimentationCrud, pf)}
                productionLogs={rowsOf(props.productionLogs, productionCrud, pf)}
                vaccins={rowsOf(props.vaccins || props.sante, santeCrud, pf)}
                businessEvents={rowsOf(props.businessEvents, eventsCrud, pf)}
                transactions={rowsOf(props.transactions, financesCrud, pf)}
                businessPlans={rowsOf(props.businessPlans, businessPlansCrud, false)}
                investissements={rowsOf(props.investissements, investissementsCrud, false)}
                periodScope={props.periodScope}
                periodFiltered={periodFiltered}
                onNavigate={props.onNavigate}
              />
            </div>
          </details>
        </div>
      ) : null}
      <CommercialMobileToolbar
        onNewSale={() => openNewSale()}
        setTab={setTab}
        onCollect={() => setTab('Ventes')}
        onDeliver={() => setTab('Livraisons')}
        onRelance={() => setTab('Clients & créances')}
      />
    </div>
  );
}
