import { AlertTriangle } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';

export default function CommercialReconciliationPanel({ rows = [], setTab }) {
  if (!rows.length) return null;

  return (
    <section className="rounded-2xl border border-vigilance bg-vigilance-bg p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-horizon-dark flex items-center gap-2">
            <AlertTriangle size={14} />
            Éléments à rapprocher
          </p>
          <p className="text-sm text-horizon-dark">Anomalies Commercial ↔ Finance - validation manuelle requise.</p>
        </div>
        <span className="rounded-full border border-vigilance bg-white px-3 py-1 text-xs font-semibold text-horizon-dark">
          {rows.length}
        </span>
      </div>
      <div className="divide-y divide-vigilance rounded-xl border border-vigilance bg-white">
        {rows.slice(0, 6).map((row) => (
          <div key={row.id} className="flex flex-col gap-1 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-earth">{row.description}</p>
              <p className="text-xs text-slate">
                {row.detail}
                {row.client ? ` · ${row.client}` : ''}
                {row.orderId ? ` · ${row.orderId}` : ''}
                {row.farmId ? ` · ferme ${row.farmId}` : ''}
              </p>
              <p className="mt-1 text-xs font-semibold text-horizon-dark">{row.recommendedAction}</p>
            </div>
            <div className="shrink-0 text-right">
              {row.amount > 0 ? <p className="font-semibold text-horizon-dark">{fmtCurrency(row.amount)}</p> : null}
              {row.orderId && setTab ? (
                <button type="button" onClick={() => setTab('Ventes')} className="mt-1 text-meta font-semibold text-horizon-dark">
                  Ouvrir ventes →
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
