import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { applyOneClickRecommendation } from '../services/heyHorizonRecommendationActions.js';
import { buildSaleFormFromOpportunity } from '../utils/saleFormDraft';
import { resolveCommercialTab } from '../utils/commercialNavigation';
import { makeId } from '../utils/ids';
import CommercialInsightPanel from './commercial/CommercialInsightPanel.jsx';
import CommercialOpportunitiesPanel from './commercial/CommercialOpportunitiesPanel.jsx';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { buildCommercialHealthSnapshot } from './commercial/commercialVisionHelpers.js';
import {
  aggregateClientReceivables,
  buildCommercialCoherenceRows,
  buildSummaryTodos,
  buildTopClients,
  clientsWithReceivableCount,
  collectedFromOrders,
  isOpportunityOpen,
  openSalesCount,
  receivableFromOrders,
  uniqueTodoCount,
} from './commercial/commercialMetrics.js';
import { CommercialKpi, CommercialModuleHeader, CommercialQuickActions, CommercialTodoRow, CommercialTopClients } from './commercial/CommercialShell.jsx';
import VentesV3 from './VentesV3';
import ClientsReadable from './ClientsReadable';

const arr = (v) => (Array.isArray(v) ? v : []);
const rowsOf = (provided, crud) => (arr(provided).length ? arr(provided) : arr(crud?.rows));

function Summary({ data, setTab, onApply, busyId, onNavigate, onNewSale }) {
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

      <CommercialQuickActions setTab={setTab} onNewSale={onNewSale} />

      <CommercialInsightPanel
        findings={data.healthFindings}
        predictions={data.healthPredictions}
        coherenceRows={data.coherenceRows}
        onApplyFinding={onApply}
        onNavigate={onNavigate}
        setTab={setTab}
        busyId={busyId}
      />

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

export default function CommercialRecoveredModule(props) {
  const [tab, setTab] = useState(() => resolveCommercialTab(props.initialTab));
  const [busyId, setBusyId] = useState(null);
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
    const topClients = buildTopClients(orders, clients, 5);
    const clientsDebtCount = clientsWithReceivableCount(orders, payments);
    const openOpportunities = opportunities.filter(isOpportunityOpen);
    const healthSnap = buildCommercialHealthSnapshot({ salesOrders: orders, payments, clients, opportunities });
    const coherenceRows = buildCommercialCoherenceRows(orders, payments);
    const clientReceivables = aggregateClientReceivables(orders, payments);
    const summaryTodos = buildSummaryTodos(orders, payments, healthSnap.findings);
    return {
      orders, openSalesCount: openSalesCountVal, receivable, collected, topClients, openOpportunities,
      clientsDebtCount,
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
      else if (finding.module === 'commercial' || finding.module_source === 'commercial') setTab('Ventes');
      else toast.success('Module ouvert');
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };

  const openNewSale = () => {
    setPendingSaleDraft({ form_type: 'sale_record', date: new Date().toISOString().slice(0, 10) });
    setTab('Ventes');
  };


  const refreshWorkflow = props.onRefreshWorkflow || (async () => Promise.allSettled([ordersCrud.refresh?.(), itemsCrud.refresh?.(), deliveriesCrud.refresh?.(), invoicesCrud.refresh?.(), paymentsCrud.refresh?.(), opportunitiesCrud.refresh?.(), clientsCrud.refresh?.(), financesCrud.refresh?.(), docsCrud.refresh?.(), eventsCrud.refresh?.()]));
  const salesProps = { embedded: true, rows: orders, clients, initialSaleDraft: pendingSaleDraft, onConsumeSaleDraft: () => setPendingSaleDraft(null), orderItems: rowsOf(props.orderItems, itemsCrud), deliveriesList: rowsOf(props.deliveries, deliveriesCrud), invoicesList: rowsOf(props.invoices, invoicesCrud), paymentsList: payments, opportunities, animaux: rowsOf(props.animals || props.animaux, animalsCrud), lots: rowsOf(props.lots, lotsCrud), cultures: rowsOf(props.cultures, culturesCrud), stocks: rowsOf(props.stocks, stockCrud), alimentationLogs: rowsOf(props.alimentationLogs, alimentationCrud), productionLogs: rowsOf(props.productionLogs, productionCrud), vaccins: rowsOf(props.vaccins || props.sante, santeCrud), transactions: rowsOf(props.transactions, financesCrud), businessEvents: rowsOf(props.businessEvents, eventsCrud), documents: rowsOf(props.documents, docsCrud), alertes: rowsOf(props.alertes, alertsCrud), onCreate: props.onCreate || ordersCrud.create, onUpdate: props.onUpdate || ordersCrud.update, onDelete: props.onDelete || ordersCrud.remove, onRefresh: props.onRefresh || ordersCrud.refresh, onCreateItem: props.onCreateItem || itemsCrud.create, onUpdateItem: props.onUpdateItem || itemsCrud.update, onDeleteItem: props.onDeleteItem || itemsCrud.remove, onCreateDelivery: props.onCreateDelivery || deliveriesCrud.create, onUpdateDelivery: props.onUpdateDelivery || deliveriesCrud.update, onDeleteDelivery: props.onDeleteDelivery || deliveriesCrud.remove, onRefreshDeliveries: props.onRefreshDeliveries || deliveriesCrud.refresh, onCreateInvoice: props.onCreateInvoice || invoicesCrud.create, onUpdateInvoice: props.onUpdateInvoice || invoicesCrud.update, onDeleteInvoice: props.onDeleteInvoice || invoicesCrud.remove, onRefreshInvoices: props.onRefreshInvoices || invoicesCrud.refresh, onCreatePayment: props.onCreatePayment || paymentsCrud.create, onUpdatePayment: props.onUpdatePayment || paymentsCrud.update, onDeletePayment: props.onDeletePayment || paymentsCrud.remove, onRefreshPayments: props.onRefreshPayments || paymentsCrud.refresh, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onDeleteOpportunity: props.onDeleteOpportunity || opportunitiesCrud.remove, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh, onUpdateAnimal: props.onUpdateAnimal || animalsCrud.update, onRefreshAnimals: props.onRefreshAnimals || animalsCrud.refresh, onUpdateLot: props.onUpdateLot || lotsCrud.update, onRefreshLots: props.onRefreshLots || lotsCrud.refresh, onUpdateCulture: props.onUpdateCulture || culturesCrud.update, onRefreshCultures: props.onRefreshCultures || culturesCrud.refresh, onUpdateStock: props.onUpdateStock || stockCrud.update, onRefreshStocks: props.onRefreshStocks || stockCrud.refresh, onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create, onUpdateFinanceTransaction: props.onUpdateFinanceTransaction || financesCrud.update, onDeleteFinanceTransaction: props.onDeleteFinanceTransaction || financesCrud.remove, onRefreshFinances: props.onRefreshFinances || financesCrud.refresh, onCreateTrace: props.onCreateTrace || traceCrud.create, onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onCreateDocument: props.onCreateDocument || docsCrud.create, onUpdateDocument: props.onUpdateDocument || docsCrud.update, onDeleteDocument: props.onDeleteDocument || docsCrud.remove, onRefreshDocuments: props.onRefreshDocuments || docsCrud.refresh, onCreateAlert: props.onCreateAlert || alertsCrud.create, onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh, onUpdateClient: props.onUpdateClient || clientsCrud.update, onRefreshClients: props.onRefreshClients || clientsCrud.refresh, onRefreshWorkflow: refreshWorkflow, onNavigate: props.onNavigate };
  const whatsappLogsCrud = useCrudModule('whatsapp_logs');
  const clientProps = { embedded: true, rows: clients, salesOrders: orders, payments, opportunities: data.openOpportunities, transactions: rowsOf(props.transactions, financesCrud), onCreate: props.onCreateClient || clientsCrud.create, onUpdate: props.onUpdateClient || clientsCrud.update, onDelete: props.onDeleteClient || clientsCrud.remove, onRefresh: props.onRefreshClients || clientsCrud.refresh, onNavigate: props.onNavigate };

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
      <CommercialModuleHeader tab={tab} setTab={setTab} healthScore={data.healthScore} badges={{ receivable: data.receivable, todo: todoBadge, tabs: { Ventes: data.openSalesCount, Clients: data.clientsDebtCount, Opportunités: data.openOpportunities.length } }} />
      {tab === 'Résumé' ? <Summary data={data} setTab={setTab} onApply={applyFinding} busyId={busyId} onNavigate={props.onNavigate} onNewSale={openNewSale} /> : null}
      {tab === 'Ventes' ? <VentesV3 {...salesProps} /> : null}
      {tab === 'Clients' ? <ClientsReadable {...clientProps} /> : null}
      {tab === 'Opportunités' ? <CommercialOpportunitiesPanel opportunities={data.openOpportunities} clients={clients} salesOrders={orders} setTab={setTab} onWhatsAppLog={logOpportunityWhatsApp} onConvertSale={convertOpportunityToSale} /> : null}
      {tab === 'Graphiques' ? (
        <ModuleGraphiquesTab
          moduleId="commercial"
          salesOrders={orders}
          payments={payments}
          opportunities={opportunities}
          clients={clients}
          lots={rowsOf(props.lots, lotsCrud)}
          animaux={rowsOf(props.animals || props.animaux, animalsCrud)}
          cultures={rowsOf(props.cultures, culturesCrud)}
          stocks={rowsOf(props.stocks, stockCrud)}
          alimentationLogs={rowsOf(props.alimentationLogs, alimentationCrud)}
          productionLogs={rowsOf(props.productionLogs, productionCrud)}
          vaccins={rowsOf(props.vaccins || props.sante, santeCrud)}
          businessEvents={rowsOf(props.businessEvents, eventsCrud)}
          transactions={rowsOf(props.transactions, financesCrud)}
          onNavigate={props.onNavigate}
        />
      ) : null}
    </div>
  );
}
