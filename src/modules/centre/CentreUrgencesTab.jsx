import VisionPrioritiesTab from '../vision/VisionPrioritiesTab.jsx';
import VisionRisksTab from '../vision/VisionRisksTab.jsx';
import { fmtNumber } from '../../utils/format';

function CentreHealthStrip({ data = {}, onNavigate }) {
  const score = Number(data.healthScore ?? data.globalScore ?? 0);
  const hasSignals = (data.priorities?.length || 0) + (data.risks?.length || 0) > 0;
  const incomplete = score === 0 && !hasSignals;

  if (incomplete) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-black">Données incomplètes pour la synthèse financière</p>
        <p className="mt-1 text-xs leading-relaxed">
          Saisissez ventes, stocks et trésorerie pour alimenter les urgences terrain. Les actions ci-dessous restent disponibles dès que des signaux existent.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {onNavigate ? (
            <>
              <button type="button" onClick={() => onNavigate('commercial', { tab: 'Ventes' })} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-black">Commercial → Ventes</button>
              <button type="button" onClick={() => onNavigate('finance_pilotage', { tab: 'Trésorerie' })} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-black">Finance → Trésorerie</button>
              <button type="button" onClick={() => onNavigate('achats_stock', { tab: 'Stock' })} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-black">Achats & Stock</button>
            </>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-2xl border border-[#eadcc2] bg-white px-4 py-3 text-sm">
        <span className="text-[#8a7456]">Santé ERP </span>
        <b className={score >= 75 ? 'text-emerald-700' : score >= 50 ? 'text-amber-700' : 'text-red-700'}>{score}/100</b>
      </div>
      <div className="rounded-2xl border border-[#eadcc2] bg-white px-4 py-3 text-sm">
        <span className="text-[#8a7456]">Priorités </span>
        <b className="text-[#2f2415]">{fmtNumber(data.priorities?.length || 0)}</b>
      </div>
      <div className="rounded-2xl border border-[#eadcc2] bg-white px-4 py-3 text-sm">
        <span className="text-[#8a7456]">Risques ouverts </span>
        <b className="text-[#2f2415]">{fmtNumber(data.risks?.length || 0)}</b>
      </div>
      <div className="rounded-2xl border border-[#eadcc2] bg-white px-4 py-3 text-sm">
        <span className="text-[#8a7456]">Critiques </span>
        <b className="text-red-700">{fmtNumber((data.risks || []).filter((r) => r.tone === 'bad').length)}</b>
      </div>
    </div>
  );
}

/**
 * Urgences & risques terrain — priorités actionnables + ventes urgentes, stock, BFR, risques critiques.
 */
export default function CentreUrgencesTab({
  data,
  risksData,
  strategicPlan,
  setTab,
  onNavigate,
  onCreateTask,
  onCreateAlert,
  onUpdateAlert,
  onCreateBusinessEvent,
  onRefreshTasks,
  onRefreshAlertes,
  existingTasks = [],
  existingAlerts = [],
}) {
  const priorityProps = {
    data,
    moduleId: 'centre_ia',
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

  const riskProps = {
    data: risksData,
    strategicPlan,
    setTab,
    onNavigate,
    onCreateTask,
    onCreateAlert,
    onRefreshTasks,
    onRefreshAlertes,
    existingTasks,
    existingAlerts,
    urgentOnly: true,
  };

  return (
    <div className="space-y-5">
      <CentreHealthStrip data={data} onNavigate={onNavigate} />
      <VisionPrioritiesTab {...priorityProps} />
      <VisionRisksTab {...riskProps} />
    </div>
  );
}
