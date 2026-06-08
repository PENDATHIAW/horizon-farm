import { Building2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';

function Highlight({ icon: Icon, label, farmName, value }) {
  if (!farmName) return null;
  return (
    <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm">
      <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-[#8a7456]">
        <Icon size={12} />
        {label}
      </p>
      <p className="mt-1 font-black text-[#2f2415]">{farmName}</p>
      {value != null ? <p className="text-xs text-[#8a7456]">{value}</p> : null}
    </div>
  );
}

export default function FinanceMultiFarmPanel({ multiFarm = null }) {
  if (!multiFarm || multiFarm.singleFarm || !multiFarm.comparison?.length) return null;

  const highlights = multiFarm.advanced?.highlights;

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Building2 size={20} className="text-[#9a6b12]" />
        <div>
          <h2 className="text-lg font-black text-[#2f2415]">Vue multi-fermes</h2>
          <p className="text-sm text-[#8a7456]">Comparaison consolidée — repères et actions prioritaires.</p>
        </div>
      </div>

      {highlights ? (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Highlight icon={TrendingUp} label="Ferme la plus rentable" farmName={highlights.mostProfitable?.farmName} value={fmtCurrency(highlights.mostProfitable?.margin)} />
          <Highlight icon={Wallet} label="Trésorerie la plus faible" farmName={highlights.weakestTreasury?.farmName} value={fmtCurrency(highlights.weakestTreasury?.treasury)} />
          <Highlight icon={TrendingUp} label="Plus de créances" farmName={highlights.mostReceivables?.farmName} value={fmtCurrency(highlights.mostReceivables?.receivables)} />
          <Highlight icon={TrendingDown} label="Plus de dettes" farmName={highlights.mostDebts?.farmName} value={fmtCurrency(highlights.mostDebts?.payables)} />
          <Highlight icon={TrendingDown} label="Plus risquée" farmName={highlights.riskiest?.farmName} value={highlights.riskiest?.riskBadge} />
          <Highlight icon={TrendingUp} label="Plus stable" farmName={highlights.mostStable?.farmName} value={highlights.mostStable?.riskBadge} />
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[#eadcc2] text-left text-xs uppercase tracking-wide text-[#8a7456]">
              <th className="py-2 pr-4">Ferme</th>
              <th className="py-2 pr-4">Trésorerie</th>
              <th className="py-2 pr-4">Créances</th>
              <th className="py-2 pr-4">Dettes</th>
              <th className="py-2 pr-4">Marge</th>
              <th className="py-2 pr-4">Cash 30j</th>
              <th className="py-2 pr-4">Risque</th>
              <th className="py-2">Action prioritaire</th>
            </tr>
          </thead>
          <tbody>
            {multiFarm.comparison.map((row) => (
              <tr key={row.farmId} className="border-b border-[#eadcc2]/60">
                <td className="py-3 pr-4 font-black text-[#2f2415]">{row.farmName}</td>
                <td className={`py-3 pr-4 font-bold ${row.treasury >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {row.dataComplete === false ? 'Données à compléter' : fmtCurrency(row.treasury)}
                </td>
                <td className="py-3 pr-4">{row.dataComplete === false ? '—' : fmtCurrency(row.receivables)}</td>
                <td className="py-3 pr-4">{row.dataComplete === false ? '—' : fmtCurrency(row.payables)}</td>
                <td className={`py-3 pr-4 font-bold ${row.margin >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {row.dataComplete === false ? '—' : fmtCurrency(row.margin)}
                </td>
                <td className="py-3 pr-4">
                  {row.cashFlow30 != null ? fmtCurrency(row.cashFlow30) : '—'}
                </td>
                <td className="py-3 pr-4">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${row.risk === 'Élevé' ? 'bg-red-100 text-red-700' : row.risk === 'Moyen' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {row.risk}
                  </span>
                </td>
                <td className="py-3 text-[#8a7456]">{row.priorityAction || row.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
