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
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <CheckCircle2 size={14} className="inline" /> Aucun écart activité détecté.
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-700">
          <AlertTriangle size={15} /> Écarts activité
        </p>
        <h3 className="mt-1 text-lg font-black text-[#2f2415]">Réparations prioritaires</h3>
      </div>
      <div className="space-y-2">
        {gaps.slice(0, 10).map((gap) => (
          <div key={gap.issue_key} className="flex flex-col gap-2 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <b className="text-sm text-[#2f2415]">{gap.title}</b>
              <p className="text-xs text-[#8a7456]">{gap.detail}</p>
            </div>
            <button
              type="button"
              disabled={busyId === gap.record_id}
              onClick={() => onRepair?.(gap)}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 px-2 py-1 text-xs font-black text-emerald-700 disabled:opacity-50"
            >
              <Link2 size={14} /> {busyId === gap.record_id ? '…' : 'Corriger'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
