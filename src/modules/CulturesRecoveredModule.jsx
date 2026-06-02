import useCrudModule from '../hooks/useCrudModule';
import { rowsOf } from '../utils/moduleRows';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import { runCultureHarvestSideEffects } from '../utils/cultureSideEffects';
import CulturesV4 from './CulturesV4.jsx';
import CulturesHarvestPanel from './cultures/CulturesHarvestPanel.jsx';
import CulturesRepairPanel from './cultures/CulturesRepairPanel.jsx';

const arr = (value) => (Array.isArray(value) ? value : []);

export default function CulturesRecoveredModule(props) {
  const periodFiltered = Boolean(props.periodFiltered);
  const culturesCrud = useCrudModule('cultures');
  const stockCrud = useCrudModule('stock');
  const opportunitiesCrud = useCrudModule('sales_opportunities');
  const eventsCrud = useCrudModule('business_events');
  const financesCrud = useCrudModule('finances');
  const salesCrud = useCrudModule('sales_orders');
  const paymentsCrud = useCrudModule('payments');
  const deliveriesCrud = useCrudModule('deliveries');

  const rows = rowsOf(props.rows || props.cultures, culturesCrud, periodFiltered);
  const stocks = rowsOf(props.stocks, stockCrud, false);
  const opportunities = rowsOf(props.opportunities, opportunitiesCrud, periodFiltered);
  const businessEvents = rowsOf(props.businessEvents, eventsCrud, periodFiltered);
  const transactions = rowsOf(props.transactions || props.finances, financesCrud, periodFiltered);
  const salesOrders = rowsOf(props.salesOrders, salesCrud, periodFiltered);

  const workflowContext = {
    cultures: rows,
    stocks,
    opportunities,
    transactions,
    businessEvents,
    salesOrders,
    payments: rowsOf(props.payments, paymentsCrud, periodFiltered),
    clients: arr(props.clients),
  };

  const workflowHandlers = {
    onUpdateCulture: props.onUpdate || culturesCrud.update,
    onCreateHarvestRecord: props.onCreateBusinessEvent || eventsCrud.create,
    onCreateStock: props.onCreateStock || stockCrud.create,
    onUpdateStock: props.onUpdateStock || stockCrud.update,
    onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create,
    onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update,
    onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    onCreateDocument: props.onCreateDocument,
    onCreateOrder: props.onCreateOrder || salesCrud.create,
    onCreatePayment: props.onCreatePayment || paymentsCrud.create,
    onCreateInvoice: props.onCreateInvoice,
  };

  const refreshWorkflow = async () => {
    await Promise.allSettled([
      culturesCrud.refresh?.(),
      stockCrud.refresh?.(),
      opportunitiesCrud.refresh?.(),
      eventsCrud.refresh?.(),
      financesCrud.refresh?.(),
      salesCrud.refresh?.(),
      paymentsCrud.refresh?.(),
    ]);
  };

  const harvestPanel = (
    <CulturesHarvestPanel
      rows={rows}
      context={workflowContext}
      handlers={workflowHandlers}
      onSuccess={refreshWorkflow}
    />
  );

  const syncHarvest = async (before = {}, after = {}, source = 'fiche culture') => {
    await runCultureHarvestSideEffects({
      before,
      after,
      stocks,
      opportunities,
      transactions,
      source,
      handlers: {
        onCreateStock: workflowHandlers.onCreateStock,
        onUpdateStock: workflowHandlers.onUpdateStock,
        onCreateOpportunity: workflowHandlers.onCreateOpportunity,
        onUpdateOpportunity: workflowHandlers.onUpdateOpportunity,
        onCreateFinanceTransaction: workflowHandlers.onCreateFinanceTransaction,
        onCreateBusinessEvent: workflowHandlers.onCreateBusinessEvent,
        onCreateTrace: props.onCreateTrace,
      },
    });
    await refreshWorkflow();
  };

  const onCreate = async (payload) => {
    await (props.onCreate || culturesCrud.create)?.(payload);
    await syncHarvest({}, payload, 'création culture');
  };

  const onUpdate = async (id, payload) => {
    const before = rows.find((row) => String(row.id) === String(id)) || {};
    const after = { ...before, ...payload, id };
    await (props.onUpdate || culturesCrud.update)?.(id, payload);
    await syncHarvest(before, after, 'modification culture');
  };

  return (
    <div className="space-y-6">
      <CulturesRepairPanel
        cultures={rows}
        stocks={stocks}
        businessEvents={businessEvents}
        transactions={transactions}
        salesOrders={salesOrders}
        onCreateBusinessEvent={eventsCrud.create}
        onUpdateStock={stockCrud.update}
        onRefresh={refreshWorkflow}
      />
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Production</p>
        <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Cultures</h1>
        <p className="mt-1 text-sm text-[#8a7456]">Parcelles, intrants, récoltes, stock vendable, ventes Commercial et rentabilité.</p>
        {props.periodLabel ? <div className="mt-2"><PeriodScopeBadge label={props.periodLabel} /></div> : null}
      </section>
      <CulturesV4
        {...props}
        harvestPanel={harvestPanel}
        rows={rows}
        stocks={stocks}
        opportunities={opportunities}
        transactions={transactions}
        salesOrders={salesOrders}
        payments={rowsOf(props.payments, paymentsCrud, periodFiltered)}
        deliveriesList={rowsOf(props.deliveriesList || props.deliveries, deliveriesCrud, periodFiltered)}
        businessEvents={businessEvents}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={props.onDelete || culturesCrud.remove}
        onRefresh={props.onRefresh || culturesCrud.refresh}
        onCreateStock={workflowHandlers.onCreateStock}
        onUpdateStock={workflowHandlers.onUpdateStock}
        onRefreshStock={props.onRefreshStock || stockCrud.refresh}
        onRefreshStocks={props.onRefreshStocks || stockCrud.refresh}
        onCreateOpportunity={workflowHandlers.onCreateOpportunity}
        onUpdateOpportunity={workflowHandlers.onUpdateOpportunity}
        onRefreshOpportunities={props.onRefreshOpportunities || opportunitiesCrud.refresh}
        onCreateBusinessEvent={workflowHandlers.onCreateBusinessEvent}
        onRefreshBusinessEvents={props.onRefreshBusinessEvents || eventsCrud.refresh}
        onCreateFinanceTransaction={workflowHandlers.onCreateFinanceTransaction}
        onRefreshFinances={props.onRefreshFinances || financesCrud.refresh}
      />
    </div>
  );
}
