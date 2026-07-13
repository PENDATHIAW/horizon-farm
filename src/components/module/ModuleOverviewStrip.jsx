import { useMemo } from 'react';
import CarteKPI from '../uniques/CarteKPI.jsx';
import { useKpiOverview } from '../../context/kpiOverviewState.js';
import { runKpiEngine } from '../../services/kpiEngine/index.js';
import { MODULE_OVERVIEW_KPIS } from '../../config/moduleOverviewKpis.js';

export default function ModuleOverviewStrip({ moduleId }) {
  const overview = useKpiOverview();
  const codes = MODULE_OVERVIEW_KPIS[moduleId] || [];
  const kpis = useMemo(() => {
    if (!overview || !codes.length) return null;
    try {
      return runKpiEngine(overview.dataMap, { module: moduleId, periodScope: overview.periodScope });
    } catch {
      return null;
    }
  }, [codes.length, moduleId, overview]);

  if (!overview || !codes.length) return null;

  return (
    <section className="hf-module-overview hf-enter" aria-label="Où en suis-je">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-label font-semibold uppercase text-earth">Où en suis-je</p>
          <p className="text-meta text-slate">Les repères essentiels avant d’agir.</p>
        </div>
        {overview.periodLabel ? <span className="text-meta font-medium text-slate">{overview.periodLabel}</span> : null}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {codes.map((code) => (
          <CarteKPI
            key={code}
            code={code}
            periode={overview.periodLabel}
            donnees={overview.dataMap}
            kpis={kpis}
            periodScope={overview.periodScope}
            onNavigate={overview.onNavigate}
          />
        ))}
      </div>
    </section>
  );
}
