import { BarChart3 } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';
import { formatActivityPnlRow } from '../../utils/elevageActivityPnl.js';
import { MARGIN_GROSS_DEFINITION, PRODUCTION_FINANCE_LABELS } from '../../utils/productionFinancialTruth.js';

export default function ElevageActivityPnlPanel({ pnl = {}, onExport }) {
  const activities = pnl.activities || [];
  if (!activities.length) {
    return (
      <section className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-6 text-center text-sm text-[#8a7456]">
        Aucune donnée de rentabilité par activité — enregistrez lots, animaux, alimentation et santé.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-[#9a6b12] flex items-center gap-1"><BarChart3 size={14} /> P&L Élevage par activité</p>
          <p className="text-xs text-[#8a7456] mt-1">Revenus, coûts alimentation, santé, mortalité — {PRODUCTION_FINANCE_LABELS.marginGross} uniquement si fiable. {MARGIN_GROSS_DEFINITION}.</p>
        </div>
        {onExport ? (
          <button type="button" onClick={onExport} className="rounded-xl border border-[#d6c3a0] px-3 py-1.5 text-xs font-black text-[#2f2415]">Exporter rapport</button>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[#8a7456]">
              <th className="py-2 pr-3">Activité</th>
              <th className="py-2 pr-3">Revenus</th>
              <th className="py-2 pr-3">Coûts</th>
              <th className="py-2 pr-3">{PRODUCTION_FINANCE_LABELS.marginGross}</th>
              <th className="py-2">Fiabilité</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((row) => (
              <tr key={row.id} className="border-t border-[#eadcc2]/70">
                <td className="py-2 pr-3 font-black text-[#2f2415]">{row.label}</td>
                <td className="py-2 pr-3 text-[#8a7456]">{row.revenue > 0 ? fmtCurrency(row.revenue) : '—'}</td>
                <td className="py-2 pr-3 text-[#8a7456]">{row.totalCost > 0 ? fmtCurrency(row.totalCost) : '—'}</td>
                <td className="py-2 pr-3 font-bold text-[#2f2415]">{formatActivityPnlRow(row)}</td>
                <td className="py-2">
                  <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${row.reliable ? 'bg-emerald-50 text-emerald-800' : row.partial ? 'bg-amber-50 text-amber-800' : 'bg-slate-50 text-slate-600'}`}>
                    {row.reliabilityLabel}
                  </span>
                  {row.reliabilityMessage ? <p className="mt-1 text-[10px] text-amber-800">{row.reliabilityMessage}</p> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pnl.totals?.grossMargin != null ? (
        <p className="mt-3 text-xs text-[#8a7456]">
          Synthèse : revenus {fmtCurrency(pnl.totals.revenue)} · coûts {fmtCurrency(pnl.totals.totalCost)}
          {pnl.totals.grossMargin != null ? ` · ${PRODUCTION_FINANCE_LABELS.marginGross.toLowerCase()} ${fmtCurrency(pnl.totals.grossMargin)}` : ''}
          {pnl.totals.reliableCount ? ` · ${pnl.totals.reliableCount} activité(s) fiable(s)` : ''}
        </p>
      ) : null}
    </section>
  );
}
