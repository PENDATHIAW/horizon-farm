import { useEffect, useMemo, useState } from 'react';
import ModuleTabsBar from '../../components/module/ModuleTabsBar.jsx';
import PeriodScopeBadge from '../../components/PeriodScopeBadge.jsx';
import { MODULE_TARGET_TABS } from '../../config/horizonVision.config.js';
import { buildLotAnalyticsPlan } from '../../services/objectifsDecision/lotAnalyticsEngine.js';
import RentabiliteLotCycleTab from './RentabiliteLotCycleTab.jsx';
import EfficaciteTechniqueTab from './EfficaciteTechniqueTab.jsx';
import FluxEquilibresTab from './FluxEquilibresTab.jsx';
import MaraichageDiversificationTab from './MaraichageDiversificationTab.jsx';
import CrossAnalyticsSections from './CrossAnalyticsSections.jsx';
import Btn from '../../components/Btn.jsx';
import { mergePilotageIntoDataMap } from '../../services/pilotageSettingsService.js';
import { exportObjectifsAnalyticsExcel, exportObjectifsAnalyticsCsv } from '../../services/objectifsDecision/objectifsAnalyticsExport.js';
import { buildDecisionCenterPlan } from '../../services/growthDecisionEngine.js';
import ObjectifsActivitesPanel from './ObjectifsActivitesPanel.jsx';
import ObjectiveDecisionSummary from '../ObjectiveDecisionSummary.jsx';
import ObjectiveSupplyPanel from './ObjectiveSupplyPanel.jsx';
import PilotageContextStrip from '../centre/PilotageContextStrip.jsx';
import ObjectifsGraphiquesTab from './ObjectifsGraphiquesTab.jsx';
import DecisionAnnexeTab from '../centre/DecisionAnnexeTab.jsx';
import { buildObjectifsDecisionPlan } from '../../services/objectifsDecision/objectifsDecisionEngine.js';


const EMPTY_ANALYTICS = {
  rentability: { lots: [], suppliers: [] },
  technical: { rows: [], thermalAlerts: [] },
  flux: { occupancy: [], mortalityRows: [], sanitaryAlerts: [] },
  maraichage: { cultures: [], biomass: null },
  cross: {},
};

const TAB_IDS = MODULE_TARGET_TABS.objectifs_croissance;

const TAB_ALIASES = {
  Performance: 'Rentabilité Lot & Cycle',
  Prévisions: 'Efficacité Technique',
  Plans: 'Flux & Équilibres',
  Financeurs: 'Flux & Équilibres',
  'Objectifs & Écarts': 'Rentabilité Lot & Cycle',
  'Croissance économique & Capacités': 'Efficacité Technique',
  'Tableau de bord graphique': 'Graphiques',
  Graphiques: 'Graphiques',
  Annexe: 'Annexe',
};

function resolveTab(initial) {
  const mapped = initial ? (TAB_ALIASES[initial] || initial) : null;
  if (mapped && TAB_IDS.includes(mapped)) return mapped;
  return TAB_IDS[0];
}

export default function ObjectifsDecisionModule({
  dataMap = {},
  onNavigate,
  initialTab,
  periodLabel = '',
  meteo,
  ...props
}) {
  const [tab, setTab] = useState(() => resolveTab(initialTab));

  useEffect(() => {
    setTab(resolveTab(initialTab));
  }, [initialTab]);

  const enrichedDataMap = useMemo(() => mergePilotageIntoDataMap({
    ...dataMap,
    animaux: props.animaux || dataMap.animaux,
    avicole: props.lots || dataMap.avicole || dataMap.lots,
    lots: props.lots || dataMap.avicole,
    production_oeufs_logs: props.productionLogs || dataMap.production_oeufs_logs,
    alimentation_logs: props.alimentationLogs || dataMap.alimentation_logs,
    sante: props.sante || dataMap.sante,
    clients: props.clients || dataMap.clients,
    fournisseurs: props.fournisseurs || dataMap.fournisseurs,
    stock: props.stocks || dataMap.stock,
    stocks: props.stocks || dataMap.stocks,
    sales_orders: props.salesOrdersAll || props.salesOrders || dataMap.sales_orders,
    finances: props.transactionsAll || props.transactions || dataMap.finances,
    meteo: meteo || dataMap.meteo,
    growth_settings: dataMap.growth_settings || {},
  }), [dataMap, props, meteo]);

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
    'Efficacité Technique': (analytics.technical?.thermalAlerts?.length || 0)
      + (analytics.technical?.rows?.filter((r) => r.ponteAlert || r.icAlert || r.gmqAlert).length || 0),
    'Flux & Équilibres': (analytics.flux?.sanitaryAlerts?.length || 0) + (analytics.flux?.feedAlert ? 1 : 0),
  }), [analytics]);

  const content = tab === 'Rentabilité Lot & Cycle'
    ? <RentabiliteLotCycleTab analytics={analytics} onNavigate={onNavigate} />
    : tab === 'Efficacité Technique'
      ? <EfficaciteTechniqueTab analytics={analytics} onNavigate={onNavigate} />
      : tab === 'Flux & Équilibres'
        ? <FluxEquilibresTab analytics={analytics} onNavigate={onNavigate} />
        : tab === 'Graphiques'
          ? <ObjectifsGraphiquesTab plan={objectifsChartPlan} />
          : tab === 'Annexe'
            ? <DecisionAnnexeTab moduleLabel="Objectifs & Croissance" moduleId="objectifs_croissance" dataMap={enrichedDataMap} />
            : <MaraichageDiversificationTab analytics={analytics} />;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Pilotage analytique</p>
            <h1 className="mt-1 text-3xl font-black text-[#2f2415]">Objectifs & Croissance</h1>
            <p className="mt-2 text-sm text-[#8a7456] max-w-3xl">
              Tableaux de croisement production × comptabilité × stock — exportables vers Excel. Les graphiques restent sous votre contrôle (TCD / exports ERP).
            </p>
            {periodLabel ? <div className="mt-2"><PeriodScopeBadge label={periodLabel} /></div> : null}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
            <Btn variant="outline" onClick={() => exportObjectifsAnalyticsExcel(analytics)}>Exporter Excel</Btn>
            <Btn variant="outline" onClick={() => exportObjectifsAnalyticsCsv(analytics, tab === 'Rentabilité Lot & Cycle' ? 'rentabilite' : tab === 'Efficacité Technique' ? 'technique' : tab === 'Flux & Équilibres' ? 'flux' : 'maraichage')}>Exporter CSV (onglet)</Btn>
          </div>
            <button type="button" onClick={() => onNavigate?.('centre_ia', { tab: 'À traiter' })} className="rounded-2xl border border-[#d6c3a0] bg-white px-4 py-3 text-left text-sm hover:bg-[#dcfce7]">
              <span className="text-[#8a7456]">Actions & recommandations → </span><b>Centre décisionnel</b>
            </button>
          </div>
        </div>
      </section>

      <PilotageContextStrip dataMap={enrichedDataMap} onNavigate={onNavigate} />

      <div className="space-y-5">
        <ObjectifsActivitesPanel plan={growthPlan} onNavigate={onNavigate} />
        <ObjectiveDecisionSummary plan={growthPlan} onNavigate={onNavigate} />
        <ObjectiveSupplyPanel dataMap={enrichedDataMap} onNavigate={onNavigate} />
      </div>

      <ModuleTabsBar moduleId="objectifs_croissance" active={tab} onChange={(next) => setTab(resolveTab(next))} tabBadges={tabBadges} />
      {content}
      <CrossAnalyticsSections cross={analytics.cross} />
    </div>
  );
}
