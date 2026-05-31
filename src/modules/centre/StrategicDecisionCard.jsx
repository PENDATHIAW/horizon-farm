import { fmtCurrency } from '../../utils/format';
import StrategicQuickActions from './StrategicQuickActions.jsx';

const toneClass = {
  critique: 'border-red-400 bg-red-50',
  haute: 'border-amber-300 bg-amber-50',
  moyenne: 'border-sky-200 bg-sky-50',
  orange: 'border-orange-300 bg-orange-50',
};

export function StrategicDecisionCard({ item, onNavigate, onCreateTask, onCreateAlert, onRefreshTasks, onRefreshAlertes, existingTasks = [], existingAlerts = [] }) {
  const priority = item.priority || item.severity || 'moyenne';
  return (
    <article className={`rounded-2xl border p-4 space-y-2 ${toneClass[priority] || toneClass.moyenne}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
        <p className="font-black text-[#2f2415] text-sm leading-tight">{item.title || item.status || item.eventLabel}</p>
        {item.subjectLabel && item.subjectLabel !== (item.title || item.status) ? (
          <p className="text-[11px] font-black text-emerald-800 mt-0.5">{item.subjectLabel}</p>
        ) : null}
      </div>
        <span className="shrink-0 rounded-full border border-current px-2 py-0.5 text-[10px] font-black uppercase">{priority}</span>
      </div>
      <p className="text-xs text-[#7d6a4a] leading-relaxed">{item.message || item.recommendation}</p>
      {(item.gainValeurJour != null || item.pivotDate || item.coutEstimeCycle != null) ? (
        <div className="grid grid-cols-2 gap-2 text-[10px] text-[#8a7456]">
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
