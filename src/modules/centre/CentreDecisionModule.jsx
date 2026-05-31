import { useEffect, useMemo, useRef, useState } from 'react';
import ModuleTabsBar from '../../components/module/ModuleTabsBar.jsx';
import PeriodScopeBadge from '../../components/PeriodScopeBadge.jsx';
import HeyHorizonQuickAsk from '../../components/HeyHorizonQuickAsk.jsx';
import { MODULE_TARGET_TABS } from '../../config/horizonVision.config.js';
import { buildDecisionCenterPlan } from '../../services/growthDecisionEngine.js';
import { buildStrategicDecisionPlan } from '../../services/strategicDecisionEngine.js';
import { buildVisionBadges } from '../vision/visionMetrics.js';
import { buildVisionData } from '../vision/visionUtils';
import VisionPrioritiesTab from '../vision/VisionPrioritiesTab.jsx';
import VisionCyclesTab from '../vision/VisionCyclesTab.jsx';
import VisionRisksTab from '../vision/VisionRisksTab.jsx';
import CentreRecommandationsTab from './CentreRecommandationsTab.jsx';
import CentreHistoriqueTab from './CentreHistoriqueTab.jsx';
import PilotageSettingsPanel from './PilotageSettingsPanel.jsx';
import { mergePilotageIntoDataMap } from '../../services/pilotageSettingsService.js';
import { syncStrategicAlertsToCenter } from '../../services/strategicAlertBridge.js';

const TAB_IDS = MODULE_TARGET_TABS.centre_ia;

const TAB_ALIASES = {
  Graphiques: 'Recommandations',
  Opportunités: 'Cycles',
  'Opportunités & cycles': 'Cycles',
};

function resolveTab(initial) {
  const mapped = initial ? (TAB_ALIASES[initial] || initial) : null;
  if (mapped && TAB_IDS.includes(mapped)) return mapped;
  return TAB_IDS[0];
}

/** Centre décisionnel : priorités, recommandations, cycles (QUAND lancer), risques (QUAND vendre), historique. */
export default function CentreDecisionModule({
  dataMap = {},
  onNavigate,
  initialTab,
  periodLabel = '',
  onOpenAssistant,
  meteo,
  ...props
}) {
  const [tab, setTab] = useState(() => resolveTab(initialTab));
  const [pilotageVersion, setPilotageVersion] = useState(0);
  const syncedPlanRef = useRef('');

  useEffect(() => {
    setTab(resolveTab(initialTab));
  }, [initialTab]);

  const visionProps = useMemo(() => ({ ...props, dataMap, moduleId: 'centre_ia', meteo }), [props, dataMap, meteo]);
  const data = useMemo(() => buildVisionData(visionProps), [visionProps]);
  const badges = useMemo(() => buildVisionBadges(data, 'centre_ia'), [data]);

  const enrichedDataMap = useMemo(() => mergePilotageIntoDataMap({
    ...dataMap,
    animaux: props.animaux || dataMap.animaux,
    avicole: props.lots || dataMap.avicole,
    lots: props.lots || dataMap.avicole,
    stocks: props.stocks || dataMap.stock || dataMap.stocks,
    stock: props.stocks || dataMap.stock,
    clients: props.clients || dataMap.clients,
    sante: props.sante || dataMap.sante,
    alimentation_logs: props.alimentationLogs || dataMap.alimentation_logs,
    production_oeufs_logs: props.productionLogs || dataMap.production_oeufs_logs,
    sales_orders: props.salesOrdersAll || props.salesOrders || dataMap.sales_orders,
    payments: props.paymentsAll || props.payments || dataMap.payments,
    finances: props.transactionsAll || props.transactions || dataMap.finances,
    sales_opportunities: props.opportunities || dataMap.sales_opportunities,
    business_events: props.businessEvents || dataMap.business_events,
    market_prices: props.marketPrices || dataMap.market_prices,
    market_calendar_events: props.marketCalendarEvents || dataMap.market_calendar_events,
    meteo: meteo || dataMap.meteo,
  }), [dataMap, props, meteo, pilotageVersion]);

  const strategicPlan = useMemo(
    () => buildStrategicDecisionPlan(enrichedDataMap, { meteo: meteo || dataMap.meteo }),
    [enrichedDataMap, meteo, dataMap.meteo],
  );

  const decisionPlan = useMemo(() => {
    const base = buildDecisionCenterPlan(enrichedDataMap);
    const commercialRecommendations = (base.recommendations || [])
      .filter((r) => !r.strategic && !r.technical_rule)
      .slice(0, 5);
    return {
      ...base,
      commercialRecommendations,
      strategic: strategicPlan,
    };
  }, [enrichedDataMap, strategicPlan]);

  useEffect(() => {
    const signature = JSON.stringify({
      sell: strategicPlan.sellNow?.length,
      bfr: strategicPlan.bfr?.blocked,
      sanitary: (strategicPlan.sanitary || []).filter((s) => s.blocking).length,
      stock: strategicPlan.stockAudit?.alerts?.length,
      launch: strategicPlan.launch?.alerts?.length,
    });
    if (!props.onCreateAlert || signature === syncedPlanRef.current) return;
    syncedPlanRef.current = signature;
    syncStrategicAlertsToCenter({
      strategicPlan,
      existingAlerts: props.existingAlerts,
      onCreateAlert: props.onCreateAlert,
      onRefreshAlertes: props.onRefreshAlertes,
    }).catch(() => undefined);
  }, [strategicPlan, props.onCreateAlert, props.onRefreshAlertes, props.existingAlerts]);

  const tabBadges = useMemo(() => ({
    ...badges.tabs,
    Cycles: (strategicPlan.launch?.alerts?.length || 0) + (strategicPlan.launch?.cycleDecisions?.filter((d) => d.priority === 'critique').length || 0),
    Risques: (strategicPlan.sellNow?.length || 0) + (strategicPlan.stockAudit?.alerts?.length || 0) + (strategicPlan.bfr?.blocked ? 1 : 0),
  }), [badges.tabs, strategicPlan]);

  const priorityProps = {
    data,
    moduleId: 'centre_ia',
    setTab,
    onNavigate,
    onCreateTask: props.onCreateTask,
    onCreateAlert: props.onCreateAlert,
    onUpdateAlert: props.onUpdateAlert,
    onCreateBusinessEvent: props.onCreateBusinessEvent,
    onRefreshTasks: props.onRefreshTasks,
    onRefreshAlertes: props.onRefreshAlertes,
    existingTasks: props.existingTasks,
    existingAlerts: props.existingAlerts,
  };

  const risksData = useMemo(() => ({
    ...data,
    risks: [...(data.risks || []), ...(strategicPlan.risks || [])],
  }), [data, strategicPlan.risks]);

  const content = tab === 'À traiter'
    ? <VisionPrioritiesTab {...priorityProps} />
    : tab === 'Recommandations'
      ? <CentreRecommandationsTab plan={decisionPlan} onNavigate={onNavigate} onSwitchTab={setTab} />
      : tab === 'Cycles'
        ? (
          <VisionCyclesTab
            dataMap={enrichedDataMap}
            lots={props.lots}
            animaux={props.animaux}
            productionLogs={props.productionLogs}
            strategicPlan={strategicPlan}
            onNavigate={onNavigate}
            onCreateTask={props.onCreateTask}
            onCreateAlert={props.onCreateAlert}
            onRefreshTasks={props.onRefreshTasks}
            onRefreshAlertes={props.onRefreshAlertes}
          />
        )
        : tab === 'Risques'
          ? (
            <VisionRisksTab
              data={risksData}
              strategicPlan={strategicPlan}
              setTab={setTab}
              onNavigate={onNavigate}
              onCreateTask={props.onCreateTask}
              onRefreshTasks={props.onRefreshTasks}
              onCreateAlert={props.onCreateAlert}
              onRefreshAlertes={props.onRefreshAlertes}
            />
          )
          : <CentreHistoriqueTab dataMap={enrichedDataMap} onNavigate={onNavigate} />;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Intelligence décisionnelle</p>
            <h1 className="mt-1 text-3xl font-black text-[#2f2415]">Centre décisionnel</h1>
            <p className="mt-2 text-sm text-[#8a7456] max-w-3xl">
              5 onglets distincts : priorités du jour · marge & ventes · lancer une bande (Cycles) · vendre (Risques) · historique.
            </p>
            <HeyHorizonQuickAsk moduleKey="centre_ia" onNavigate={onNavigate} onOpenAssistant={onOpenAssistant} className="mt-2" />
            {periodLabel ? <div className="mt-2"><PeriodScopeBadge label={periodLabel} /></div> : null}
          </div>
          <div className="flex flex-col gap-2">
            <div className="rounded-2xl border border-[#eadcc2] bg-white px-4 py-3 text-sm">
              <span className="text-[#8a7456]">Urgences vente </span>
              <b className="text-[#2f2415]">{strategicPlan.sellNow?.length || 0}</b>
            </div>
            <div className="rounded-2xl border border-[#eadcc2] bg-white px-4 py-3 text-sm">
              <span className="text-[#8a7456]">ITH actuel </span>
              <b className="text-[#2f2415]">{strategicPlan.ith ?? '—'}</b>
            </div>
            <button type="button" onClick={() => onNavigate?.('objectifs_croissance', { tab: 'Rentabilité Lot & Cycle' })} className="rounded-2xl border border-[#d6c3a0] bg-white px-4 py-3 text-left text-sm hover:bg-[#dcfce7]">
              <span className="text-[#8a7456]">Croisements analytiques → </span><b>Objectifs & Croissance</b>
            </button>
          </div>
        </div>
      </section>

      <PilotageSettingsPanel clients={props.clients || dataMap.clients} onChange={() => setPilotageVersion((v) => v + 1)} />
      <ModuleTabsBar moduleId="centre_ia" active={tab} onChange={setTab} tabBadges={tabBadges} />
      {content}
    </div>
  );
}
