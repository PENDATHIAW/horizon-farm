import { AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';
import { buildRessourcesGapRows } from '../../utils/ressourcesIntegrity.js';

export default function RessourcesRepairPanel({
  equipment = [],
  tasks = [],
  alertes = [],
  transactions = [],
  documents = [],
  sensors = [],
  cameras = [],
  people = [],
  businessEvents = [],
  onRefresh,
}) {
  const gaps = useMemo(() => buildRessourcesGapRows({
    equipment,
    tasks,
    alertes,
    transactions,
    documents,
    sensors,
    cameras,
    people,
    businessEvents,
  }), [equipment, tasks, alertes, transactions, documents, sensors, cameras, people, businessEvents]);

  if (!gaps.length) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Aucun écart détecté sur maintenance, Smart Farm et paie RH.
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50/80 p-5 space-y-3">
      <p className="flex items-center gap-2 font-black text-amber-900"><AlertTriangle size={18} /> Écarts ressources ({gaps.length})</p>
      <ul className="space-y-2">
        {gaps.slice(0, 12).map((gap) => (
          <li key={gap.issue_key} className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm">
            <b className="text-[#2f2415]">{gap.title}</b>
            <p className="text-[#7d6a4a]">{gap.detail}</p>
          </li>
        ))}
      </ul>
      {onRefresh ? (
        <button type="button" onClick={onRefresh} className="text-xs font-bold text-amber-800 underline">
          Actualiser le contrôle
        </button>
      ) : null}
    </section>
  );
}
