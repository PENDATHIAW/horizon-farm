import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ModuleTabsBar from '../../components/module/ModuleTabsBar.jsx';
import PeriodScopeBadge from '../../components/PeriodScopeBadge.jsx';
import { resolveObjectifsTab } from '../../utils/commercialNavigation.js';
import { buildLotAnalyticsPlan } from '../../services/objectifsDecision/lotAnalyticsEngine.js';
import Btn from '../../components/Btn.jsx';
import { mergePilotageIntoDataMap } from '../../services/pilotageSettingsService.js';
import { exportObjectifsAnalyticsExcel, exportObjectifsAnalyticsCsv } from '../../services/objectifsDecision/objectifsAnalyticsExport.js';
import { buildDecisionCenterPlan } from '../../services/growthDecisionEngine.js';
import { buildGrowthObjectiveWorkflow } from '../../utils/objectivesWorkflows.js';
import ObjectifsBpSuiviTab from './ObjectifsBpSuiviTab.jsx';
import ObjectifsScenariosTab from './ObjectifsScenariosTab.jsx';
import ObjectifsHistoryTab from './ObjectifsHistoryTab.jsx';
import { buildObjectifsDecisionPlan } from '../../services/objectifsDecision/objectifsDecisionEngine.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value) => Number(value || 0);

const EMPTY_ANALYTICS = {
  rentability: { lots: [], suppliers: [] },
  technical: { rows: [], thermalAlerts: [] },
  flux: { occupancy: [], mortalityRows: [], sanitaryAlerts: [] },
  maraichage: { cultures: [], biomass: null },
  cross: {},
};

function csvKeyForTab(tab) {
  if (tab === 'Scénarios') return 'maraichage';
  if (tab === 'Historique objectifs') return 'flux';
  return 'rentabilite';
}

export default function ObjectifsDecisionModule({
  dataMap = {},
  onNavigate,
  initialTab,
  onTabChange,
  periodLabel = '',
  meteo,
  ...props
}) {
  const controlled = Boolean(onTabChange);
  const [internalTab, setInternalTab] = useState(() => resolveObjectifsTab(initialTab));
  const tab = controlled ? resolveObjectifsTab(initialTab) : internalTab;
  const setTab = useCallback((value) => {
    const resolved = resolveObjectifsTab(value);
    const raw = String(value || '').trim();
    if (controlled) onTabChange?.(raw || resolved);
    else setInternalTab(resolved);
  }, [controlled, onTabChange]);

  useEffect(() => {
    if (controlled || !initialTab) return;
    queueMicrotask(() => setInternalTab(resolveObjectifsTab(initialTab)));
  }, [controlled, initialTab]);

  const enrichedDataMap = useMemo(() => {
    const lots = props.lots || dataMap.avicole || dataMap.lots;
    const stockRows = props.stocks || dataMap.stock || dataMap.stocks;
    return mergePilotageIntoDataMap({
      ...dataMap,
      animaux: props.animaux || dataMap.animaux,
      avicole: lots,
      lots,
      production_oeufs_logs: props.productionLogs || dataMap.production_oeufs_logs,
      alimentation_logs: props.alimentationLogs || dataMap.alimentation_logs,
      sante: props.sante || dataMap.sante,
      clients: props.clients || dataMap.clients,
      fournisseurs: props.fournisseurs || dataMap.fournisseurs,
      stock: stockRows,
      stocks: stockRows,
      sales_orders: props.salesOrdersAll || props.salesOrders || dataMap.sales_orders,
      finances: props.transactionsAll || props.transactions || dataMap.finances,
      payments: props.paymentsAll || props.payments || dataMap.payments,
      meteo: meteo || dataMap.meteo,
      growth_settings: dataMap.growth_settings || {},
    });
  }, [dataMap, props, meteo]);

  const analytics = useMemo(() => {
    try {
      return buildLotAnalyticsPlan(enrichedDataMap, { currentTemp: meteo?.temperature ?? meteo?.temp });
    } catch (error) {
      console.warn('[ObjectifsDecisionModule] analytics fallback', error);
      return EMPTY_ANALYTICS;
    }
  }, [enrichedDataMap, meteo]);

  const growthPlan = useMemo(() => {
    try {
      return buildDecisionCenterPlan(enrichedDataMap);
    } catch (error) {
      console.warn('[ObjectifsDecisionModule] growth plan fallback', error);
      return { goals: { activities: [] }, recommendations: [] };
    }
  }, [enrichedDataMap]);

  const growthObjectiveContext = useMemo(() => {
    const stocks = arr(enrichedDataMap.stock || enrichedDataMap.stocks);
    const finances = arr(enrichedDataMap.finances || enrichedDataMap.transactions);
    const lots = arr(enrichedDataMap.avicole || enrichedDataMap.lots);
    const animals = arr(enrichedDataMap.animaux);
    const availableStock = stocks.reduce((sum, row) => sum + n(row.quantite ?? row.quantity), 0);
    const availableCash = finances.reduce((sum, row) => {
      const type = String(row.type || row.transaction_type || '').toLowerCase();
      const amount = n(row.montant ?? row.amount);
      return type.includes('sortie') ? sum - amount : sum + amount;
    }, 0);
    const availableCapacity = lots.reduce((sum, row) => sum + n(row.current_count ?? row.effectif_actuel), 0) + animals.length;
    return { availableStock, availableCash, availableCapacity };
  }, [enrichedDataMap]);

  const growthObjectiveWorkflows = useMemo(
    () => arr(growthPlan?.goals?.activities).map((objective) => buildGrowthObjectiveWorkflow(objective, growthObjectiveContext)),
    [growthPlan, growthObjectiveContext],
  );

  const scenarioContext = useMemo(() => {
    const capacities = props.activeFarm?.settings?.capacities || {};
    const equipmentRows = arr(props.equipements || dataMap.equipment);
    const teamRows = arr(props.team || dataMap.farm_rh_directory);
    const feedRows = arr(enrichedDataMap.stock || enrichedDataMap.stocks).filter((row) => /aliment|feed/i.test(`${row.categorie || ''} ${row.nom || row.name || ''}`));
    const feedPriceKg = feedRows.length
      ? feedRows.reduce((sum, row) => sum + n(row.cout_moyen ?? row.prix_unitaire ?? row.unit_price), 0) / feedRows.length
      : n(props.activeFarm?.settings?.feed_price_kg);
    return {
      availableCash: growthObjectiveContext.availableCash,
      feedPriceKg,
      buildingCapacity: n(capacities.buildings || capacities.batiments || growthObjectiveContext.availableCapacity),
      teamCapacity: n(capacities.team || capacities.equipe || teamRows.length * 100),
      equipmentCapacity: n(capacities.equipment || capacities.equipements || equipmentRows.filter((row) => !/panne|indisponible/i.test(row.status || row.statut || '')).length * 100),
      minimumCash: n(props.activeFarm?.settings?.minimum_cash || props.activeFarm?.settings?.seuil_tresorerie),
    };
  }, [dataMap, enrichedDataMap, growthObjectiveContext, props.activeFarm, props.equipements, props.team]);

  const emittedGrowthObjectiveKeys = useRef(new Set());
  const taskRows = props.existingTasks || props.taches;
  const alertRows = props.existingAlerts || props.alertes;
  const businessEventRows = props.existingBusinessEvents || props.businessEvents || enrichedDataMap.business_events;
  const {
    onCreateTask,
    onCreateAlert,
    onCreateBusinessEvent,
    onRefreshTasks,
    onRefreshAlertes,
    onRefreshBusinessEvents,
  } = props;

  useEffect(() => {
    const existingTasks = new Set(arr(taskRows).map((task) => String(task.task_dedupe_key || task.issue_key || '')));
    const existingAlerts = new Set(arr(alertRows).map((alert) => String(alert.alert_dedupe_key || alert.issue_key || '')));
    const existingBusinessEvents = new Set(arr(businessEventRows).map((event) => String(event.issue_key || '')));
    const run = async () => {
      let taskCreated = false;
      let alertCreated = false;
      let eventCreated = false;
      for (const workflow of growthObjectiveWorkflows) {
        const activity = workflow?.simulation?.activity || workflow?.progress?.source_indicator || 'global';
        const key = `growth-objective:${activity}`;
        if (emittedGrowthObjectiveKeys.current.has(key)) continue;
        emittedGrowthObjectiveKeys.current.add(key);
        if (workflow.task && onCreateTask && !existingTasks.has(String(workflow.task.task_dedupe_key || ''))) {
          await onCreateTask(workflow.task);
          taskCreated = true;
        }
        if (workflow.alert && onCreateAlert && !existingAlerts.has(String(workflow.alert.alert_dedupe_key || ''))) {
          await onCreateAlert(workflow.alert);
          alertCreated = true;
        }
        if (workflow.event && onCreateBusinessEvent && !existingBusinessEvents.has(key)) {
          await onCreateBusinessEvent({ ...workflow.event, issue_key: key });
          existingBusinessEvents.add(key);
          eventCreated = true;
        }
      }
      const refreshes = [];
      if (taskCreated && onRefreshTasks) refreshes.push(onRefreshTasks());
      if (alertCreated && onRefreshAlertes) refreshes.push(onRefreshAlertes());
      if (eventCreated && onRefreshBusinessEvents) refreshes.push(onRefreshBusinessEvents());
      if (refreshes.length) await Promise.allSettled(refreshes);
    };
    void run();
  }, [
    alertRows,
    businessEventRows,
    growthObjectiveWorkflows,
    onCreateAlert,
    onCreateBusinessEvent,
    onCreateTask,
    onRefreshAlertes,
    onRefreshBusinessEvents,
    onRefreshTasks,
    taskRows,
  ]);

  const objectifsChartPlan = useMemo(() => {
    try {
      return buildObjectifsDecisionPlan(enrichedDataMap, { currentTemp: meteo?.temperature ?? meteo?.temp });
    } catch (error) {
      console.warn('[ObjectifsDecisionModule] chart plan fallback', error);
      return { chartData: {} };
    }
  }, [enrichedDataMap, meteo]);

  const tabBadges = useMemo(() => ({
    'Efficacité Technique & Zootechnique': (analytics.technical?.thermalAlerts?.length || 0)
      + (analytics.technical?.rows?.filter((r) => r.ponteAlert || r.icAlert || r.gmqAlert).length || 0),
    'Sécurisation des Flux': (analytics.flux?.sanitaryAlerts?.length || 0) + (analytics.flux?.feedAlert ? 1 : 0),
  }), [analytics]);

  const content = tab === 'Objectifs'
    ? (
      <ObjectifsBpSuiviTab
        plan={growthPlan}
        dataMap={enrichedDataMap}
        chartPlan={objectifsChartPlan}
        growthObjectiveWorkflows={growthObjectiveWorkflows}
        onNavigate={onNavigate}
      />
    )
    : tab === 'Scénarios'
      ? (
        <ObjectifsScenariosTab
          scenarioContext={scenarioContext}
          simulations={props.planningSimulations}
          activeFarm={props.activeFarm}
          user={props.user}
          onCreateSimulation={props.onCreatePlanningSimulation}
          onRefreshSimulations={props.onRefreshPlanningSimulations}
        />
      )
      : <ObjectifsHistoryTab simulations={props.planningSimulations} />;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-card p-6 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-normal text-horizon-dark font-semibold">Stratégie long terme</p>
            <h1 className="mt-1 text-3xl font-semibold text-earth">Objectifs & Croissance</h1>
            <p className="mt-2 text-sm text-slate max-w-3xl">
              Objectifs calculés, scénarios versionnés et historique des hypothèses de croissance.
            </p>
            {periodLabel ? <div className="mt-2"><PeriodScopeBadge label={periodLabel} /></div> : null}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Btn variant="outline" onClick={() => exportObjectifsAnalyticsExcel(analytics)}>Exporter Excel</Btn>
              <Btn variant="outline" onClick={() => exportObjectifsAnalyticsCsv(analytics, csvKeyForTab(tab))}>Exporter CSV (onglet)</Btn>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.('centre_decisionnel', { tab: 'Décisions' })}
              className="rounded-2xl border border-line bg-white px-4 py-3 text-left text-sm hover:bg-positive-bg"
            >
              <span className="text-slate">Actions du jour → </span><b>Centre décisionnel</b>
            </button>
          </div>
        </div>
      </section>

      <ModuleTabsBar moduleId="objectifs_croissance" active={tab} onChange={setTab} tabBadges={tabBadges} />
      {content}
    </div>
  );
}
