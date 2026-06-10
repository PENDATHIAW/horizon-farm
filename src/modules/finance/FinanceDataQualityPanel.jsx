import { ClipboardCheck } from 'lucide-react';

export default function FinanceDataQualityPanel({ dataQuality = null, onNavigateTab }) {
  if (!dataQuality) return null;

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={20} className="text-[#9a6b12]" />
        <div>
          <h2 className="text-lg font-black text-[#2f2415]">Qualité des données financières</h2>
          <p className="text-sm text-[#8a7456]">{dataQuality.summary}</p>
        </div>
      </div>

      {dataQuality.insufficientData ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          En attente de données — les contrôles qualité s'activent après la première vente, paiement ou dépense.
        </p>
      ) : dataQuality.empty ? (
        <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Vos calculs financiers s'appuient sur des données suffisamment complètes.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {dataQuality.issues.map((issue) => (
            <li key={issue.id}>
              <button
                type="button"
                onClick={() => onNavigateTab?.(issue.tab)}
                className="flex w-full items-start justify-between gap-3 rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-left hover:bg-white"
              >
                <div>
                  <p className="text-sm font-black text-[#2f2415]">{issue.label}</p>
                  <p className="text-xs text-[#8a7456]">{issue.detail}</p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
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
