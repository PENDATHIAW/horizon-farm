import { useMemo, useState } from 'react';
import ModuleTabsBar from '../../components/module/ModuleTabsBar.jsx';
import PeriodScopeBadge from '../../components/PeriodScopeBadge.jsx';
import { MODULE_TARGET_TABS } from '../../config/horizonVision.config.js';
import { buildObjectifsDecisionPlan } from '../../services/objectifsDecision/objectifsDecisionEngine.js';
import ObjectifsEcartsTab from './ObjectifsEcartsTab.jsx';
import CroissanceCapacitesTab from './CroissanceCapacitesTab.jsx';
import ObjectifsGraphiquesTab from './ObjectifsGraphiquesTab.jsx';

const TAB_IDS = MODULE_TARGET_TABS.objectifs_croissance;

function resolveTab(initial) {
  if (initial && TAB_IDS.includes(initial)) return initial;
  return TAB_IDS[0];
}

export default function ObjectifsDecisionModule({
  dataMap = {},
  onNavigate,
  initialTab,
  periodLabel = '',
  ...props
}) {
  const [tab, setTab] = useState(() => resolveTab(initialTab));

  const enrichedDataMap = useMemo(() => ({
    ...dataMap,
    animaux: props.animaux || dataMap.animaux,
    avicole: props.lots || dataMap.avicole || dataMap.lots,
    lots: props.lots || dataMap.avicole,
    production_oeufs_logs: props.productionLogs || dataMap.production_oeufs_logs,
    alimentation_logs: props.alimentationLogs || dataMap.alimentation_logs,
    sante: props.sante || dataMap.sante,
    sales_orders: props.salesOrdersAll || props.salesOrders || dataMap.sales_orders,
    salesOrders: props.salesOrdersAll || props.salesOrders || dataMap.sales_orders,
    payments: props.paymentsAll || props.payments || dataMap.payments,
    finances: props.transactionsAll || props.transactions || dataMap.finances,
    transactions: props.transactionsAll || props.transactions || dataMap.finances,
    market_prices: props.marketPrices || dataMap.market_prices,
    price_catalog: dataMap.price_catalog || [],
    growth_settings: dataMap.growth_settings || {},
  }), [dataMap, props]);

  const plan = useMemo(
    () => buildObjectifsDecisionPlan(enrichedDataMap),
    [enrichedDataMap],
  );

  const tabBadges = useMemo(() => ({
    'Objectifs & Écarts': (plan.zootechnical?.filter((z) => z.alertLevel !== 'green').length || 0)
      + (plan.financial?.mispricingAlerts?.length || 0),
    'Croissance économique & Capacités': plan.sanitaryAlerts?.length || 0,
  }), [plan]);

  const content = tab === 'Objectifs & Écarts'
    ? <ObjectifsEcartsTab plan={plan} onNavigate={onNavigate} />
    : tab === 'Croissance économique & Capacités'
      ? <CroissanceCapacitesTab plan={plan} onNavigate={onNavigate} />
      : <ObjectifsGraphiquesTab plan={plan} />;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Pilotage stratégique</p>
            <h1 className="mt-1 text-3xl font-black text-[#2f2415]">Objectifs & Croissance</h1>
            <p className="mt-2 text-sm text-[#8a7456] max-w-3xl">
              Croisement automatique Élevage, Commercial, Finances et prix marché — date pivot souche, écarts zootechniques, marge et tarification dynamique.
            </p>
            {periodLabel ? <div className="mt-2"><PeriodScopeBadge label={periodLabel} /></div> : null}
          </div>
          <div className="flex flex-col gap-2">
            <div className="rounded-2xl border border-[#eadcc2] bg-white px-4 py-3 text-sm">
              <span className="text-[#8a7456]">Ateliers </span>
              <b className="text-[#2f2415]">Pondeuses · Chair · Bovins · Maraîchage</b>
            </div>
            <button type="button" onClick={() => onNavigate?.('centre_ia', { tab: 'À traiter' })} className="rounded-2xl border border-[#d6c3a0] bg-white px-4 py-3 text-left text-sm hover:bg-[#dcfce7]">
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
