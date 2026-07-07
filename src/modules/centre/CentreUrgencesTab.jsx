import { useMemo } from 'react';
import VisionPrioritiesTab from '../vision/VisionPrioritiesTab.jsx';
import VisionRisksTab from '../vision/VisionRisksTab.jsx';
import { computeGreenpreneursMetrics } from '../../services/greenpreneurs/greenpreneursMetrics.js';
import { isSimulatedDataModeEnabled } from '../../utils/uiPreferences.js';
import { buildTitleKeys } from './centreContentUtils.js';

/**
 * Urgences & risques — actions du jour + blocages critiques, sans doublon avec priorités.
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
  enrichedDataMap = {},
}) {
  const excludeTitleKeys = useMemo(
    () => buildTitleKeys(data?.priorities || []),
    [data?.priorities],
  );

  const greenpreneursAlerts = useMemo(
    () => computeGreenpreneursMetrics(enrichedDataMap, { simulatedMode: isSimulatedDataModeEnabled() }).centreAlerts,
    [enrichedDataMap],
  );

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
    compact: true,
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
    compact: true,
    excludeTitleKeys,
  };

  return (
    <div className="space-y-4">
      {greenpreneursAlerts.length ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-800">DER/FJ & économie circulaire</p>
          {greenpreneursAlerts.map((alert) => (
            <div key={alert.id} className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <b className="text-sm text-[#2f2415]">{alert.title}</b>
                <p className="text-xs text-[#8a7456]">{alert.detail}</p>
              </div>
              {alert.navigate ? (
                <button
                  type="button"
                  onClick={() => onNavigate?.(alert.navigate.module, { tab: alert.navigate.tab })}
                  className="shrink-0 rounded-lg bg-[#2f2415] px-3 py-1.5 text-[10px] font-bold text-white"
                >
                  Ouvrir
                </button>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
      <VisionPrioritiesTab {...priorityProps} />
      <VisionRisksTab {...riskProps} />
    </div>
  );
}
