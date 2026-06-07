import { fmtCurrency, fmtNumber } from '../../utils/format';

export default function FluxEquilibresTab({ analytics = {}, onNavigate }) {
  const flux = analytics.flux || {};

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-lg font-black text-[#2f2415]">Gestion des flux & équilibres</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`rounded-xl border p-3 ${flux.feedAlert ? 'border-red-300 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
            <p className="text-[10px] text-[#8a7456]">Autonomie aliment (jours)</p>
            <p className="text-2xl font-black">{flux.feedAutonomyDays ?? '—'}</p>
            <p className="text-xs text-[#8a7456]">Stock {fmtNumber(flux.feedStockKg)} kg · besoin {fmtNumber(flux.dailyFeedNeedKg)} kg/j</p>
          </div>
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="text-[10px] text-[#8a7456]">Lots en bâtiment</p>
            <p className="text-2xl font-black">{(flux.occupancy || []).length}</p>
          </div>
          <div className={`rounded-xl border p-3 ${(flux.sanitaryAlerts || []).length ? 'border-red-300 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
            <p className="text-[10px] text-[#8a7456]">Alertes vide sanitaire</p>
            <p className="text-2xl font-black">{(flux.sanitaryAlerts || []).length}</p>
          </div>
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="text-[10px] text-[#8a7456]">Lots mortalité &gt; 5%</p>
            <p className="text-2xl font-black">{(flux.mortalityRows || []).filter((r) => r.alert).length}</p>
          </div>
        </div>
      </section>

      {(flux.sanitaryAlerts || []).map((a) => (
        <div key={a.id} className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <b>Bloquant</b> — {a.message}
        </div>
      ))}

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <h4 className="font-black text-[#2f2415] mb-3">Occupation bâtiments & cycles</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[#8a7456] border-b border-[#eadcc2]">
                <th className="py-2 text-left">Lot</th>
                <th className="py-2 text-left">Bâtiment</th>
                <th className="py-2 text-left">Atelier</th>
                <th className="py-2 text-right">Effectif</th>
                <th className="py-2 text-right">J+</th>
              </tr>
            </thead>
            <tbody>
              {(flux.occupancy || []).map((o) => (
                <tr key={o.lotId} className="border-b border-[#eadcc2]/50">
                  <td className="py-2 font-black">{o.lotName}</td>
                  <td className="py-2">{o.building}</td>
                  <td className="py-2">{o.workshop}</td>
                  <td className="py-2 text-right">{fmtNumber(o.headCount)}</td>
                  <td className="py-2 text-right">{o.ageDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <h4 className="font-black text-[#2f2415] mb-3">Bilan matière — mortalité valorisée</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[#8a7456] border-b border-[#eadcc2]">
                <th className="py-2 text-left">Lot</th>
                <th className="py-2 text-right">Mortalité %</th>
                <th className="py-2 text-right">Pertes (têtes)</th>
                <th className="py-2 text-right">Perte sèche FCFA</th>
              </tr>
            </thead>
            <tbody>
              {(flux.mortalityRows || []).map((m) => (
                <tr key={m.lotId} className={m.alert ? 'bg-red-50' : ''}>
                  <td className="py-2 font-black">{m.lotName}</td>
                  <td className="py-2 text-right">{m.mortalityRate}%</td>
                  <td className="py-2 text-right">{m.deadCount}</td>
                  <td className="py-2 text-right">{fmtCurrency(m.lossValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => onNavigate?.('achats_stock', { tab: 'Stock' })} className="mt-3 text-xs font-black text-[#9a6b12]">Gérer stock aliments →</button>
      </section>
    </div>
  );
}
