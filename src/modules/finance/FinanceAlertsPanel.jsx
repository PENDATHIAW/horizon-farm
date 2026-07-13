import { AlertTriangle } from 'lucide-react';

export default function FinanceAlertsPanel({ alerts = [], onNavigateTab, insufficientData = false }) {
  if (!alerts.length) {
    return (
      <section className={`rounded-2xl border p-4 text-sm ${insufficientData ? 'border-vigilance bg-vigilance-bg text-horizon-dark' : 'border-positive bg-positive-bg text-positive'}`}>
        {insufficientData
          ? 'En attente de données — aucune alerte financière tant qu\'aucun flux n\'est enregistré.'
          : 'Aucune alerte financière urgente — situation sous contrôle.'}
      </section>
    );
  }

  const toneFor = (severity) => {
    if (severity === 'bad' || severity === 'warn') return severity === 'bad' ? 'text-urgent' : 'text-horizon-dark';
    return 'text-neutral';
  };

  return (
    <section className="rounded-3xl border border-vigilance bg-vigilance-bg p-6">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} className="text-horizon-dark" />
        <h2 className="text-base font-semibold text-earth">Alertes financières</h2>
      </div>
      <ul className="mt-3 space-y-2">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <button
              type="button"
              onClick={() => onNavigateTab?.(alert.tab)}
              className="flex w-full items-start justify-between gap-3 rounded-xl border border-vigilance bg-white px-3 py-2 text-left hover:bg-vigilance-bg"
            >
              <div>
                <p className={`text-sm font-semibold ${toneFor(alert.severity)}`}>{alert.message}</p>
                <p className="text-xs text-slate">{alert.action}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-horizon-dark">Voir</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
