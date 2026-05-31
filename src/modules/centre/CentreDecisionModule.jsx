import { useEffect, useMemo, useState } from 'react';
import ModuleTabsBar from '../../components/module/ModuleTabsBar.jsx';
import PeriodScopeBadge from '../../components/PeriodScopeBadge.jsx';
import HeyHorizonQuickAsk from '../../components/HeyHorizonQuickAsk.jsx';
import { MODULE_TARGET_TABS } from '../../config/horizonVision.config.js';
import { buildDecisionCenterPlan } from '../../services/growthDecisionEngine.js';
import { buildVisionBadges } from '../vision/visionMetrics.js';
import { buildVisionData } from '../vision/visionUtils';
import VisionPrioritiesTab from '../vision/VisionPrioritiesTab.jsx';
import CentreRecommandationsTab from './CentreRecommandationsTab.jsx';
import CentreHistoriqueTab from './CentreHistoriqueTab.jsx';

const TAB_IDS = MODULE_TARGET_TABS.centre_ia;

const TAB_ALIASES = {
  Graphiques: 'Recommandations',
  Cycles: 'Recommandations',
  Opportunités: 'Recommandations',
  'Opportunités & cycles': 'Recommandations',
  Risques: 'À traiter',
};

function resolveTab(initial) {
  const mapped = initial ? (TAB_ALIASES[initial] || initial) : null;
  if (mapped && TAB_IDS.includes(mapped)) return mapped;
  return TAB_IDS[0];
}

/** Centre décisionnel léger : priorités, recommandations, historique — sans graphiques. */
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
    setTab(resolveTab(initialTab));
  }, [initialTab]);

  const visionProps = useMemo(() => ({ ...props, dataMap, moduleId: 'centre_ia' }), [props, dataMap]);
  const data = useMemo(() => buildVisionData(visionProps), [visionProps]);
  const badges = useMemo(() => buildVisionBadges(data, 'centre_ia'), [data]);

  const enrichedDataMap = useMemo(() => ({
    ...dataMap,
    animaux: props.animaux || dataMap.animaux,
    avicole: props.lots || dataMap.avicole,
    sales_orders: props.salesOrdersAll || props.salesOrders || dataMap.sales_orders,
    sales_opportunities: props.opportunities || dataMap.sales_opportunities,
    business_events: props.businessEvents || dataMap.business_events,
  }), [dataMap, props]);

  const decisionPlan = useMemo(() => buildDecisionCenterPlan(enrichedDataMap), [enrichedDataMap]);

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
      ? <CentreRecommandationsTab plan={decisionPlan} dataMap={enrichedDataMap} onNavigate={onNavigate} />
      : <CentreHistoriqueTab dataMap={enrichedDataMap} onNavigate={onNavigate} />;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Intelligence décisionnelle</p>
            <h1 className="mt-1 text-3xl font-black text-[#2f2415]">Centre décisionnel</h1>
            <p className="mt-2 text-sm text-[#8a7456] max-w-3xl">
              3 onglets : traiter les priorités, lire les recommandations investissement/vente, suivre l&apos;historique. Analyses détaillées → Objectifs & Croissance.
            </p>
            <HeyHorizonQuickAsk moduleKey="centre_ia" onNavigate={onNavigate} onOpenAssistant={onOpenAssistant} className="mt-2" />
            {periodLabel ? <div className="mt-2"><PeriodScopeBadge label={periodLabel} /></div> : null}
          </div>
          <div className="flex flex-col gap-2">
            <div className="rounded-2xl border border-[#eadcc2] bg-white px-4 py-3 text-sm">
              <span className="text-[#8a7456]">Priorités </span>
              <b className="text-[#2f2415]">{data.priorities?.length || 0}</b>
            </div>
            <button type="button" onClick={() => onNavigate?.('objectifs_croissance', { tab: 'Rentabilité Lot & Cycle' })} className="rounded-2xl border border-[#d6c3a0] bg-white px-4 py-3 text-left text-sm hover:bg-[#dcfce7]">
              <span className="text-[#8a7456]">Tableaux rentabilité & IC → </span><b>Objectifs & Croissance</b>
            </button>
          </div>
        </div>
      </section>

      <ModuleTabsBar moduleId="centre_ia" active={tab} onChange={setTab} tabBadges={badges.tabs} />
      {content}
    </div>
  );
}
