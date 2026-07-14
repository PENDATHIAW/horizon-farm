import { ClipboardCheck } from 'lucide-react';

export default function FinanceDataQualityPanel({ dataQuality = null, onNavigateTab }) {
  if (!dataQuality) return null;

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={20} className="text-horizon-dark" />
        <div>
          <h2 className="text-lg font-semibold text-earth">Qualité des données financières</h2>
          <p className="text-sm text-slate">{dataQuality.summary}</p>
        </div>
      </div>

      {dataQuality.insufficientData ? (
        <p className="mt-4 rounded-2xl border border-vigilance bg-vigilance-bg px-4 py-3 text-sm text-horizon-dark">
          En attente de données - les contrôles qualité s'activent après la première vente, paiement ou dépense.
        </p>
      ) : dataQuality.empty ? (
        <p className="mt-4 rounded-2xl border border-positive bg-positive-bg px-4 py-3 text-sm text-positive">
          Vos calculs financiers s'appuient sur des données suffisamment complètes.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {dataQuality.issues.map((issue) => (
            <li key={issue.id}>
              <button
                type="button"
                onClick={() => onNavigateTab?.(issue.tab)}
                className="flex w-full items-start justify-between gap-3 rounded-xl border border-line bg-card px-3 py-2 text-left hover:bg-white"
              >
                <div>
                  <p className="text-sm font-semibold text-earth">{issue.label}</p>
                  <p className="text-xs text-slate">{issue.detail}</p>
                </div>
                <span className="shrink-0 rounded-full bg-vigilance-bg px-2 py-1 text-meta font-semibold text-horizon-dark">
                  {issue.count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
