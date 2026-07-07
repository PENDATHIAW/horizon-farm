import { useCallback, useEffect, useMemo, useState } from 'react';
import ModuleTabsBar from '../../components/module/ModuleTabsBar.jsx';
import PeriodScopeBadge from '../../components/PeriodScopeBadge.jsx';
import { Bot } from 'lucide-react';
import { resolveCentreTab } from '../../utils/commercialNavigation.js';
import { buildDecisionCenterPlan } from '../../services/growthDecisionEngine.js';
import { buildStrategicDecisionPlan } from '../../services/strategicDecisionEngine.js';
import { buildVisionData } from '../vision/visionUtils';
import CentreUrgencesTab from './CentreUrgencesTab.jsx';
import CentreCroissanceTab from './CentreCroissanceTab.jsx';
import CentreSaisonsTab from './CentreSaisonsTab.jsx';
import PilotageSettingsPanel from './PilotageSettingsPanel.jsx';
import { mergePilotageIntoDataMap } from '../../services/pilotageSettingsService.js';
import { syncStrategicAlertsToCenter } from '../../services/strategicAlertBridge.js';
import Btn from '../../components/Btn.jsx';
import toast from 'react-hot-toast';
import { exportCentreDecisionCsv, exportCentreDecisionExcel } from '../../services/centreDecisionExport.js';

const EMPTY_STRATEGIC_PLAN = {
  sellNow: [],
  launch: { alerts: [], cycleDecisions: [] },
  stockAudit: { alerts: [] },
  bfr: {},
  sanitary: [],
  scissors: null,
  transformation: null,
  recommendations: [],
  risks: [],
  ith: null,
};

/** Centre décisionnel — 3 onglets : urgences terrain, croissance, saisons & marchés. */
export default function CentreDecisionModule({
  dataMap = {},
  onNavigate,
  initialTab,
  onTabChange,
  periodLabel = '',
  onOpenAssistant,
  meteo,
  ...props
}) {
  const controlled = Boolean(onTabChange);
  const [internalTab, setInternalTab] = useState(() => resolveCentreTab(initialTab));
  const tab = controlled ? resolveCentreTab(initialTab) : internalTab;
  const setTab = useCallback((next) => {
    const resolved = resolveCentreTab(next);
    if (controlled) onTabChange?.(resolved);
    else setInternalTab(resolved);
  }, [controlled, onTabChange]);
  const [pilotageVersion, setPilotageVersion] = useState(0);

  useEffect(() => {
    if (controlled || !initialTab) return;
    setInternalTab(resolveCentreTab(initialTab));
  }, [controlled, initialTab]);

  const visionProps = useMemo(() => ({ ...props, dataMap, moduleId: 'centre_ia', meteo }), [props, dataMap, meteo]);
  const data = useMemo(() => {
    try {
      return buildVisionData(visionProps);
    } catch (error) {
      console.warn('[CentreDecisionModule] buildVisionData fallback', error);
      return { priorities: [], risks: [], predictions: [], healthScore: 0 };
    }
  }, [visionProps]);
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

  const strategicPlan = useMemo(() => {
    try {
      return buildStrategicDecisionPlan(enrichedDataMap, { meteo: meteo || dataMap.meteo });
    } catch (error) {
      console.warn('[CentreDecisionModule] strategic plan fallback', error);
      return EMPTY_STRATEGIC_PLAN;
    }
  }, [enrichedDataMap, meteo, dataMap.meteo]);

  const decisionPlan = useMemo(() => {
    let base = { recommendations: [], commercialRecommendations: [] };
    try {
      base = buildDecisionCenterPlan(enrichedDataMap);
    } catch (error) {
      console.warn('[CentreDecisionModule] decision plan fallback', error);
    }
    const commercialRecommendations = (base.recommendations || [])
      .filter((r) => r.commercial_only || (!r.strategic && !r.technical_rule && !r.should_recommend_investment))
      .slice(0, 6);
    return {
      ...base,
      commercialRecommendations,
      strategic: strategicPlan,
    };
  }, [enrichedDataMap, strategicPlan]);

  const urgentCount = (strategicPlan.sellNow?.length || 0)
    + (strategicPlan.stockAudit?.alerts?.length || 0)
    + (strategicPlan.bfr?.blocked ? 1 : 0)
    + (data.priorities?.length || 0);

  const tabBadges = useMemo(() => ({
    'Urgences & risques': urgentCount,
    'Croissance & opportunités': (decisionPlan.commercialRecommendations?.length || 0)
      + (decisionPlan.recommendations?.filter((r) => r.should_recommend_investment || r.technical_rule).length || 0),
    'Saisons & marchés': (strategicPlan.launch?.alerts?.length || 0)
      + (strategicPlan.launch?.cycleDecisions?.filter((d) => d.priority === 'critique').length || 0)
      + (strategicPlan.sanitary?.filter((s) => s.blocking).length || 0),
  }), [decisionPlan, strategicPlan, urgentCount]);

  const risksData = useMemo(() => ({
    ...data,
    risks: [...(data.risks || []), ...(strategicPlan.risks || [])],
  }), [data, strategicPlan.risks]);

  const content = tab === 'Urgences & risques'
    ? (
      <CentreUrgencesTab
        data={data}
        risksData={risksData}
        strategicPlan={strategicPlan}
        setTab={setTab}
        onNavigate={onNavigate}
        onCreateTask={props.onCreateTask}
        onCreateAlert={props.onCreateAlert}
        onUpdateAlert={props.onUpdateAlert}
        onCreateBusinessEvent={props.onCreateBusinessEvent}
        onRefreshTasks={props.onRefreshTasks}
        onRefreshAlertes={props.onRefreshAlertes}
        existingTasks={props.existingTasks}
        existingAlerts={props.existingAlerts}
        enrichedDataMap={enrichedDataMap}
      />
    )
    : tab === 'Croissance & opportunités'
      ? (
        <CentreCroissanceTab
          plan={decisionPlan}
          dataMap={enrichedDataMap}
          onNavigate={onNavigate}
          onSwitchTab={setTab}
          lots={props.lots}
          animaux={props.animaux}
          cultures={props.cultures}
          transactions={props.transactionsAll || props.transactions}
          stocks={props.stocks}
          alimentationLogs={props.alimentationLogs}
          productionLogs={props.productionLogs}
          salesOrders={props.salesOrdersAll || props.salesOrders}
          payments={props.paymentsAll || props.payments}
          sante={props.sante}
          businessEvents={props.businessEvents}
          fournisseurs={props.fournisseurs}
          marketPrices={props.marketPrices}
        />
      )
      : (
        <CentreSaisonsTab
          dataMap={enrichedDataMap}
          lots={props.lots}
          animaux={props.animaux}
          productionLogs={props.productionLogs}
          strategicPlan={strategicPlan}
          onNavigate={onNavigate}
          setTab={setTab}
          onCreateTask={props.onCreateTask}
          onCreateAlert={props.onCreateAlert}
          onRefreshTasks={props.onRefreshTasks}
          onRefreshAlertes={props.onRefreshAlertes}
          existingTasks={props.existingTasks}
          existingAlerts={props.existingAlerts}
        />
      );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Intelligence décisionnelle</p>
            <h1 className="mt-1 text-3xl font-black text-[#2f2415]">Centre décisionnel</h1>
            <p className="mt-2 text-sm text-[#8a7456] max-w-2xl">
              Décidez quoi traiter maintenant, quoi développer et quoi anticiper selon les ventes, les risques, la trésorerie, les saisons et les marchés.
            </p>
            {onOpenAssistant ? (
              <button
                type="button"
                onClick={() => onOpenAssistant('Comment va la ferme ?')}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-black text-[#9a6b12] hover:underline"
              >
                <Bot size={14} /> Question à Hey Horizon (vocal ou texte)
              </button>
            ) : null}
            {periodLabel ? <div className="mt-2"><PeriodScopeBadge label={periodLabel} /></div> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2">
              <span className="text-[#8a7456]">Actions critiques </span>
              <b>{urgentCount}</b>
            </span>
            <span className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2">
              <span className="text-[#8a7456]">ITH </span>
              <b>{strategicPlan.ith ?? '—'}</b>
            </span>
            <button type="button" onClick={() => onNavigate?.('objectifs_croissance', { tab: 'Suivi du Business Plan' })} className="rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-xs font-black text-[#9a6b12] hover:bg-[#dcfce7]">
              Objectifs →
            </button>
            <Btn
              variant="outline"
              onClick={() => {
                exportCentreDecisionExcel({ data, decisionPlan, strategicPlan });
                toast.success('Export Excel Centre décisionnel généré');
              }}
            >
              Exporter Excel
            </Btn>
            <Btn
              variant="outline"
              onClick={() => {
                exportCentreDecisionCsv({ data, decisionPlan, strategicPlan }, tab);
                toast.success(`Export CSV — onglet ${tab}`);
              }}
            >
              Exporter CSV
            </Btn>
          </div>
        </div>
      </section>

      <details className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] px-4 py-3">
        <summary className="cursor-pointer text-sm font-black text-[#2f2415]">Paramètres de pilotage (clients, fêtes)</summary>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="flex-1">
            <PilotageSettingsPanel clients={props.clients || dataMap.clients} onChange={() => setPilotageVersion((v) => v + 1)} />
          </div>
          {props.onCreateAlert ? (
            <button
              type="button"
              onClick={() => syncStrategicAlertsToCenter({ strategicPlan, existingAlerts: props.existingAlerts, onCreateAlert: props.onCreateAlert, onRefreshAlertes: props.onRefreshAlertes }).catch(() => undefined)}
              className="shrink-0 rounded-xl border border-[#d6c3a0] bg-white px-4 py-2 text-xs font-black text-[#2f2415] hover:bg-[#dcfce7]"
            >
              Synchroniser alertes critiques
            </button>
          ) : null}
        </div>
      </details>
      <ModuleTabsBar moduleId="centre_ia" active={tab} onChange={setTab} tabBadges={tabBadges} />
      {content}
    </div>
  );
}
