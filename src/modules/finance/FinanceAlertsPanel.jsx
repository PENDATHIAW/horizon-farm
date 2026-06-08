import { AlertTriangle } from 'lucide-react';

export default function FinanceAlertsPanel({ alerts = [], onNavigateTab }) {
  if (!alerts.length) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Aucune alerte financière urgente — situation sous contrôle.
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} className="text-amber-700" />
        <h2 className="text-base font-black text-[#2f2415]">Alertes financières</h2>
      </div>
      <ul className="mt-3 space-y-2">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <button
              type="button"
              onClick={() => onNavigateTab?.(alert.tab)}
              className="flex w-full items-start justify-between gap-3 rounded-xl border border-amber-200 bg-white px-3 py-2 text-left hover:bg-amber-50"
            >
              <div>
                <p className={`text-sm font-black ${alert.severity === 'bad' ? 'text-red-700' : 'text-amber-800'}`}>{alert.message}</p>
                <p className="text-xs text-[#8a7456]">{alert.action}</p>
              </div>
              <span className="shrink-0 text-xs font-black text-[#9a6b12]">Voir</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
