import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import useCrudModule from '../hooks/useCrudModule';
import useLiveWeather from '../hooks/useLiveWeather';
import { rowsOf } from '../utils/moduleRows';
import { resolveCulturesSectionIntent, resolveCulturesTab } from '../utils/culturesNavigation.js';
import { buildCulturesChartNarratives } from '../utils/culturesChartNarratives.js';
import { runCultureHarvestSideEffects } from '../utils/cultureSideEffects';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import CulturesAnnexeTab from './cultures/CulturesAnnexeTab.jsx';
import CulturesCyclesHub from './cultures/CulturesCyclesHub.jsx';
import CulturesEconomieHub from './cultures/CulturesEconomieHub.jsx';
import CulturesIntrantsHub from './cultures/CulturesIntrantsHub.jsx';
import CulturesParcellesHub from './cultures/CulturesParcellesHub.jsx';
import CulturesPilotageHub from './cultures/CulturesPilotageHub.jsx';
import CulturesRecoltesHub from './cultures/CulturesRecoltesHub.jsx';
import CulturesSanteHub from './cultures/CulturesSanteHub.jsx';
import CulturesTransformationHub from './cultures/CulturesTransformationHub.jsx';
import ModuleProjectionsStrip from '../components/module/ModuleProjectionsStrip.jsx';
import { buildCulturesModuleProjections } from '../utils/moduleProjections.js';

const arr = (value) => (Array.isArray(value) ? value : []);

export default function CulturesRecoveredModule(props) {
  const controlled = Boolean(props.onTabChange);
  const [internalTab, setInternalTab] = useState(() => resolveCulturesTab(props.initialTab || 'Parcelles & campagnes'));
  const [sectionIntent, setSectionIntent] = useState(() => resolveCulturesSectionIntent(props.initialTab).section);
  const intrantsDetailsRef = useRef(null);
  const santeDetailsRef = useRef(null);
  const cyclesDetailsRef = useRef(null);
  const annexeDetailsRef = useRef(null);
  const transformationDetailsRef = useRef(null);
  const graphiquesDetailsRef = useRef(null);
  const tab = controlled
    ? resolveCulturesTab(props.initialTab || 'Parcelles & campagnes')
    : internalTab;
  const rememberSection = useCallback((value = '') => {
    const { section } = resolveCulturesSectionIntent(value);
    if (section) setSectionIntent(section);
  }, []);
  const setTab = useCallback((value) => {
    rememberSection(value);
    const resolved = resolveCulturesTab(value);
    const raw = String(value || '').trim();
    if (controlled) {
      props.onTabChange?.(raw || resolved);
      return;
    }
    setInternalTab(resolved);
  }, [controlled, props.onTabChange, rememberSection]);

  useEffect(() => {
    if (controlled || !props.initialTab) return;
    rememberSection(props.initialTab);
    setInternalTab(resolveCulturesTab(props.initialTab));
  }, [controlled, props.initialTab, rememberSection]);

  useEffect(() => {
    if (!props.initialTab) return;
    rememberSection(props.initialTab);
  }, [props.initialTab, rememberSection]);

  useEffect(() => {
    const refBySection = {
      intrants: intrantsDetailsRef,
      sante: santeDetailsRef,
      cycles: cyclesDetailsRef,
      annexe: annexeDetailsRef,
      transformation: transformationDetailsRef,
      graphiques: graphiquesDetailsRef,
    };
    const target = refBySection[sectionIntent]?.current;
    if (!target) return;
    target.open = true;
    window.setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  }, [tab, sectionIntent]);

  const periodFiltered = Boolean(props.periodFiltered);
  const culturesCrud = useCrudModule('cultures');
  const stockCrud = useCrudModule('stock');
  const opportunitiesCrud = useCrudModule('sales_opportunities');
  const eventsCrud = useCrudModule('business_events');
  const financesCrud = useCrudModule('finances');
  const salesCrud = useCrudModule('sales_orders');
  const paymentsCrud = useCrudModule('payments');
  const deliveriesCrud = useCrudModule('deliveries');
  const documentsCrud = useCrudModule('documents');
  const movementsCrud = useCrudModule('stock_movements');
  const { weather: liveMeteo } = useLiveWeather();

  const rows = rowsOf(props.rows || props.cultures, culturesCrud, periodFiltered);
  const stocks = rowsOf(props.stocks, stockCrud, false);
  const opportunities = rowsOf(props.opportunities, opportunitiesCrud, periodFiltered);
  const businessEvents = rowsOf(props.businessEvents, eventsCrud, periodFiltered);
  const transactions = rowsOf(props.transactions || props.finances, financesCrud, periodFiltered);
  const salesOrders = rowsOf(props.salesOrders, salesCrud, periodFiltered);
  const payments = rowsOf(props.payments, paymentsCrud, periodFiltered);
  const deliveriesList = rowsOf(props.deliveriesList || props.deliveries, deliveriesCrud, periodFiltered);
  const documents = rowsOf(props.documents, documentsCrud, periodFiltered);
  const stockMovements = rowsOf(props.stockMovements, movementsCrud, false);
  const meteo = props.meteo || liveMeteo;

  const workflowContext = {
    cultures: rows,
    stocks,
    opportunities,
    transactions,
    businessEvents,
    salesOrders,
    payments: payments,
    clients: arr(props.clients),
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

  const onUpdateCultureOnly = async (id, payload) => {
    await (props.onUpdate || culturesCrud.update)?.(id, payload);
  };

  const workflowHandlers = {
    onUpdateCulture: onUpdateCultureOnly,
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
    await onUpdateCultureOnly(id, payload);
    if (payload.side_effects_managed || payload.derniere_recolte_id || payload.last_harvest_at) {
      await refreshWorkflow();
      return;
    }
    const saleOnlyKeys = new Set(['vendable', 'pret_a_la_vente', 'ready_for_sale', 'sale_ready', 'sale_ready_confirmed_at', 'last_sale_opportunity_at', 'updated_at']);
    const patchKeys = Object.keys(payload).filter((key) => key !== 'id');
    if (patchKeys.length > 0 && patchKeys.every((key) => saleOnlyKeys.has(key))) {
      await refreshWorkflow();
      return;
    }
    const after = { ...before, ...payload, id };
    await syncHarvest(before, after, 'modification culture');
  };

  const sharedV3Props = {
    rows,
    stocks,
    stockMovements,
    opportunities,
    transactions,
    salesOrders,
    payments,
    deliveriesList,
    businessEvents,
    onCreate,
    onUpdate,
    onDelete: props.onDelete || culturesCrud.remove,
    onRefresh: props.onRefresh || culturesCrud.refresh,
    onCreateStock: workflowHandlers.onCreateStock,
    onUpdateStock: workflowHandlers.onUpdateStock,
    onRefreshStock: props.onRefreshStock || stockCrud.refresh,
    onRefreshStocks: props.onRefreshStocks || stockCrud.refresh,
    onCreateOpportunity: workflowHandlers.onCreateOpportunity,
    onUpdateOpportunity: workflowHandlers.onUpdateOpportunity,
    onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh,
    onCreateBusinessEvent: workflowHandlers.onCreateBusinessEvent,
    onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh,
    onCreateFinanceTransaction: workflowHandlers.onCreateFinanceTransaction,
    onRefreshFinances: props.onRefreshFinances || financesCrud.refresh,
    onCreateStockMovement: props.onCreateStockMovement,
    onRefreshStockMovements: props.onRefreshStockMovements,
    onNavigate: props.onNavigate,
    meteo,
    transactions,
    activeFarm: props.activeFarm,
  };

  const dataMap = useMemo(() => ({
    sales_orders: salesOrders,
    payments,
    finances: transactions,
    cultures: rows,
    stock: stocks,
    stocks,
    meteo,
  }), [salesOrders, payments, transactions, rows, stocks, meteo]);

  const chartNarratives = useMemo(() => buildCulturesChartNarratives(rows), [rows]);
  const culturesModuleProjections = useMemo(
    () => buildCulturesModuleProjections({ cultures: rows }),
    [rows],
  );

  const content = tab === 'Parcelles & campagnes' ? (
    <div className="space-y-4">
      <ModuleProjectionsStrip projections={culturesModuleProjections} onNavigate={props.onNavigate} />
      <CulturesPilotageHub
        rows={rows}
        stocks={stocks}
        salesOrders={salesOrders}
        businessEvents={businessEvents}
        transactions={transactions}
        opportunities={opportunities}
        meteo={meteo}
        dataMap={dataMap}
        onNavigate={props.onNavigate}
        onCreateBusinessEvent={eventsCrud.create}
        onCreateStock={workflowHandlers.onCreateStock}
        onUpdateStock={stockCrud.update}
        onRefresh={refreshWorkflow}
      />
      <CulturesParcellesHub {...sharedV3Props} />
      <details ref={intrantsDetailsRef} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <summary className="cursor-pointer font-black text-sm text-[#2f2415]">Intrants & météo</summary>
        <div className="mt-3">
          <CulturesIntrantsHub {...sharedV3Props} />
        </div>
      </details>
      <details ref={santeDetailsRef} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <summary className="cursor-pointer font-black text-sm text-[#2f2415]">Santé & protection</summary>
        <div className="mt-3">
          <CulturesSanteHub {...sharedV3Props} />
        </div>
      </details>
      <details ref={cyclesDetailsRef} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <summary className="cursor-pointer font-black text-sm text-[#2f2415]">Cycles & campagnes</summary>
        <div className="mt-3">
          <CulturesCyclesHub rows={rows} salesOrders={salesOrders} deliveries={deliveriesList} businessEvents={businessEvents} onNavigate={props.onNavigate} />
        </div>
      </details>
      <details ref={annexeDetailsRef} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <summary className="cursor-pointer font-black text-sm text-[#2f2415]">Annexe documents</summary>
        <div className="mt-3">
          <CulturesAnnexeTab documents={documents} onNavigate={props.onNavigate} />
        </div>
      </details>
    </div>
  ) : tab === 'Récoltes' ? (
    <div className="space-y-4">
      <CulturesRecoltesHub
        rows={rows}
        stocks={stocks}
        context={workflowContext}
        handlers={workflowHandlers}
        onSuccess={refreshWorkflow}
        opportunities={opportunities}
        onUpdate={onUpdate}
        onRefresh={sharedV3Props.onRefresh}
        onCreateOpportunity={workflowHandlers.onCreateOpportunity}
        onUpdateOpportunity={workflowHandlers.onUpdateOpportunity}
        onRefreshOpportunities={sharedV3Props.onRefreshOpportunities}
        onCreateBusinessEvent={workflowHandlers.onCreateBusinessEvent}
        onRefreshBusinessEvents={sharedV3Props.onRefreshBusinessEvents}
        onNavigate={props.onNavigate}
      />
      <details ref={transformationDetailsRef} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <summary className="cursor-pointer font-black text-sm text-[#2f2415]">Transformation cultures</summary>
        <div className="mt-3">
          <CulturesTransformationHub
            rows={rows}
            stocks={stocks}
            context={workflowContext}
            handlers={workflowHandlers}
            onSuccess={refreshWorkflow}
            onNavigate={props.onNavigate}
          />
        </div>
      </details>
    </div>
  ) : (
    <div className="space-y-4">
      <CulturesEconomieHub stocks={stocks} salesOrders={salesOrders} rows={rows} businessEvents={businessEvents} dataMap={dataMap} onNavigate={props.onNavigate} />
      <details ref={graphiquesDetailsRef} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <summary className="cursor-pointer font-black text-sm text-[#2f2415]">Graphiques & courbes</summary>
        <div className="mt-3 space-y-4">
          {chartNarratives.length ? (
            <section className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-2">
              <h2 className="text-sm font-black text-[#2f2415]">Lecture des courbes</h2>
              {chartNarratives.map((line) => <p key={line} className="text-sm text-[#7d6a4a]">{line}</p>)}
            </section>
          ) : null}
          <ModuleGraphiquesTab
            moduleId="cultures"
            periodFiltered={periodFiltered}
            periodScope={props.periodScope}
            periodLabel={props.periodLabel}
            cultures={rows}
            salesOrders={salesOrders}
            payments={payments}
            transactions={transactions}
            stocks={stocks}
            onNavigate={props.onNavigate}
          />
        </div>
      </details>
    </div>
  );

  return (
    <div className="space-y-6 cultures-v1-root">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Production</p>
        <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Cultures</h1>
        <p className="mt-1 text-sm text-[#8a7456]">Parcelles, intrants, récoltes, transformation et rentabilité — centre métier sans double saisie Stock / Commercial / Finance.</p>
        {props.periodLabel ? <div className="mt-2"><PeriodScopeBadge label={props.periodLabel} /></div> : null}
      </section>
      <ModuleTabsBar moduleId="cultures" active={tab} onChange={setTab} activeFarm={props.activeFarm} />
      {content}
    </div>
  );
}
