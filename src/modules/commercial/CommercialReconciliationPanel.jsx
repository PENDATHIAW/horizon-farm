import { AlertTriangle } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';

export default function CommercialReconciliationPanel({ rows = [], setTab }) {
  if (!rows.length) return null;

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-amber-900 flex items-center gap-2">
            <AlertTriangle size={14} />
            Éléments à rapprocher
          </p>
          <p className="text-sm text-amber-900/80">Anomalies Commercial ↔ Finance — validation manuelle requise.</p>
        </div>
        <span className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-black text-amber-900">
          {rows.length}
        </span>
      </div>
      <div className="divide-y divide-amber-200/70 rounded-xl border border-amber-200 bg-white">
        {rows.slice(0, 6).map((row) => (
          <div key={row.id} className="flex flex-col gap-1 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-black text-[#2f2415]">{row.description}</p>
              <p className="text-xs text-[#8a7456]">
                {row.detail}
                {row.client ? ` · ${row.client}` : ''}
                {row.orderId ? ` · ${row.orderId}` : ''}
                {row.farmId ? ` · ferme ${row.farmId}` : ''}
              </p>
              <p className="mt-1 text-xs font-bold text-amber-800">{row.recommendedAction}</p>
            </div>
            <div className="shrink-0 text-right">
              {row.amount > 0 ? <p className="font-black text-amber-900">{fmtCurrency(row.amount)}</p> : null}
              {row.orderId && setTab ? (
                <button type="button" onClick={() => setTab('Ventes')} className="mt-1 text-[11px] font-black text-[#9a6b12]">
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
