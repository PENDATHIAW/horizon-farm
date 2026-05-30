import { useEffect, useMemo, useState } from 'react';
import { buildRecommendationsFromData, syncRecommendationsToSupabase } from '../services/aiRecommendationsService';
import VisionForecastsTab from './vision/VisionForecastsTab';
import VisionFundingTab from './vision/VisionFundingTab';
import VisionOpportunitiesTab from './vision/VisionOpportunitiesTab';
import VisionPerformanceTab from './vision/VisionPerformanceTab';
import VisionPlansTab from './vision/VisionPlansTab';
import VisionPrioritiesTab from './vision/VisionPrioritiesTab';
import VisionRisksTab from './vision/VisionRisksTab';
import { buildVisionData } from './vision/visionUtils';

function Tabs({ active, onChange }) {
  const tabs = ['À traiter', 'Performance', 'Risques', 'Opportunités', 'Prévisions', 'Plans', 'Financeurs'];
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-2 rounded-2xl border border-[#d6c3a0] bg-white p-2">
        {tabs.map((tab) => (
          <button key={tab} type="button" onClick={() => onChange(tab)} className={`rounded-xl px-4 py-2 text-sm font-black transition ${active === tab ? 'bg-[#22c55e] text-[#052e16]' : 'text-[#8a7456] hover:bg-[#fffdf8] hover:text-[#2f2415]'}`}>{tab}</button>
        ))}
      </div>
    </div>
  );
}

export default function VisionCroissanceModule(props) {
  const { dataMap = {}, onNavigate, onCreateTask, onCreateAlert, onCreateBusinessPlan, onCreateBusinessEvent, onRefreshTasks, onRefreshAlertes } = props;
  const [tab, setTab] = useState('À traiter');
  const data = useMemo(() => buildVisionData(props), [props, dataMap]);
  const aiCount = useMemo(() => buildRecommendationsFromData(dataMap).length, [dataMap]);

  useEffect(() => {
    syncRecommendationsToSupabase(dataMap).catch(() => {});
  }, [dataMap]);

  const content = tab === 'À traiter'
    ? <VisionPrioritiesTab data={data} setTab={setTab} onNavigate={onNavigate} onCreateTask={onCreateTask} onCreateAlert={onCreateAlert} onCreateBusinessEvent={onCreateBusinessEvent} onRefreshTasks={onRefreshTasks} onRefreshAlertes={onRefreshAlertes} />
    : tab === 'Performance' ? <VisionPerformanceTab data={data} />
      : tab === 'Risques' ? <VisionRisksTab data={data} onNavigate={onNavigate} />
        : tab === 'Opportunités' ? <VisionOpportunitiesTab data={data} />
          : tab === 'Prévisions' ? <VisionForecastsTab data={data} />
            : tab === 'Plans' ? <VisionPlansTab data={data} onCreateBusinessPlan={onCreateBusinessPlan} onNavigate={onNavigate} />
              : <VisionFundingTab data={data} onNavigate={onNavigate} />;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Pilotage</p>
            <h1 className="mt-1 text-3xl font-black text-[#2f2415]">Vision & Croissance</h1>
            <p className="mt-2 text-sm text-[#8a7456] max-w-3xl">Vue dirigeante : priorités, performance, risques, opportunités, prévisions et dossiers financeurs.</p>
          </div>
          {aiCount > 0 ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><b>{aiCount}</b> recommandation(s) IA détectée(s) — validation requise avant action.</div> : null}
        </div>
      </section>
      <Tabs active={tab} onChange={setTab} />
      {content}
    </div>
  );
}
