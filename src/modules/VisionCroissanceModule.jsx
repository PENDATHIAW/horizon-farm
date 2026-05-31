import { useEffect, useMemo, useState } from 'react';
import { buildRecommendationsFromData, loadSupabaseRecommendations, syncRecommendationsToSupabase } from '../services/aiRecommendationsService';
import VisionCyclesTab from './vision/VisionCyclesTab';
import VisionDecisionGraphiquesTab from './vision/VisionDecisionGraphiquesTab';
import VisionEfficaciteTab from './vision/VisionEfficaciteTab';
import VisionFluxTab from './vision/VisionFluxTab';
import VisionForecastsTab from './vision/VisionForecastsTab';
import VisionFundingTab from './vision/VisionFundingTab';
import VisionMaraichageTab from './vision/VisionMaraichageTab';
import VisionOpportunitiesTab from './vision/VisionOpportunitiesTab';
import VisionPerformanceTab from './vision/VisionPerformanceTab';
import VisionPlansTab from './vision/VisionPlansTab';
import VisionRentabiliteLotTab from './vision/VisionRentabiliteLotTab';
import VisionReferentielPrixTab from './vision/VisionReferentielPrixTab';
import VisionObjectifsGraphiquesTab from './vision/VisionObjectifsGraphiquesTab';
import VisionCroissanceEconomiqueTab from './vision/VisionCroissanceEconomiqueTab';
import VisionObjectifsEcartsTab from './vision/VisionObjectifsEcartsTab';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import HeyHorizonQuickAsk from '../components/HeyHorizonQuickAsk.jsx';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import { buildVisionBadges, resolveVisionTab } from './vision/visionMetrics.js';
import { buildVisionData } from './vision/visionUtils';

const MODULE_COPY = {
  centre_ia: {
    kicker: 'Intelligence décisionnelle',
    title: 'Centre décisionnel',
    subtitle: 'Détecteur d\'anomalies et d\'opportunités — croisement zootechnie, stocks et finances par lot et cycle.',
  },
  objectifs_croissance: {
    kicker: 'Pilotage stratégique',
    title: 'Objectifs & Croissance',
    subtitle: 'Écarts zootechniques vs souche, point mort dynamique et capacités bâtiments — lecture automatique sans saisie.',
  },
};

const objectifsTabProps = (props) => ({
  lots: props.lots,
  animaux: props.animaux,
  cultures: props.cultures,
  stocks: props.stocks,
  alimentationLogs: props.alimentationLogs,
  productionLogs: props.productionLogs,
  salesOrders: props.salesOrdersAll || props.salesOrders,
  payments: props.paymentsAll || props.payments,
  transactions: props.transactionsAll || props.transactions,
  sante: props.sante,
  marketPrices: props.marketPrices,
  onNavigate: props.onNavigate,
});

const decisionTabProps = (props) => ({
  lots: props.lots,
  animaux: props.animaux,
  cultures: props.cultures,
  clients: props.clients,
  transactions: props.transactionsAll || props.transactions,
  stocks: props.stocks,
  alimentationLogs: props.alimentationLogs,
  productionLogs: props.productionLogs,
  salesOrders: props.salesOrdersAll || props.salesOrders,
  payments: props.paymentsAll || props.payments,
  sante: props.sante,
  businessEvents: props.businessEvents,
  veterinaires: props.veterinaires,
  fournisseurs: props.fournisseurs,
  marketPrices: props.marketPrices,
  onNavigate: props.onNavigate,
});

export default function VisionCroissanceModule(props) {
  const {
    moduleId = 'objectifs_croissance',
    dataMap = {},
    onNavigate,
    onCreateBusinessPlan,
  } = props;
  const copy = MODULE_COPY[moduleId] || MODULE_COPY.objectifs_croissance;
  const [tab, setTab] = useState(() => resolveVisionTab(moduleId, props.initialTab, null));
  const [persistedCount, setPersistedCount] = useState(null);
  const data = useMemo(() => buildVisionData(props), [props, dataMap]);
  const badges = useMemo(() => buildVisionBadges(data, moduleId, props), [data, moduleId, props]);
  const aiCount = useMemo(() => data.healthFindings?.length || buildRecommendationsFromData(dataMap).length, [dataMap, data.healthFindings]);
  const dcProps = decisionTabProps(props);

  useEffect(() => {
    if (!props.initialTab) return;
    const resolved = resolveVisionTab(moduleId, props.initialTab, onNavigate);
    setTab(resolved);
  }, [props.initialTab, moduleId, onNavigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await syncRecommendationsToSupabase(dataMap);
      const loaded = await loadSupabaseRecommendations();
      if (!cancelled) setPersistedCount(loaded.ok ? loaded.rows.length : null);
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [dataMap]);

  const centreContent = tab === 'Rentabilité lots' ? <VisionRentabiliteLotTab {...dcProps} />
    : tab === 'Efficacité' ? <VisionEfficaciteTab {...dcProps} />
      : tab === 'Flux & stocks' ? <VisionFluxTab {...dcProps} />
        : tab === 'Référentiel prix' ? <VisionReferentielPrixTab {...dcProps} />
        : tab === 'Maraîchage' ? <VisionMaraichageTab {...dcProps} />
          : <VisionDecisionGraphiquesTab {...dcProps} />;

  const ocProps = objectifsTabProps(props);
  const objectifsContent = tab === 'Objectifs & Écarts Zootechniques' ? <VisionObjectifsEcartsTab {...ocProps} />
    : tab === 'Croissance Économique & Capacités' ? <VisionCroissanceEconomiqueTab {...ocProps} />
      : <VisionObjectifsGraphiquesTab {...ocProps} />;

  const content = moduleId === 'centre_ia' ? centreContent : objectifsContent;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">{copy.kicker}</p>
            <h1 className="mt-1 text-3xl font-black text-[#2f2415]">{copy.title}</h1>
            <p className="mt-2 text-sm text-[#8a7456] max-w-3xl">{copy.subtitle}</p>
            {moduleId === 'centre_ia' ? (
              <HeyHorizonQuickAsk moduleKey="centre_ia" onNavigate={onNavigate} onOpenAssistant={props.onOpenAssistant} className="mt-2" />
            ) : null}
            {props.periodLabel ? <div className="mt-2"><PeriodScopeBadge label={props.periodLabel} /></div> : null}
          </div>
          <div className="flex flex-col gap-2">
            <div className="rounded-2xl border border-[#eadcc2] bg-white px-4 py-3 text-sm"><span className="text-[#8a7456]">Santé ERP </span><b className="text-[#2f2415]">{data.healthScore ?? data.globalScore}/100</b></div>
            {moduleId === 'centre_ia' && onNavigate ? (
              <button type="button" onClick={() => onNavigate('objectifs_croissance', { tab: 'Objectifs & Écarts Zootechniques' })} className="rounded-2xl border border-[#d6c3a0] bg-white px-4 py-3 text-left text-sm text-[#2f2415] hover:bg-[#dcfce7]">
                <span className="text-[#8a7456]">Pilotage long terme → </span><b>Objectifs & Croissance</b>
              </button>
            ) : null}
            {moduleId === 'objectifs_croissance' && onNavigate ? (
              <button type="button" onClick={() => onNavigate('centre_ia', { tab: 'Rentabilité lots' })} className="rounded-2xl border border-[#d6c3a0] bg-white px-4 py-3 text-left text-sm text-[#2f2415] hover:bg-[#dcfce7]">
                <span className="text-[#8a7456]">Analyse lots & cycles → </span><b>Centre décisionnel</b>
              </button>
            ) : null}
            {aiCount > 0 ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><b>{aiCount}</b> signal(aux) IA terrain.{persistedCount !== null ? <span className="block mt-1 text-xs text-amber-700">{persistedCount} sync. Supabase.</span> : null}</div> : persistedCount !== null && persistedCount > 0 ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><b>{persistedCount}</b> recommandation(s) synchronisée(s).</div> : null}
          </div>
        </div>
      </section>
      <ModuleTabsBar moduleId={moduleId} active={tab} onChange={setTab} tabBadges={badges.tabs} />
      {content}
    </div>
  );
}
