import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
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
import { rowsOf, allRows } from '../utils/moduleRows';
import { CommercialKpi, CommercialModuleHeader, CommercialQuickActions, CommercialTodoRow, CommercialTopClients } from './commercial/CommercialShell.jsx';
import CommercialOpportunitiesPanel from './commercial/CommercialOpportunitiesPanel.jsx';
import VentesV3 from './VentesV3';
import ClientsReadable from './ClientsReadable';

const arr = (v) => (Array.isArray(v) ? v : []);

function Summary({ data, setTab, onNewSale }) {
  const todos = data.summaryTodos.slice(0, 6);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CommercialKpi label="Encaissé" value={fmtCurrency(data.collected)} tone="good" onClick={() => setTab('Graphiques')} />
        <CommercialKpi label="Créances" value={fmtCurrency(data.receivable)} tone={data.receivable ? 'warn' : 'good'} onClick={() => setTab('Clients')} />
        <CommercialKpi label="Ventes ouvertes" value={fmtNumber(data.openSalesCount)} tone={data.openSalesCount ? 'warn' : 'good'} onClick={() => setTab('Ventes')} />
        <CommercialKpi label="Opportunités" value={fmtNumber(data.openOpportunities.length)} tone="good" onClick={() => setTab('Opportunités')} />
      </div>

      <CommercialQuickActions setTab={setTab} onNewSale={onNewSale} />

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
  const [tab, setTab] = useState(() => resolveCommercialTab(props.initialTab));
  const [pendingSaleDraft, setPendingSaleDraft] = useState(null);

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
    return {
      orders: periodOrders,
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
    };
  }, [orders, ordersAll, payments, paymentsAll, deliveriesAll, invoicesAll, clients, opportunities]);

  const openNewSale = () => {
    setPendingSaleDraft({ form_type: 'sale_record', date: new Date().toISOString().slice(0, 10) });
    setTab('Ventes');
  };


  const refreshWorkflow = props.onRefreshWorkflow || (async () => Promise.allSettled([ordersCrud.refresh?.(), itemsCrud.refresh?.(), deliveriesCrud.refresh?.(), invoicesCrud.refresh?.(), paymentsCrud.refresh?.(), opportunitiesCrud.refresh?.(), clientsCrud.refresh?.(), financesCrud.refresh?.(), docsCrud.refresh?.(), eventsCrud.refresh?.(), tasksCrud.refresh?.(), alertsCrud.refresh?.()]));
  const pf = periodFiltered;
  const traceRows = allRows(props.tracabiliteAll, traceCrud).length ? allRows(props.tracabiliteAll, traceCrud) : rowsOf(props.tracabilite, traceCrud, pf);
  const salesProps = { embedded: true, rows: data.orders, clients, initialSaleDraft: pendingSaleDraft, onConsumeSaleDraft: () => setPendingSaleDraft(null), orderItems: rowsOf(props.orderItems, itemsCrud, pf), deliveriesList: deliveriesAll.length ? deliveriesAll : rowsOf(props.deliveries, deliveriesCrud, pf), invoicesList: rowsOf(props.invoices, invoicesCrud, pf), paymentsList: paymentsAll, payments: paymentsAll, opportunities, tasks: rowsOf(props.tasks || props.existingTasks, tasksCrud, false), existingTasks: rowsOf(props.existingTasks || props.tasks, tasksCrud, false), animaux: rowsOf(props.animals || props.animaux, animalsCrud, false), lots: rowsOf(props.lots, lotsCrud, false), cultures: rowsOf(props.cultures, culturesCrud, false), stocks: rowsOf(props.stocks, stockCrud, false), alimentationLogs: rowsOf(props.alimentationLogs, alimentationCrud, pf), productionLogs: rowsOf(props.productionLogs, productionCrud, pf), vaccins: rowsOf(props.vaccins || props.sante, santeCrud, pf), transactions: rowsOf(props.transactions, financesCrud, pf), businessEvents: rowsOf(props.businessEvents, eventsCrud, pf), documents: rowsOf(props.documents, docsCrud, pf), alertes: rowsOf(props.alertes, alertsCrud, false), onCreate: props.onCreate || ordersCrud.create, onUpdate: props.onUpdate || ordersCrud.update, onDelete: props.onDelete || ordersCrud.remove, onRefresh: props.onRefresh || ordersCrud.refresh, onCreateItem: props.onCreateItem || itemsCrud.create, onUpdateItem: props.onUpdateItem || itemsCrud.update, onDeleteItem: props.onDeleteItem || itemsCrud.remove, onCreateDelivery: props.onCreateDelivery || deliveriesCrud.create, onUpdateDelivery: props.onUpdateDelivery || deliveriesCrud.update, onDeleteDelivery: props.onDeleteDelivery || deliveriesCrud.remove, onRefreshDeliveries: props.onRefreshDeliveries || deliveriesCrud.refresh, onCreateInvoice: props.onCreateInvoice || invoicesCrud.create, onUpdateInvoice: props.onUpdateInvoice || invoicesCrud.update, onDeleteInvoice: props.onDeleteInvoice || invoicesCrud.remove, onRefreshInvoices: props.onRefreshInvoices || invoicesCrud.refresh, onCreatePayment: props.onCreatePayment || paymentsCrud.create, onUpdatePayment: props.onUpdatePayment || paymentsCrud.update, onDeletePayment: props.onDeletePayment || paymentsCrud.remove, onRefreshPayments: props.onRefreshPayments || paymentsCrud.refresh, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onDeleteOpportunity: props.onDeleteOpportunity || opportunitiesCrud.remove, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh, onUpdateAnimal: props.onUpdateAnimal || animalsCrud.update, onRefreshAnimals: props.onRefreshAnimals || animalsCrud.refresh, onUpdateLot: props.onUpdateLot || lotsCrud.update, onRefreshLots: props.onRefreshLots || lotsCrud.refresh, onUpdateCulture: props.onUpdateCulture || culturesCrud.update, onRefreshCultures: props.onRefreshCultures || culturesCrud.refresh, onUpdateStock: props.onUpdateStock || stockCrud.update, onRefreshStocks: props.onRefreshStocks || stockCrud.refresh, onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create, onUpdateFinanceTransaction: props.onUpdateFinanceTransaction || financesCrud.update, onDeleteFinanceTransaction: props.onDeleteFinanceTransaction || financesCrud.remove, onRefreshFinances: props.onRefreshFinances || financesCrud.refresh, onCreateTrace: props.onCreateTrace || traceCrud.create, onUpdateTrace: props.onUpdateTrace || traceCrud.update, onRefreshTrace: props.onRefreshTrace || traceCrud.refresh, traces: traceRows, onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onCreateDocument: props.onCreateDocument || docsCrud.create, onUpdateDocument: props.onUpdateDocument || docsCrud.update, onDeleteDocument: props.onDeleteDocument || docsCrud.remove, onRefreshDocuments: props.onRefreshDocuments || docsCrud.refresh, onCreateAlert: props.onCreateAlert || alertsCrud.create, onUpdateAlert: props.onUpdateAlert || alertsCrud.update, onDeleteAlert: props.onDeleteAlert || alertsCrud.remove, onCreateTask: props.onCreateTask || tasksCrud.create, onUpdateTask: props.onUpdateTask || tasksCrud.update, onDeleteTask: props.onDeleteTask || tasksCrud.remove, onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh, onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh, onUpdateClient: props.onUpdateClient || clientsCrud.update, onRefreshClients: props.onRefreshClients || clientsCrud.refresh, onRefreshWorkflow: refreshWorkflow, onNavigate: props.onNavigate };
  const whatsappLogsCrud = useCrudModule('whatsapp_logs');
  const clientProps = { embedded: true, rows: clients, salesOrders: enrichCommercialOrders(ordersAll, { deliveries: deliveriesAll, invoices: invoicesAll }), payments: paymentsAll, opportunities: data.openOpportunities, transactions: rowsOf(props.transactions, financesCrud, pf), onCreate: props.onCreateClient || clientsCrud.create, onUpdate: props.onUpdateClient || clientsCrud.update, onDelete: props.onDeleteClient || clientsCrud.remove, onRefresh: props.onRefreshClients || clientsCrud.refresh, onNavigate: props.onNavigate };

  const logOpportunityWhatsApp = async (client, message) => {
    await whatsappLogsCrud.create?.({
      id: makeId('WALOG'),
      client_id: client.id,
      recipient: client.whatsapp || client.tel || client.phone,
      message,
      status: 'prepare',
      provider: 'whatsapp',
      reason: 'proposition_opportunite',
      sent_at: new Date().toISOString(),
    });
    await whatsappLogsCrud.refresh?.();
  };

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

  return (
    <div className="space-y-4">
      <CommercialModuleHeader tab={tab} setTab={setTab} healthScore={data.healthScore} periodLabel={props.periodLabel} onNavigate={props.onNavigate} onOpenAssistant={props.onOpenAssistant} badges={{ receivable: data.receivable, todo: todoBadge, tabs: { Ventes: data.openSalesCount, Clients: data.clientsDebtCount, Opportunités: data.openOpportunities.length } }} />
      {tab === 'Résumé' ? <Summary data={data} setTab={setTab} onNewSale={openNewSale} /> : null}
      {tab === 'Ventes' ? <VentesV4 {...salesProps} /> : null}
      {tab === 'Clients' ? <ClientsReadable {...clientProps} /> : null}
      {tab === 'Opportunités' ? <CommercialOpportunitiesPanel opportunities={data.openOpportunities} clients={clients} salesOrders={data.orders} setTab={setTab} onWhatsAppLog={logOpportunityWhatsApp} onConvertSale={convertOpportunityToSale} /> : null}
      {tab === 'Annexe' ? <ModuleAnnexeTab moduleId="commercial" dataMap={{ sales_orders: ordersAll, payments: paymentsAll, clients }} onNavigate={props.onNavigate} /> : null}
      {tab === 'Graphiques' ? (
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
      ) : null}
    </div>
  );
}
