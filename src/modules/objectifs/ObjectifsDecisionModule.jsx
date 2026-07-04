import { useCallback, useEffect, useMemo, useState } from 'react';
import ModuleTabsBar from '../../components/module/ModuleTabsBar.jsx';
import PeriodScopeBadge from '../../components/PeriodScopeBadge.jsx';
import { MODULE_TARGET_TABS } from '../../config/horizonVision.config.js';
import { resolveObjectifsTab } from '../../utils/commercialNavigation.js';
import { buildLotAnalyticsPlan } from '../../services/objectifsDecision/lotAnalyticsEngine.js';
import Btn from '../../components/Btn.jsx';
import { mergePilotageIntoDataMap } from '../../services/pilotageSettingsService.js';
import { exportObjectifsAnalyticsExcel, exportObjectifsAnalyticsCsv } from '../../services/objectifsDecision/objectifsAnalyticsExport.js';
import { buildDecisionCenterPlan } from '../../services/growthDecisionEngine.js';
import ObjectifsBpSuiviTab from './ObjectifsBpSuiviTab.jsx';
import ObjectifsTechniqueTab from './ObjectifsTechniqueTab.jsx';
import ObjectifsSandboxTab from './ObjectifsSandboxTab.jsx';
import ObjectifsFluxTab from './ObjectifsFluxTab.jsx';
import { buildObjectifsDecisionPlan } from '../../services/objectifsDecision/objectifsDecisionEngine.js';

const EMPTY_ANALYTICS = {
  rentability: { lots: [], suppliers: [] },
  technical: { rows: [], thermalAlerts: [] },
  flux: { occupancy: [], mortalityRows: [], sanitaryAlerts: [] },
  maraichage: { cultures: [], biomass: null },
  cross: {},
};

const TAB_IDS = MODULE_TARGET_TABS.objectifs_croissance;

function csvKeyForTab(tab) {
  if (tab === 'Efficacité Technique & Zootechnique') return 'technique';
  if (tab === 'Sécurisation des Flux') return 'flux';
  if (tab === 'Simulateur Sandbox') return 'maraichage';
  return 'rentabilite';
}

export default function ObjectifsDecisionModule({
  dataMap = {},
  onNavigate,
  initialTab,
  onTabChange,
  periodLabel = '',
  meteo,
  onCreateCulture,
  onRefreshCultures,
  ...props
}) {
  const controlled = Boolean(onTabChange);
  const [internalTab, setInternalTab] = useState(() => resolveObjectifsTab(initialTab));
  const tab = controlled ? resolveObjectifsTab(initialTab) : internalTab;
  const setTab = useCallback((value) => {
    const resolved = resolveObjectifsTab(value);
    if (controlled) onTabChange?.(resolved);
    else setInternalTab(resolved);
  }, [controlled, onTabChange]);

  useEffect(() => {
    if (controlled || !initialTab) return;
    setInternalTab(resolveObjectifsTab(initialTab));
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

  const content = tab === 'Suivi du Business Plan'
    ? (
      <ObjectifsBpSuiviTab
        plan={growthPlan}
        dataMap={enrichedDataMap}
        chartPlan={objectifsChartPlan}
        onNavigate={onNavigate}
      />
    )
    : tab === 'Efficacité Technique & Zootechnique'
      ? <ObjectifsTechniqueTab analytics={analytics} onNavigate={onNavigate} />
      : tab === 'Simulateur Sandbox'
        ? (
          <ObjectifsSandboxTab
            analytics={analytics}
            onNavigate={onNavigate}
            onCreateCulture={onCreateCulture}
            onRefreshCultures={onRefreshCultures}
          />
        )
        : <ObjectifsFluxTab dataMap={enrichedDataMap} analytics={analytics} onNavigate={onNavigate} />;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Stratégie long terme</p>
            <h1 className="mt-1 text-3xl font-black text-[#2f2415]">Objectifs & Croissance</h1>
            <p className="mt-2 text-sm text-[#8a7456] max-w-3xl">
              Business Plan, efficacité zootechnique, économie circulaire et sécurisation des flux — 4 vues analytiques sans doublon avec le Centre décisionnel.
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
              onClick={() => onNavigate?.('centre_ia', { tab: 'Croissance & opportunités' })}
              className="rounded-2xl border border-[#d6c3a0] bg-white px-4 py-3 text-left text-sm hover:bg-[#dcfce7]"
            >
              <span className="text-[#8a7456]">Actions du jour → </span><b>Centre décisionnel</b>
            </button>
          </div>
        </div>
      </section>

      <ModuleTabsBar moduleId="objectifs_croissance" active={tab} onChange={setTab} tabBadges={tabBadges} />
      {content}
    </div>
  );
}
