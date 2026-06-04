import { useEffect, useMemo, useState } from 'react';
import { buildRecommendationsFromData, loadSupabaseRecommendations, syncRecommendationsToSupabase } from '../services/aiRecommendationsService';
import VisionCyclesTab from './vision/VisionCyclesTab';
import VisionForecastsTab from './vision/VisionForecastsTab';
import VisionFundingTab from './vision/VisionFundingTab';
import VisionOpportunitiesTab from './vision/VisionOpportunitiesTab';
import VisionPerformanceTab from './vision/VisionPerformanceTab';
import VisionPlansTab from './vision/VisionPlansTab';
import VisionPrioritiesTab from './vision/VisionPrioritiesTab';
import VisionRisksTab from './vision/VisionRisksTab';
import PilotageIntegrityPanel from './vision/PilotageIntegrityPanel.jsx';
import HorizonAdvisorPanel from './HorizonAdvisorPanel.jsx';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import HeyHorizonQuickAsk from '../components/HeyHorizonQuickAsk.jsx';
import ModuleAnnexeTab from '../components/module/ModuleAnnexeTab.jsx';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import { MODULE_TARGET_TABS } from '../config/horizonVision.config.js';
import { buildVisionBadges, resolveVisionTab } from './vision/visionMetrics.js';
import { buildVisionData } from './vision/visionUtils';
import { analyzePilotageIntegrity } from '../utils/pilotageIntegrity.js';

const MODULE_COPY = {
  centre_ia: {
    kicker: 'Intelligence décisionnelle',
    title: 'Centre décisionnel',
    subtitle: 'Priorités du jour, risques, opportunités commerciales et cycles production — actions concrètes.',
  },
  objectifs_croissance: {
    kicker: 'Pilotage stratégique',
    title: 'Objectifs & Croissance',
    subtitle: 'Performance, prévisions, plans d\'activité et dossiers financeurs — vision long terme.',
  },
};

export default function VisionCroissanceModule(props) {
  const {
    moduleId = 'objectifs_croissance',
    dataMap = {},
    onNavigate,
    onCreateTask,
    onCreateAlert,
    onUpdateAlert,
    onCreateBusinessPlan,
    onCreateBusinessEvent,
    onRefreshTasks,
    onRefreshAlertes,
    existingTasks = [],
    existingAlerts = [],
  } = props;
  const copy = MODULE_COPY[moduleId] || MODULE_COPY.objectifs_croissance;
  const [tab, setTab] = useState(() => resolveVisionTab(moduleId, props.initialTab, null));
  const [persistedCount, setPersistedCount] = useState(null);
  const data = useMemo(() => buildVisionData(props), [props, dataMap]);
  const badges = useMemo(() => buildVisionBadges(data, moduleId), [data, moduleId]);
  const pilotageAudit = useMemo(() => analyzePilotageIntegrity({
    visionData: data,
    props,
    tasks: existingTasks,
    alerts: existingAlerts,
    opportunities: props.opportunities || data.openOpportunities,
  }), [data, props, existingTasks, existingAlerts]);
  const aiCount = useMemo(() => data.healthFindings?.length || buildRecommendationsFromData(dataMap).length, [dataMap, data.healthFindings]);

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

  const priorityProps = {
    data,
    moduleId,
    setTab,
    onNavigate,
    onCreateTask,
    onCreateAlert,
    onUpdateAlert,
    onCreateBusinessEvent,
    onRefreshTasks,
    onRefreshAlertes,
    existingTasks,
    existingAlerts,
  };

  const content = tab === 'À traiter'
    ? (
      <div className="space-y-5">
        {moduleId === 'centre_ia' ? (
          <HorizonAdvisorPanel
            dataMap={dataMap}
            moduleId={moduleId}
            limit={10}
            onNavigate={onNavigate}
            onCreateTask={onCreateTask}
            onCreateAlert={onCreateAlert}
            onUpdateAlert={onUpdateAlert}
            onCreateBusinessEvent={onCreateBusinessEvent}
            onRefreshTasks={onRefreshTasks}
            onRefreshAlertes={onRefreshAlertes}
            existingTasks={existingTasks}
            existingAlerts={existingAlerts}
          />
        ) : null}
        <VisionPrioritiesTab {...priorityProps} />
      </div>
    )
    : tab === 'Performance' ? <VisionPerformanceTab data={data} onNavigate={onNavigate} />
      : tab === 'Risques' ? (
        <VisionRisksTab
          data={data}
          setTab={setTab}
          onNavigate={onNavigate}
          onCreateTask={onCreateTask}
          onCreateAlert={onCreateAlert}
          onCreateBusinessEvent={onCreateBusinessEvent}
          onRefreshTasks={onRefreshTasks}
          onRefreshAlertes={onRefreshAlertes}
        />
      )
        : tab === 'Opportunités' ? (
          <VisionOpportunitiesTab
            data={data}
            onNavigate={onNavigate}
            onCreateTask={onCreateTask}
            onCreateBusinessEvent={onCreateBusinessEvent}
            onRefreshTasks={onRefreshTasks}
          />
        )
          : tab === 'Prévisions' ? (
            <VisionForecastsTab
              data={data}
              dataMap={dataMap}
              moduleId={moduleId}
              onNavigate={onNavigate}
              onCreateTask={onCreateTask}
              onCreateBusinessEvent={onCreateBusinessEvent}
              onRefreshTasks={onRefreshTasks}
            />
          )
            : tab === 'Cycles' ? (
              <VisionCyclesTab
                dataMap={dataMap}
                lots={props.lots}
                animaux={props.animaux}
                productionLogs={props.productionLogs || props.production_oeufs_logs}
                onNavigate={onNavigate}
              />
            )
            : tab === 'Plans' ? <VisionPlansTab data={data} onCreateBusinessPlan={onCreateBusinessPlan} onNavigate={onNavigate} />
              : tab === 'Financeurs' ? <VisionFundingTab data={data} onNavigate={onNavigate} />
                : tab === 'Annexe' ? <ModuleAnnexeTab moduleId={moduleId} dataMap={dataMap} onNavigate={onNavigate} />
                : <ModuleGraphiquesTab moduleId={moduleId} periodFiltered={props.periodFiltered} {...props} {...dataMap} onNavigate={onNavigate} />;

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
              <button type="button" onClick={() => onNavigate('objectifs_croissance', { tab: 'Performance' })} className="rounded-2xl border border-[#d6c3a0] bg-white px-4 py-3 text-left text-sm text-[#2f2415] hover:bg-[#dcfce7]">
                <span className="text-[#8a7456]">Pilotage long terme → </span><b>Objectifs & Croissance</b>
              </button>
            ) : null}
            {moduleId === 'objectifs_croissance' && onNavigate ? (
              <button type="button" onClick={() => onNavigate('centre_ia', { tab: 'À traiter' })} className="rounded-2xl border border-[#d6c3a0] bg-white px-4 py-3 text-left text-sm text-[#2f2415] hover:bg-[#dcfce7]">
                <span className="text-[#8a7456]">Actions du jour → </span><b>Centre décisionnel</b>
              </button>
            ) : null}
            {aiCount > 0 ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><b>{aiCount}</b> signal(aux) IA — actions one-click dans À traiter.{persistedCount !== null ? <span className="block mt-1 text-xs text-amber-700">{persistedCount} sync. Supabase.</span> : null}</div> : persistedCount !== null && persistedCount > 0 ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><b>{persistedCount}</b> recommandation(s) synchronisée(s).</div> : null}
          </div>
        </div>
      </section>
      <ModuleTabsBar moduleId={moduleId} active={tab} onChange={setTab} tabBadges={badges.tabs} />
      {pilotageAudit.gapCount ? <PilotageIntegrityPanel audit={pilotageAudit} onNavigate={onNavigate} compact={moduleId === 'objectifs_croissance'} /> : null}
      {content}
    </div>
  );
}
