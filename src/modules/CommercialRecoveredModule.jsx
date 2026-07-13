import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { applyOneClickRecommendation } from '../services/heyHorizonRecommendationActions.js';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import MarginGlossaryPanel from '../components/MarginGlossaryPanel.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { buildSaleFormFromOpportunity } from '../utils/saleFormDraft';
import { resolveCommercialTab } from '../utils/commercialNavigation';
import { makeId } from '../utils/ids';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { isSimulatedDataModeEnabled } from '../utils/uiPreferences.js';
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
import { CommercialKpi, CommercialModuleHeader, CommercialTodoRow, CommercialTopClients } from './commercial/CommercialShell.jsx';
import CommercialAnnexeTab from './commercial/CommercialAnnexeTab.jsx';
import CommercialOpportunitiesPanel from './commercial/CommercialOpportunitiesPanel.jsx';
import CommercialQuotesPanel from './commercial/CommercialQuotesPanel.jsx';
import CommercialReconciliationPanel from './commercial/CommercialReconciliationPanel.jsx';
import CommercialDeliveriesPanel from './commercial/CommercialDeliveriesPanel.jsx';
import CommercialSubscriptionsPanel from './commercial/CommercialSubscriptionsPanel.jsx';
import CommercialProspectsPanel from './commercial/CommercialProspectsPanel.jsx';
import CommercialSegmentsPanel from './commercial/CommercialSegmentsPanel.jsx';
import CommercialScheduledRelancesPanel from './commercial/CommercialScheduledRelancesPanel.jsx';
import CommercialPilotagePanel from './commercial/CommercialPilotagePanel.jsx';
import CommercialMobileToolbar from './commercial/CommercialMobileToolbar.jsx';
import CommercialStartupPanel from './commercial/CommercialStartupPanel.jsx';
import CommercialInsightPanel from './commercial/CommercialInsightPanel.jsx';
import ModuleProjectionsStrip from '../components/module/ModuleProjectionsStrip.jsx';
import { buildCommercialModuleProjections } from '../utils/moduleProjections.js';
import VentesV5 from './VentesV5.jsx';
import ClientsReadable from './ClientsReadable';
import { subscribeFormModal } from '../services/formModalManager.js';



function CommercialComplaintsPanel({ events = [], tasks = [] }) {
  const complaints = events.filter((event) => /reclamation|réclamation/.test(String(event.event_type || event.type || '').toLowerCase()));
  return (
    <section aria-label="Réclamations clients">
      {complaints.length ? complaints.map((event) => {
        const linkedTasks = tasks.filter((task) => String(task.source_event_id || task.event_id || '') === String(event.id));
        return (
          <div key={event.id || event.event_key} className="grid gap-2 border-b border-line py-3 md:grid-cols-[1fr_auto] md:items-center">
            <span>
              <strong className="block text-sm text-earth">{event.title || 'Réclamation client'}</strong>
              <span className="text-xs text-slate">{event.occurred_at || event.created_at || 'Date inconnue'}</span>
            </span>
            <span className="text-xs font-semibold text-slate">{linkedTasks.length ? `${linkedTasks.length} action(s)` : 'À traiter'}</span>
          </div>
        );
      }) : <p className="py-8 text-center text-sm text-slate">Rien à afficher pour l’instant.</p>}
    </section>
  );
}

function Summary({ data, setTab, onNavigate, onApplyFinding, busyId }) {
  const todos = data.summaryTodos.slice(0, 6);
  const kpis = data.consolidatedKpis;
  const showStartup = data.startupMode;
  const simulatedMode = isSimulatedDataModeEnabled();

  return (
    <div className="space-y-6">
      {showStartup ? (
        <>
          {!simulatedMode ? (
            <div className="rounded-2xl border border-vigilance bg-vigilance-bg px-4 py-3 text-sm text-horizon-dark">
              Aucune donnée commerciale chargée. Activez <strong>Données simulées</strong> dans Paramètres (⚙️) pour afficher le scénario Horizon Farm, ou saisissez vos premiers clients et ventes.
            </div>
          ) : null}
          <CommercialStartupPanel journey={data.startupJourney} setTab={setTab} onNavigate={onNavigate} />
        </>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <CommercialKpi label="CA" value={fmtCurrency(kpis?.ca ?? data.collected)} tone="good" onClick={() => setTab('Pilotage')} />
        <CommercialKpi label="Encaissé" value={fmtCurrency(kpis?.collected ?? data.collected)} tone="good" onClick={() => setTab('Pilotage')} />
        <CommercialKpi label="Créances" value={fmtCurrency(kpis?.receivable ?? data.receivable)} tone={(kpis?.receivable ?? data.receivable) ? 'warn' : 'good'} onClick={() => setTab('Clients & créances')} />
        <CommercialKpi label="Commandes ouvertes" value={fmtNumber(kpis?.openOrders ?? data.openSalesCount)} tone={(kpis?.openOrders ?? data.openSalesCount) ? 'warn' : 'good'} onClick={() => setTab('Ventes')} />
        <CommercialKpi label="Clients actifs" value={fmtNumber(kpis?.activeClients ?? 0)} tone="good" onClick={() => setTab('Clients & créances')} />
        <CommercialKpi label="Panier moyen" value={fmtCurrency(kpis?.basketAvg ?? 0)} tone="good" onClick={() => setTab('Pilotage')} />
      </div>
      <p className="text-meta font-semibold text-slate">KPI période active · cliquer pour ouvrir le détail</p>

      <ModuleProjectionsStrip
        projections={data.moduleProjections}
        onNavigate={onNavigate}
      />

      <CommercialInsightPanel
        findings={data.healthFindings}
        predictions={data.healthPredictions}
        coherenceRows={data.coherenceRows}
        onApplyFinding={onApplyFinding}
        onNavigate={onNavigate}
        setTab={setTab}
        busyId={busyId}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="lg:col-span-3 rounded-2xl border border-line bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-earth">À traiter aujourd&apos;hui</h2>
              <p className="text-meta text-slate">Encaissements, livraisons, factures - actions directes.</p>
            </div>
            {data.todoCount > 0 ? (
              <button type="button" onClick={() => setTab('Ventes')} className="text-xs font-semibold text-horizon-dark">Tout voir →</button>
            ) : null}
          </div>
          {todos.length ? (
            <div className="divide-y divide-line/60">
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
            <div className="rounded-xl border border-positive bg-positive-bg px-4 py-6 text-center text-sm text-positive">
              Rien d&apos;urgent - ventes, factures et livraisons sont à jour.
            </div>
          )}
        </section>

        <div className="lg:col-span-2 space-y-4">
          {data.receivable > 0 ? (
            <button type="button" onClick={() => setTab('Clients & créances')} className="w-full rounded-2xl border border-vigilance bg-vigilance-bg p-4 text-left hover:bg-vigilance-bg">
              <p className="text-meta font-semibold uppercase tracking-normal text-horizon-dark">Créances clients</p>
              <p className="mt-1 text-2xl font-semibold text-horizon-dark">{fmtCurrency(data.receivable)}</p>
              <p className="mt-1 text-xs text-horizon-dark">{data.clientsDebtCount} client(s) à relancer</p>
            </button>
          ) : null}
          <CommercialTopClients rows={data.topClients} setTab={setTab} />
        </div>
      </div>
    </div>
  );
}

export default function CommercialRecoveredModule(props) {
  const { initialTab, onTabChange, onRefreshWorkflow } = props;
  const controlled = Boolean(onTabChange);
  const [internalTab, setInternalTab] = useState(() => resolveCommercialTab(initialTab || 'Tableau de bord'));
  const tab = controlled
    ? resolveCommercialTab(initialTab || 'Tableau de bord')
    : internalTab;
  const setTab = useCallback((value) => {
    const resolved = resolveCommercialTab(value);
    if (controlled) {
      onTabChange?.(resolved);
      return;
    }
    setInternalTab(resolved);
  }, [controlled, onTabChange]);
  const [pendingSaleDraft, setPendingSaleDraft] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (controlled || !initialTab) return;
    queueMicrotask(() => setInternalTab(resolveCommercialTab(initialTab)));
  }, [controlled, initialTab]);

  useEffect(() => {
    const handler = (detail = {}) => {
      const draft = detail.draft;
      const module = detail.module;
      if (!['commercial', 'ventes'].includes(module) || draft?.form_type !== 'sale_record') return false;
      setPendingSaleDraft(draft);
      setTab('Ventes');
      return true;
    };
    return subscribeFormModal(handler, { modules: ['commercial', 'ventes'] });
  }, [setTab]);
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
  const live = resolveCommercialDataset({
    props,
    ordersCrud,
    paymentsCrud,
    clientsCrud,
    opportunitiesCrud,
    deliveriesCrud,
    invoicesCrud,
    periodFiltered,
    periodScope: props.periodScope,
  });

  const { orders, ordersAll, paymentsAll, deliveriesAll, invoicesAll, clients: clientsRaw, opportunities } = live;

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
  const eventRows = rowsOf(props.businessEvents, eventsCrud, false);
  const sellableStocks = useMemo(() => listSellableStocks(stockRows, 50), [stockRows]);

  const refreshWorkflow = useCallback(async () => {
    if (onRefreshWorkflow) return onRefreshWorkflow();
    return Promise.allSettled([
      ordersCrud.refresh?.(), itemsCrud.refresh?.(), deliveriesCrud.refresh?.(), invoicesCrud.refresh?.(),
      paymentsCrud.refresh?.(), opportunitiesCrud.refresh?.(), clientsCrud.refresh?.(), financesCrud.refresh?.(),
      docsCrud.refresh?.(), eventsCrud.refresh?.(), tasksCrud.refresh?.(), alertsCrud.refresh?.(),
      whatsappLogsCrud.refresh?.(),
    ]);
  }, [
    onRefreshWorkflow, ordersCrud, itemsCrud, deliveriesCrud, invoicesCrud, paymentsCrud,
    opportunitiesCrud, clientsCrud, financesCrud, docsCrud, eventsCrud, tasksCrud, alertsCrud,
    whatsappLogsCrud,
  ]);

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
    onRefreshWorkflow: refreshWorkflow,
  }), [
    props.onCreate, props.onCreateItem, props.onUpdate, props.onCreateDelivery, props.onCreateInvoice,
    props.onCreateDocument, props.onCreatePayment, props.onCreateBusinessEvent, props.onUpdateDelivery,
    props.onUpdateClient, props.onCreateClient, props.onCreateTask, props.onUpdateTask, ordersCrud.create,
    itemsCrud.create, ordersCrud.update, deliveriesCrud.create, invoicesCrud.create, docsCrud.create,
    paymentsCrud.create, eventsCrud.create, deliveriesCrud.update, clientsCrud.update, clientsCrud.create,
    tasksCrud.create, tasksCrud.update, refreshWorkflow,
  ]);

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
      periodScope: props.periodScope,
      periodFiltered: Boolean(props.periodFiltered),
      monthKeys: props.periodScope?.monthKeys,
    };
    const displayReceivable = props.periodFiltered
      ? headlineKpis.receivable
      : receivable;
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
      receivable: displayReceivable,
      receivableAll: receivable,
      periodFiltered: Boolean(props.periodFiltered),
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
      moduleProjections: buildCommercialModuleProjections({
        salesOrdersAll: snapshotOrders,
        salesOrders: periodOrders,
      }, props.periodScope),
    };
  }, [
    orders, ordersAll, paymentsAll, deliveriesAll, invoicesAll, clients, opportunities,
    orderItemRows, transactionRows, documentsRows, stockRows, animauxRows, lotsRows, culturesRows,
    alertRows, whatsappLogRows, taskRows, sellableStocks, workflowHandlers, props.periodScope, props.farmScope,
    props.accessibleFarms, props.activeFarm, props.periodFiltered, props.alimentationLogs, props.productionLogs,
    props.vaccins, props.sante, props.businessEvents, props.businessPlans, alimentationCrud, productionCrud,
    santeCrud, eventsCrud, businessPlansCrud, pf,
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
  }), [props.onNavigate, props.onCreateAlert, alertsCrud.create, workflowHandlers, taskRows, alertRows]);

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
    const created = await whatsappLogsCrud.create?.(payload);
    await whatsappLogsCrud.refresh?.();
    return created?.id || payload.id || payload.logId;
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
    setTab('Clients & créances');
    toast.success('Message préparé - confirmez l\'envoi depuis la fiche client');
  };

  const openClientTab = () => setTab('Clients & créances');

  const convertOpportunityToSale = async (opportunity, client) => {
    let opp = { ...opportunity };
    const rawId = String(opp.id || '');
    if (rawId.startsWith('auto-opp-')) {
      const newId = makeId('OPP');
      const payload = {
        ...opp,
        id: newId,
        title: opp.title || opp.libelle || 'Opportunité auto',
        status: 'ouverte',
        statut: 'ouverte',
        client_id: client?.id || opp.client_id || '',
        client_nom: client?.nom || client?.name || opp.client_nom || '',
      };
      await (props.onCreateOpportunity || opportunitiesCrud.create)?.(payload);
      await opportunitiesCrud.refresh?.();
      opp = payload;
    }
    const formDraft = buildSaleFormFromOpportunity(
      opp,
      { clients, lots: rowsOf(props.lots, lotsCrud), animaux: rowsOf(props.animals || props.animaux, animalsCrud), stocks: rowsOf(props.stocks, stockCrud), cultures: rowsOf(props.cultures, culturesCrud) },
      client,
    );
    setPendingSaleDraft({ form_type: 'sale_record', intent_label: `Convertir: ${opp.title || opp.libelle || 'Opportunité'}`, ...formDraft });
    setTab('Ventes');
    toast.success('Formulaire vente prérempli - validez pour clôturer l\'opportunité');
  };

  const todoBadge = data.todoCount;
  const tabBadges = {
    'Ventes & commandes commercial': data.openSalesCount,
    'Créances & relances commercial': data.clientsDebtCount + (data.relanceRows?.length || 0),
    'Livraisons commercial': data.deliveryQueue?.late?.length || 0,
    'Clients commercial': data.subscriptionsDue?.length || 0,
    'Réclamations commercial': eventRows.filter((event) => /reclamation|réclamation/.test(String(event.event_type || '').toLowerCase())).length,
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
      salesOrders={data.ordersAll}
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
      <CommercialModuleHeader tab={tab} setTab={setTab} healthScore={data.healthScore} periodLabel={props.periodLabel} periodFiltered={periodFiltered} onNavigate={props.onNavigate} onOpenAssistant={props.onOpenAssistant} badges={{ receivable: data.receivable, receivableAll: data.receivableAll, todo: todoBadge, tabs: tabBadges }} />
      {tab === 'Ventes & commandes commercial' ? (
        <div className="space-y-4">
          <VentesV5 {...salesProps} user={props.user} />
          <details className="border-t border-line pt-4">
            <summary className="cursor-pointer text-sm font-semibold text-earth">Opportunités disponibles</summary>
            <div className="mt-4">{opportunitiesPanel}</div>
          </details>
        </div>
      ) : null}
      {tab === 'Clients commercial' ? (
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
          <CommercialSubscriptionsPanel clients={clients} onUpdateClient={workflowHandlers.onUpdateClient} onNewSale={openNewSale} activeFarm={props.activeFarm} />
        </div>
      ) : null}
      {tab === 'Livraisons commercial' ? (
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
      {tab === 'Factures & paiements commercial' ? (
        <div className="space-y-4">
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
        </div>
      ) : null}
      {tab === 'Créances & relances commercial' ? (
        <div className="space-y-4">
          <ClientsReadable {...clientProps} />
          <CommercialScheduledRelancesPanel rows={data.relanceRows} clients={clients} onCreateTask={workflowHandlers.onCreateTask} onRefreshTasks={props.onRefreshTasks || tasksCrud.refresh} onOpenClient={openClientTab} onPrepareWhatsApp={prepareRelanceWhatsApp} />
        </div>
      ) : null}
      {tab === 'Réclamations commercial' ? (
        <CommercialComplaintsPanel events={eventRows} tasks={taskRows} />
      ) : null}
      {tab === 'Tableau de bord commercial' ? (
        <div className="space-y-4">
          <Summary
            data={data}
            setTab={setTab}
            onNavigate={props.onNavigate}
            onApplyFinding={applyFinding}
            busyId={busyId}
          />
          <details className="rounded-2xl border border-line bg-card p-4">
            <summary className="cursor-pointer font-semibold text-sm text-earth">Devis & réconciliation (avancé)</summary>
            <div className="mt-3 space-y-4">
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
            </div>
          </details>
          <CommercialPilotagePanel
            data={data}
            setTab={setTab}
            periodLabel={props.periodLabel}
            periodFiltered={periodFiltered}
            marginContext={data.marginContext}
            chartOptions={data.chartOptions}
          />
          <MarginGlossaryPanel />
          <details className="rounded-2xl border border-line bg-card p-4">
            <summary className="cursor-pointer font-semibold text-sm text-earth">Annexe & graphiques</summary>
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
