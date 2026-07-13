import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import JournalEvenements from '../components/shared/JournalEvenements.jsx';
import useCrudModule from '../hooks/useCrudModule';
import useLiveWeather from '../hooks/useLiveWeather';
import { rowsOf } from '../utils/moduleRows';
import { resolveCulturesSectionIntent, resolveCulturesTab } from '../utils/culturesNavigation.js';
import { buildCulturesChartNarratives } from '../utils/culturesChartNarratives.js';
import { buildCropCampaignStartWorkflow } from '../utils/cultureWorkflows.js';
import { commitCultureIrrigation } from '../utils/culturesWorkflow.js';
import { runCultureHarvestSideEffects } from '../utils/cultureSideEffects';
import { buildOrganicTransferWorkflow } from '../utils/manureWorkflows.js';
import { dispatchBpLineCompleted } from '../utils/bpLineConcretization.js';
import { makeId } from '../utils/ids.js';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import CulturesAnnexeTab from './cultures/CulturesAnnexeTab.jsx';
import CulturesCyclesHub from './cultures/CulturesCyclesHub.jsx';
import CulturesEconomieHub from './cultures/CulturesEconomieHub.jsx';
import CulturesIntrantsHub from './cultures/CulturesIntrantsHub.jsx';
import CulturesIrrigationQuickForm from './cultures/CulturesIrrigationQuickForm.jsx';
import CulturesParcellesHub from './cultures/CulturesParcellesHub.jsx';
import CulturesPilotageHub from './cultures/CulturesPilotageHub.jsx';
import CulturesRecoltesHub from './cultures/CulturesRecoltesHub.jsx';
import CulturesSanteHub from './cultures/CulturesSanteHub.jsx';
import CulturesTransformationHub from './cultures/CulturesTransformationHub.jsx';
import ModuleProjectionsStrip from '../components/module/ModuleProjectionsStrip.jsx';
import { buildCulturesModuleProjections } from '../utils/moduleProjections.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value = '') => String(value || '').trim();
const norm = (value = '') => clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const today = () => new Date().toISOString().slice(0, 10);
const hasAnyKey = (payload = {}, keys = []) => keys.some((key) => Object.prototype.hasOwnProperty.call(payload, key));
const isIrrigationPayload = (payload = {}) => hasAnyKey(payload, ['irrigation_event', 'volume_litres', 'volume_l', 'duree_minutes', 'cout_eau', 'cout_irrigation', 'source_eau'])
  || ['irrigation', 'irrigation_event'].includes(norm(payload.type_evenement || payload.event_type));
const isOrganicTransferPayload = (payload = {}) => hasAnyKey(payload, ['organic_transfer', 'stock_organique_id', 'type_matiere', 'sacs', 'poids_total_kg', 'statut_sanitaire'])
  || (clean(payload.stock_id) && hasAnyKey(payload, ['sacs', 'quantite', 'qty', 'poids_total_kg']))
  || ['organic_transfer', 'transfert_organique'].includes(norm(payload.type_evenement || payload.event_type));
const isParcelRow = (row = {}) => ['parcelle', 'plot'].includes(norm(row.record_type || row.type_fiche || row.type));
const DAILY_CULTURE_TABS = Object.freeze({
  daily_irrigation: { tab: 'Irrigation cultures', testId: 'daily-irrigation-panel' },
  daily_harvest: { tab: 'Récoltes cultures', testId: 'daily-harvest-panel' },
});

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
  }, [controlled, props, rememberSection]);

  useEffect(() => {
    if (controlled || !props.initialTab) return;
    queueMicrotask(() => {
      rememberSection(props.initialTab);
      setInternalTab(resolveCulturesTab(props.initialTab));
    });
  }, [controlled, props.initialTab, rememberSection]);

  useEffect(() => {
    if (!props.initialTab) return;
    queueMicrotask(() => rememberSection(props.initialTab));
  }, [props.initialTab, rememberSection]);

  useEffect(() => {
    const handler = (event) => {
      const detail = event.detail || {};
      const moduleKey = String(detail.module || detail.draft?.primary_module || '').toLowerCase();
      const target = DAILY_CULTURE_TABS[detail.draft?.form_type];
      if (moduleKey !== 'cultures' || !target) return;
      setTab(target.tab);
      window.setTimeout(() => document.querySelector(`[data-testid="${target.testId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    };
    window.addEventListener('horizon-open-form', handler);
    return () => window.removeEventListener('horizon-open-form', handler);
  }, [setTab]);

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
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');
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
  const tasks = rowsOf(props.tasks, tasksCrud, false);
  const alertes = rowsOf(props.alertes, alertsCrud, false);
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
    tasks,
    alertes,
    smartReadings: arr(props.smartfarmEvents),
    userId: props.user?.id || props.user?.email || 'system',
    farmId: props.activeFarm?.id || props.farm?.id || '',
    activeFarm: props.activeFarm || props.farm || null,
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
      documentsCrud.refresh?.(),
      movementsCrud.refresh?.(),
      tasksCrud.refresh?.(),
      alertsCrud.refresh?.(),
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
    onCreateDocument: props.onCreateDocument || documentsCrud.create,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onCreateStockMovement: props.onCreateStockMovement || movementsCrud.create,
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
    const campaign = buildCropCampaignStartWorkflow({
      culture: payload,
      cultures: rows,
      parcelles: rows.filter(isParcelRow),
      stocks,
      date: payload.date_debut_campagne || payload.date_semis || today(),
    });
    if (campaign.blocked) {
      if (campaign.alert) await workflowHandlers.onCreateAlert?.(campaign.alert);
      await workflowHandlers.onCreateBusinessEvent?.(campaign.event);
      await refreshWorkflow();
      throw new Error(campaign.blockingReasons.join(', ') || 'Démarrage campagne bloqué');
    }
    await (props.onCreate || culturesCrud.create)?.(campaign.culture);
    for (const task of campaign.tasks || []) await workflowHandlers.onCreateTask?.(task);
    for (const patch of campaign.stockPatches || []) await workflowHandlers.onUpdateStock?.(patch.id, patch);
    for (const movement of campaign.stockMovements || []) await workflowHandlers.onCreateStockMovement?.(movement);
    if (campaign.financeTransaction) await workflowHandlers.onCreateFinanceTransaction?.(campaign.financeTransaction);
    if (campaign.alert) await workflowHandlers.onCreateAlert?.(campaign.alert);
    await workflowHandlers.onCreateBusinessEvent?.(campaign.event);
    if (payload.bp_line_id) {
      dispatchBpLineCompleted({
        bp_line_id: payload.bp_line_id,
        assetModule: 'cultures',
        assetId: campaign.culture.id,
        amount: campaign.reporting?.cout_initial || campaign.financeTransaction?.montant || 0,
        date: campaign.culture.date_debut_campagne,
        source: 'culture_campaign_start',
        issue_key: campaign.event.issue_key,
      });
    }
    await syncHarvest({}, campaign.culture, 'création culture');
  };

  const onUpdate = async (id, payload) => {
    const before = rows.find((row) => String(row.id) === String(id)) || {};
    if (isIrrigationPayload(payload)) {
      await commitCultureIrrigation({
        form: { ...payload, culture_id: id },
        context: workflowContext,
        handlers: workflowHandlers,
      });
      await refreshWorkflow();
      return;
    }

    if (isOrganicTransferPayload(payload)) {
      const stockId = clean(payload.stock_organique_id || payload.stock_id);
      const stock = stocks.find((row) => String(row.id) === String(stockId)) || {};
      const transfer = buildOrganicTransferWorkflow({
        stock,
        culture: before,
        payload: { ...payload, culture_id: id, stock_id: stockId },
        date: payload.date || today(),
      });
      if (transfer.blocked) {
        if (transfer.task) await workflowHandlers.onCreateTask?.(transfer.task);
        if (transfer.alert) await workflowHandlers.onCreateAlert?.(transfer.alert);
        await workflowHandlers.onCreateBusinessEvent?.(transfer.event);
        await refreshWorkflow();
        throw new Error(transfer.alert?.message || 'Transfert organique bloqué');
      }
      if (transfer.stockPatch && stockId) await workflowHandlers.onUpdateStock?.(stockId, transfer.stockPatch);
      if (transfer.culturePatch) await onUpdateCultureOnly(id, { ...payload, ...transfer.culturePatch });
      if (transfer.document) await workflowHandlers.onCreateDocument?.(transfer.document);
      if (transfer.task) await workflowHandlers.onCreateTask?.(transfer.task);
      await workflowHandlers.onCreateBusinessEvent?.(transfer.event);
      await workflowHandlers.onCreateStockMovement?.({
        id: makeId('MVT'),
        stock_id: stockId,
        type: 'sortie',
        movement_type: 'sortie',
        quantite: transfer.transferRow.sacs,
        quantity: transfer.transferRow.sacs,
        unite: 'sac',
        motif: `Transfert organique vers ${before.parcelle || before.nom || id}`,
        module_source: 'cultures',
        entity_type: 'culture',
        entity_id: id,
        date: transfer.transferRow.date,
        issue_key: transfer.event.issue_key,
      });
      await refreshWorkflow();
      return;
    }

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
    onCreateStockMovement: workflowHandlers.onCreateStockMovement,
    onRefreshStockMovements: props.onRefreshStockMovements || movementsCrud.refresh,
    onCreateTask: workflowHandlers.onCreateTask,
    onCreateAlert: workflowHandlers.onCreateAlert,
    onCreateDocument: workflowHandlers.onCreateDocument,
    onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh,
    onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh,
    onRefreshDocuments: props.onRefreshDocuments || documentsCrud.refresh,
    onNavigate: props.onNavigate,
    meteo,
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

  const content = tab === 'Parcelles cultures' ? (
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
    </div>
  ) : tab === 'Campagnes cultures' ? (
    <div ref={cyclesDetailsRef}>
      <CulturesCyclesHub rows={rows} salesOrders={salesOrders} deliveries={deliveriesList} businessEvents={businessEvents} onNavigate={props.onNavigate} />
    </div>
  ) : tab === 'Irrigation cultures' ? (
    <div className="space-y-4" ref={intrantsDetailsRef}>
      <CulturesIrrigationQuickForm rows={rows} context={workflowContext} handlers={workflowHandlers} onSuccess={refreshWorkflow} />
      <CulturesIntrantsHub {...sharedV3Props} />
    </div>
  ) : tab === 'Intrants & fertilisation cultures' ? (
    <div className="space-y-4">
      <div ref={intrantsDetailsRef}><CulturesIntrantsHub {...sharedV3Props} /></div>
      <div ref={santeDetailsRef}><CulturesSanteHub {...sharedV3Props} /></div>
    </div>
  ) : tab === 'Récoltes cultures' ? (
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
      <details ref={transformationDetailsRef} className="rounded-2xl border border-line bg-card p-4">
        <summary className="cursor-pointer font-semibold text-sm text-earth">Transformation cultures</summary>
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
  ) : tab === 'Coûts & marge cultures' ? (
    <div className="space-y-4">
      <CulturesEconomieHub stocks={stocks} salesOrders={salesOrders} rows={rows} businessEvents={businessEvents} dataMap={dataMap} onNavigate={props.onNavigate} />
    </div>
  ) : (
    <div className="space-y-4">
      <JournalEvenements events={businessEvents} farmId={props.activeFarm?.id || props.farm?.id} module="cultures" recordType={props.recordType} recordId={props.recordId} period={props.periodScope} limit={150} onNavigate={props.onNavigate} />
      <details ref={annexeDetailsRef} className="border-t border-line pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-earth">Documents liés</summary>
        <div className="mt-3"><CulturesAnnexeTab documents={documents} onNavigate={props.onNavigate} /></div>
      </details>
      <details ref={graphiquesDetailsRef} className="border-t border-line pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-earth">Courbes historiques</summary>
        <div className="mt-3 space-y-4">
          {chartNarratives.map((line) => <p key={line} className="text-sm text-slate">{line}</p>)}
          <ModuleGraphiquesTab moduleId="cultures" periodFiltered={periodFiltered} periodScope={props.periodScope} periodLabel={props.periodLabel} cultures={rows} salesOrders={salesOrders} payments={payments} transactions={transactions} stocks={stocks} onNavigate={props.onNavigate} />
        </div>
      </details>
    </div>
  );

  return (
    <div className="space-y-6 cultures-v1-root">
      <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
        <p className="text-xs uppercase tracking-normal text-horizon-dark font-semibold">Production</p>
        <h1 className="mt-1 text-2xl font-semibold text-earth">Cultures</h1>
        <p className="mt-1 text-sm text-slate">Parcelles, campagnes, irrigation, intrants, récoltes, coûts et historique.</p>
        {props.periodLabel ? <div className="mt-2"><PeriodScopeBadge label={props.periodLabel} /></div> : null}
      </section>
      <ModuleTabsBar moduleId="cultures" active={tab} onChange={setTab} activeFarm={props.activeFarm} />
      {content}
    </div>
  );
}
