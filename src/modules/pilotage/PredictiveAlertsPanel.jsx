import { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { buildPredictiveAlerts } from '../../services/predictiveAlerts.js';
import { SEVERITY_CHIP } from './pilotageTone.js';

/**
 * Alertes prédictives : ce qui VA arriver et le délai pour agir (rupture de stock,
 * poids cible, créance J+30, décrochage de ponte). Anticipation, pas constat.
 */
export default function PredictiveAlertsPanel({ data = {}, onCreateTask }) {
  const { alerts, summary } = useMemo(() => {
    try { return buildPredictiveAlerts(data); } catch { return { alerts: [], summary: { total: 0 } }; }
  }, [data]);

  if (!alerts.length) return null;

  return (
    <section className="hf-card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-label font-semibold uppercase text-earth">
          <Clock size={15} aria-hidden="true" /> À anticiper
        </p>
        <span className="text-meta text-slate">{summary.critique || 0} critique · {summary.haute || 0} haute</span>
      </div>
      <ul className="space-y-2">
        {alerts.slice(0, 8).map((a) => (
          <li key={a.id} className="rounded-2xl border border-line bg-card p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-meta font-semibold ${SEVERITY_CHIP[a.severity] || SEVERITY_CHIP.moyenne}`}>{a.severity}</span>
                  {a.horizon_days > 0 ? <span className="text-meta text-slate">dans {a.horizon_days} j</span> : <span className="text-meta text-urgent">maintenant</span>}
                </div>
                <p className="mt-1 font-semibold text-earth">{a.title}</p>
                <p className="text-sm text-slate">{a.message}</p>
              </div>
              {onCreateTask ? (
                <button
                  type="button"
                  onClick={() => onCreateTask({ title: a.action_recommandee, module_lie: a.module_source, related_id: a.entity_id, priority: a.severity === 'critique' ? 'critique' : 'haute', status: 'a_faire', decision_key: a.decision_key })}
                  className="shrink-0 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-earth"
                >
                  Créer la tâche
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
