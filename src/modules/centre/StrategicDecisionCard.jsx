import { fmtCurrency } from '../../utils/format';
import StrategicQuickActions from './StrategicQuickActions.jsx';

const toneClass = {
  critique: 'border-urgent bg-urgent-bg',
  haute: 'border-vigilance bg-vigilance-bg',
  moyenne: 'border-line bg-neutral-bg',
  orange: 'border-vigilance bg-vigilance-bg',
};

export function StrategicDecisionCard({
  item,
  onNavigate,
  setTab,
  onOpenProductionCalendar,
  onCreateTask,
  onCreateAlert,
  onRefreshTasks,
  onRefreshAlertes,
  existingTasks = [],
  existingAlerts = [],
}) {
  const priority = item.priority || item.severity || 'moyenne';
  return (
    <article className={`rounded-2xl border p-4 space-y-2 ${toneClass[priority] || toneClass.moyenne}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
        <p className="font-semibold text-earth text-sm leading-tight">{item.title || item.status || item.eventLabel}</p>
        {item.subjectLabel && item.subjectLabel !== (item.title || item.status) ? (
          <p className="text-meta font-semibold text-positive mt-1">{item.subjectLabel}</p>
        ) : null}
      </div>
        <span className="shrink-0 rounded-full border border-current px-2 py-1 text-meta font-semibold uppercase">{priority}</span>
      </div>
      <p className="text-xs text-slate leading-relaxed">{item.message || item.recommendation}</p>
      {(item.gainValeurJour != null || item.pivotDate || item.coutEstimeCycle != null) ? (
        <div className="grid grid-cols-2 gap-2 text-meta text-slate">
          {item.gainValeurJour != null ? <span>Gain/j : <b>{fmtCurrency(item.gainValeurJour)}</b></span> : null}
          {item.coutRationJour != null ? <span>Coût ration/j : <b>{fmtCurrency(item.coutRationJour)}</b></span> : null}
          {item.pivotDate ? <span>Date pivot : <b>{item.pivotDate}</b></span> : null}
          {item.eventDate ? <span>Événement : <b>{item.eventDate}</b></span> : null}
          {item.coveragePct != null ? <span>Couverture BFR : <b>{item.coveragePct}%</b></span> : null}
          {item.ith != null ? <span>ITH : <b>{item.ith}</b></span> : null}
        </div>
      ) : null}
      <StrategicQuickActions
        item={item}
        onNavigate={onNavigate}
        setTab={setTab}
        onOpenProductionCalendar={onOpenProductionCalendar}
        onCreateTask={onCreateTask}
        onCreateAlert={onCreateAlert}
        onRefreshTasks={onRefreshTasks}
        onRefreshAlertes={onRefreshAlertes}
        existingTasks={existingTasks}
        existingAlerts={existingAlerts}
      />
    </article>
  );
}

export default StrategicDecisionCard;
