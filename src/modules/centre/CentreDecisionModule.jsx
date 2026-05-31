import { useEffect, useMemo, useState } from 'react';
import ModuleTabsBar from '../../components/module/ModuleTabsBar.jsx';
import PeriodScopeBadge from '../../components/PeriodScopeBadge.jsx';
import HeyHorizonQuickAsk from '../../components/HeyHorizonQuickAsk.jsx';
import { MODULE_TARGET_TABS } from '../../config/horizonVision.config.js';
import { buildDecisionCenterPlan } from '../../services/growthDecisionEngine.js';
import { buildTechnicalFarmingAlerts } from '../../services/technicalFarmingRules.js';
import { buildVisionBadges } from '../vision/visionMetrics.js';
import { buildVisionData } from '../vision/visionUtils';
import VisionPrioritiesTab from '../vision/VisionPrioritiesTab.jsx';
import VisionRisksTab from '../vision/VisionRisksTab.jsx';
import CentreRecommandationsTab from './CentreRecommandationsTab.jsx';
import CentreOpportunitesTab from './CentreOpportunitesTab.jsx';
import CentreHistoriqueTab from './CentreHistoriqueTab.jsx';

const TAB_IDS = MODULE_TARGET_TABS.centre_ia;

const TAB_ALIASES = {
  Graphiques: 'Recommandations',
  Cycles: 'Opportunités & cycles',
  Opportunités: 'Opportunités & cycles',
  Risques: 'Risques',
};

function resolveTab(initial) {
  const mapped = initial ? (TAB_ALIASES[initial] || initial) : null;
  if (mapped && TAB_IDS.includes(mapped)) return mapped;
  return TAB_IDS[0];
}

export default function CentreDecisionModule({
  dataMap = {},
  onNavigate,
  initialTab,
  periodLabel = '',
  onOpenAssistant,
  ...props
}) {
  const [tab, setTab] = useState(() => resolveTab(initialTab));

  useEffect(() => {
    if (!initialTab) return;
    setTab(resolveTab(initialTab));
  }, [initialTab]);

  const visionProps = useMemo(() => ({
    ...props,
    dataMap,
    moduleId: 'centre_ia',
  }), [props, dataMap]);

  const data = useMemo(() => buildVisionData(visionProps), [visionProps]);
  const badges = useMemo(() => buildVisionBadges(data, 'centre_ia'), [data]);

  const decisionPlan = useMemo(() => {
    const enriched = {
      ...dataMap,
      animaux: props.animaux || dataMap.animaux,
      avicole: props.lots || dataMap.avicole || dataMap.lots,
      lots: props.lots || dataMap.avicole,
      stocks: props.stocks || dataMap.stock || dataMap.stocks,
      stock: props.stocks || dataMap.stock,
      clients: props.clients || dataMap.clients,
      fournisseurs: props.fournisseurs || dataMap.fournisseurs,
      sales_orders: props.salesOrdersAll || props.salesOrders || dataMap.sales_orders,
      sales_opportunities: props.opportunities || dataMap.sales_opportunities,
      business_events: props.businessEvents || dataMap.business_events,
      production_oeufs_logs: props.productionLogs || dataMap.production_oeufs_logs,
      alimentation_logs: props.alimentationLogs || dataMap.alimentation_logs,
      sante: props.sante || dataMap.sante,
      investissements: props.investissements || dataMap.investissements,
      business_plans: props.businessPlans || dataMap.business_plans,
    };
    const technicalAlerts = buildTechnicalFarmingAlerts({
      lots: enriched.avicole,
      animaux: enriched.animaux,
      stocks: enriched.stocks,
      sante: enriched.sante,
      businessEvents: enriched.business_events,
    });
    const plan = buildDecisionCenterPlan(enriched);
    const technicalRecs = technicalAlerts.map((alert) => ({
      id: `technical-${alert.id}`,
      title: alert.title || 'Alerte terrain',
      activity: alert.module_source || 'global',
      priority: alert.severity === 'critique' ? 'haute' : 'moyenne',
      timing: alert.message || '',
      recommendation: alert.action_recommandee || alert.message,
      technical_rule: true,
      source_module: alert.module_source,
      entity_type: alert.entity_type,
      entity_id: alert.entity_id,
    }));
    return {
      ...plan,
      recommendations: [...(plan.recommendations || []), ...technicalRecs],
      enrichedDataMap: enriched,
    };
  }, [dataMap, props]);

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

  const content = tab === 'À traiter'
    ? <VisionPrioritiesTab {...priorityProps} />
    : tab === 'Recommandations'
      ? (
        <CentreRecommandationsTab
          plan={decisionPlan}
          dataMap={decisionPlan.enrichedDataMap}
          onNavigate={onNavigate}
        />
      )
      : tab === 'Opportunités & cycles'
        ? (
          <CentreOpportunitesTab
            data={data}
            dataMap={decisionPlan.enrichedDataMap}
            lots={props.lots}
            animaux={props.animaux}
            productionLogs={props.productionLogs}
            cultures={props.cultures}
            onNavigate={onNavigate}
          />
        )
        : tab === 'Risques'
          ? (
            <VisionRisksTab
              data={data}
              setTab={setTab}
              onNavigate={onNavigate}
              onCreateTask={props.onCreateTask}
              onRefreshTasks={props.onRefreshTasks}
            />
          )
          : <CentreHistoriqueTab dataMap={decisionPlan.enrichedDataMap} onNavigate={onNavigate} />;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Intelligence décisionnelle</p>
            <h1 className="mt-1 text-3xl font-black text-[#2f2415]">Centre décisionnel</h1>
            <p className="mt-2 text-sm text-[#8a7456] max-w-3xl">
              Priorités du jour, recommandations investissement & vente, opportunités réelles et historique — sans graphiques décoratifs.
            </p>
            <HeyHorizonQuickAsk moduleKey="centre_ia" onNavigate={onNavigate} onOpenAssistant={onOpenAssistant} className="mt-2" />
            {periodLabel ? <div className="mt-2"><PeriodScopeBadge label={periodLabel} /></div> : null}
          </div>
          <div className="flex flex-col gap-2">
            <div className="rounded-2xl border border-[#eadcc2] bg-white px-4 py-3 text-sm">
              <span className="text-[#8a7456]">Santé ERP </span>
              <b className="text-[#2f2415]">{data.healthScore ?? data.globalScore}/100</b>
            </div>
            <button type="button" onClick={() => onNavigate?.('objectifs_croissance', { tab: 'Objectifs & Écarts' })} className="rounded-2xl border border-[#d6c3a0] bg-white px-4 py-3 text-left text-sm hover:bg-[#dcfce7]">
              <span className="text-[#8a7456]">Écarts & graphiques G1-G7 → </span><b>Objectifs & Croissance</b>
            </button>
          </div>
        </div>
      </section>

      <ModuleTabsBar moduleId="centre_ia" active={tab} onChange={setTab} tabBadges={badges.tabs} />
      {content}
    </div>
  );
}
