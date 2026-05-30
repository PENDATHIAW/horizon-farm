import { useEffect, useMemo, useState } from 'react';
import { buildRecommendationsFromData, loadSupabaseRecommendations, syncRecommendationsToSupabase } from '../services/aiRecommendationsService';
import VisionForecastsTab from './vision/VisionForecastsTab';
import VisionFundingTab from './vision/VisionFundingTab';
import VisionOpportunitiesTab from './vision/VisionOpportunitiesTab';
import VisionPerformanceTab from './vision/VisionPerformanceTab';
import VisionPlansTab from './vision/VisionPlansTab';
import VisionPrioritiesTab from './vision/VisionPrioritiesTab';
import VisionRisksTab from './vision/VisionRisksTab';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import { buildVisionData } from './vision/visionUtils';

export default function VisionCroissanceModule(props) {
  const { dataMap = {}, onNavigate, onCreateTask, onCreateAlert, onCreateBusinessPlan, onCreateBusinessEvent, onRefreshTasks, onRefreshAlertes } = props;
  const [tab, setTab] = useState('À traiter');
  const [persistedCount, setPersistedCount] = useState(null);
  const data = useMemo(() => buildVisionData(props), [props, dataMap]);
  const aiCount = useMemo(() => buildRecommendationsFromData(dataMap).length, [dataMap]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await syncRecommendationsToSupabase(dataMap);
      const loaded = await loadSupabaseRecommendations();
      if (!cancelled) setPersistedCount(loaded.ok ? loaded.rows.length : null);
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [dataMap]);

  const content = tab === 'À traiter'
    ? <VisionPrioritiesTab data={data} setTab={setTab} onNavigate={onNavigate} onCreateTask={onCreateTask} onCreateAlert={onCreateAlert} onCreateBusinessEvent={onCreateBusinessEvent} onRefreshTasks={onRefreshTasks} onRefreshAlertes={onRefreshAlertes} />
    : tab === 'Performance' ? <VisionPerformanceTab data={data} />
      : tab === 'Risques' ? <VisionRisksTab data={data} onNavigate={onNavigate} />
        : tab === 'Opportunités' ? <VisionOpportunitiesTab data={data} />
          : tab === 'Prévisions' ? <VisionForecastsTab data={data} />
            : tab === 'Plans' ? <VisionPlansTab data={data} onCreateBusinessPlan={onCreateBusinessPlan} onNavigate={onNavigate} />
              : tab === 'Financeurs' ? <VisionFundingTab data={data} onNavigate={onNavigate} />
                : <ModuleGraphiquesTab moduleId="objectifs_croissance" {...dataMap} onNavigate={onNavigate} />;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Pilotage</p>
            <h1 className="mt-1 text-3xl font-black text-[#2f2415]">Vision & Croissance</h1>
            <p className="mt-2 text-sm text-[#8a7456] max-w-3xl">Vue dirigeante : priorités, performance, risques, opportunités, prévisions et dossiers financeurs.</p>
          </div>
          {aiCount > 0 ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><b>{aiCount}</b> recommandation(s) IA détectée(s) — validation requise avant action.{persistedCount !== null ? <span className="block mt-1 text-xs text-amber-700">{persistedCount} enregistrée(s) dans Supabase.</span> : null}</div> : persistedCount !== null && persistedCount > 0 ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><b>{persistedCount}</b> recommandation(s) IA synchronisée(s) avec Supabase.</div> : null}
        </div>
      </section>
      <ModuleTabsBar moduleId="objectifs_croissance" active={tab} onChange={setTab} />
      {content}
    </div>
  );
}
