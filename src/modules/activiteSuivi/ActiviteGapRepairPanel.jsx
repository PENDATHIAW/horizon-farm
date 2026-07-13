import { AlertTriangle, CheckCircle2, Link2 } from 'lucide-react';
import { buildActiviteGapRows } from '../../utils/activiteSuiviIntegrity.js';

export default function ActiviteGapRepairPanel({
  alertes = [],
  tasks = [],
  recommendations = [],
  pushHistory = [],
  onRepair,
  busyId,
}) {
  const gaps = buildActiviteGapRows({ alertes, tasks, recommendations, pushHistory });

  if (!gaps.length) {
    return (
      <div className="rounded-2xl border border-positive bg-positive-bg p-4 text-sm text-positive">
        <CheckCircle2 size={14} className="inline" /> Aucun écart activité détecté.
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-vigilance bg-white p-6 shadow-card">
      <div className="mb-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-horizon-dark">
          <AlertTriangle size={15} /> Écarts activité
        </p>
        <h3 className="mt-1 text-lg font-semibold text-earth">Réparations prioritaires</h3>
      </div>
      <div className="space-y-2">
        {gaps.slice(0, 10).map((gap) => (
          <div key={gap.issue_key} className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <b className="text-sm text-earth">{gap.title}</b>
              <p className="text-xs text-slate">{gap.detail}</p>
            </div>
            <button
              type="button"
              disabled={busyId === gap.record_id}
              onClick={() => onRepair?.(gap)}
              className="inline-flex items-center gap-1 rounded-lg border border-positive px-2 py-1 text-xs font-semibold text-positive disabled:opacity-50"
            >
              <Link2 size={14} /> {busyId === gap.record_id ? '…' : 'Corriger'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
