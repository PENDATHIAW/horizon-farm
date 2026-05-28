import useCrudModule from '../hooks/useCrudModule';
import { buildCultureHarvestWorkflow } from '../utils/cultureWorkflows';
import CulturesV4 from './CulturesV4.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const rowsOf = (provided, crud) => arr(provided).length ? arr(provided) : arr(crud?.rows);

export default function CulturesRecoveredModule(props) {
  const culturesCrud = useCrudModule('cultures');
  const stockCrud = useCrudModule('stock');
  const opportunitiesCrud = useCrudModule('sales_opportunities');
  const eventsCrud = useCrudModule('business_events');
  const financesCrud = useCrudModule('finances');
  const salesCrud = useCrudModule('sales_orders');
  const paymentsCrud = useCrudModule('payments');
  const deliveriesCrud = useCrudModule('deliveries');

  const rows = rowsOf(props.rows || props.cultures, culturesCrud);
  const stocks = rowsOf(props.stocks, stockCrud);
  const opportunities = rowsOf(props.opportunities, opportunitiesCrud);

  const syncHarvest = async (before = {}, after = {}, source = 'fiche culture') => {
    const workflow = buildCultureHarvestWorkflow({ before, after, stocks, opportunities, source });
    if (!workflow) return;
    if (workflow.stockExistingId) await (props.onUpdateStock || stockCrud.update)?.(workflow.stockExistingId, workflow.stock);
    else await (props.onCreateStock || stockCrud.create)?.(workflow.stock);
    if (workflow.opportunityExistingId) await (props.onUpdateOpportunity || opportunitiesCrud.update)?.(workflow.opportunityExistingId, workflow.opportunity);
    else await (props.onCreateOpportunity || opportunitiesCrud.create)?.(workflow.opportunity);
    if (workflow.event) await (props.onCreateBusinessEvent || eventsCrud.create)?.(workflow.event);
    await Promise.allSettled([stockCrud.refresh?.(), opportunitiesCrud.refresh?.(), eventsCrud.refresh?.(), props.onRefreshStock?.(), props.onRefreshStocks?.(), props.onRefreshOpportunities?.(), props.onRefreshBusinessEvents?.()]);
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

  return <div className="space-y-6"><section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Production</p><h1 className="mt-1 text-2xl font-black text-[#2f2415]">Cultures</h1><p className="mt-1 text-sm text-[#8a7456]">Parcelles, intrants, météo, récoltes, pertes, stock, opportunités et historique métier.</p></section><CulturesV4 {...props} rows={rows} stocks={stocks} opportunities={opportunities} transactions={rowsOf(props.transactions || props.finances, financesCrud)} salesOrders={rowsOf(props.salesOrders, salesCrud)} payments={rowsOf(props.payments, paymentsCrud)} deliveriesList={rowsOf(props.deliveriesList || props.deliveries, deliveriesCrud)} businessEvents={rowsOf(props.businessEvents, eventsCrud)} onCreate={onCreate} onUpdate={onUpdate} onDelete={props.onDelete || culturesCrud.remove} onRefresh={props.onRefresh || culturesCrud.refresh} onCreateStock={props.onCreateStock || stockCrud.create} onUpdateStock={props.onUpdateStock || stockCrud.update} onRefreshStock={props.onRefreshStock || stockCrud.refresh} onRefreshStocks={props.onRefreshStocks || stockCrud.refresh} onCreateOpportunity={props.onCreateOpportunity || opportunitiesCrud.create} onUpdateOpportunity={props.onUpdateOpportunity || opportunitiesCrud.update} onRefreshOpportunities={props.onRefreshOpportunities || opportunitiesCrud.refresh} onCreateBusinessEvent={props.onCreateBusinessEvent || eventsCrud.create} onRefreshBusinessEvents={props.onRefreshBusinessEvents || eventsCrud.refresh} /></div>;
}
