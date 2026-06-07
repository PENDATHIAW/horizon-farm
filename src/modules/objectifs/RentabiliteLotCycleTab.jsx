import { fmtCurrency, fmtNumber } from '../../utils/format';

function Kpi({ label, value, alert = false }) {
  return (
    <div className={`rounded-xl border p-3 ${alert ? 'border-red-300 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
      <p className="text-[10px] text-[#8a7456]">{label}</p>
      <p className={`text-lg font-black ${alert ? 'text-red-700' : 'text-[#2f2415]'}`}>{value}</p>
    </div>
  );
}

export default function RentabiliteLotCycleTab({ analytics = {}, onNavigate }) {
  const lots = analytics.rentability?.lots || [];
  const suppliers = analytics.rentability?.suppliers || [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-lg font-black text-[#2f2415]">Rentabilité par lot et cycle</h3>
          <p className="text-sm text-[#8a7456]">Coût de revient, MCA (marge sur coût alimentaire) et palmarès fournisseurs — tableaux exportables vers Excel.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#8a7456] border-b border-[#eadcc2]">
                <th className="py-2 pr-2">Lot</th>
                <th className="py-2 pr-2">Atelier</th>
                <th className="py-2 pr-2">Coût total</th>
                <th className="py-2 pr-2">Coût aliment</th>
                <th className="py-2 pr-2">CA estimé</th>
                <th className="py-2 pr-2">MCA %</th>
                <th className="py-2">Coût / {`unité`}</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((row) => (
                <tr key={row.lotId} className="border-b border-[#eadcc2]/50">
                  <td className="py-2 pr-2 font-black">{row.lotName}</td>
                  <td className="py-2 pr-2">{row.workshop}</td>
                  <td className="py-2 pr-2">{fmtCurrency(row.totalCost)}</td>
                  <td className="py-2 pr-2">{fmtCurrency(row.feedCost)}</td>
                  <td className="py-2 pr-2">{fmtCurrency(row.revenueEstimate)}</td>
                  <td className={`py-2 pr-2 font-black ${row.mcaPct < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{row.mcaPct}%</td>
                  <td className="py-2">{fmtCurrency(row.unitCost)}/{row.unitLabel}</td>
                </tr>
              ))}
              {!lots.length ? (
                <tr><td colSpan={7} className="py-4 text-[#8a7456]">Créez des lots avec logs alimentation et production pour alimenter ce tableau.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-3">
        <h4 className="font-black text-[#2f2415]">Palmarès fournisseurs (aliments / sujets)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {suppliers.slice(0, 6).map((s) => (
            <Kpi key={s.supplier} label={s.supplier} value={`MCA moy. ${s.avgMca}% · ${s.lots} lot(s)`} />
          ))}
          {!suppliers.length ? <p className="text-sm text-[#8a7456]">Renseignez le fournisseur sur les lots pour comparer.</p> : null}
        </div>
        <button type="button" onClick={() => onNavigate?.('achats_stock', { tab: 'Fournisseurs' })} className="text-xs font-black text-[#9a6b12]">Voir fournisseurs →</button>
      </section>
    </div>
  );
}
