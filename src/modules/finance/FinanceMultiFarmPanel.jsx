import { Building2 } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';

export default function FinanceMultiFarmPanel({ multiFarm = null }) {
  if (!multiFarm || multiFarm.singleFarm || !multiFarm.comparison?.length) return null;

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Building2 size={20} className="text-[#9a6b12]" />
        <div>
          <h2 className="text-lg font-black text-[#2f2415]">Comparatif multi-fermes</h2>
          <p className="text-sm text-[#8a7456]">Classement des fermes — trésorerie, créances, dettes et risque.</p>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[#eadcc2] text-left text-xs uppercase tracking-wide text-[#8a7456]">
              <th className="py-2 pr-4">Ferme</th>
              <th className="py-2 pr-4">Trésorerie</th>
              <th className="py-2 pr-4">Créances</th>
              <th className="py-2 pr-4">Dettes</th>
              <th className="py-2 pr-4">Marge</th>
              <th className="py-2 pr-4">Risque</th>
              <th className="py-2">Prochaine action</th>
            </tr>
          </thead>
          <tbody>
            {multiFarm.comparison.map((row) => (
              <tr key={row.farmId} className="border-b border-[#eadcc2]/60">
                <td className="py-3 pr-4 font-black text-[#2f2415]">{row.farmName}</td>
                <td className={`py-3 pr-4 font-bold ${row.treasury >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtCurrency(row.treasury)}</td>
                <td className="py-3 pr-4">{fmtCurrency(row.receivables)}</td>
                <td className="py-3 pr-4">{fmtCurrency(row.payables)}</td>
                <td className={`py-3 pr-4 font-bold ${row.margin >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtCurrency(row.margin)}</td>
                <td className="py-3 pr-4">{row.risk}</td>
                <td className="py-3 text-[#8a7456]">{row.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
