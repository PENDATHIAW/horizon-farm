import { useMemo, useState } from 'react';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { calculateBiomassValue } from '../../services/objectifsDecision/predictiveAnalysisEngine.js';
import { simulateMaraichageSandbox } from '../../services/objectifsDecision/objectifsDecisionEngine.js';

export default function MaraichageDiversificationTab({ analytics = {} }) {
  const baseBiomass = analytics.maraichage?.biomass || {};
  const poulesCount = analytics.maraichage?.poulesCount || 0;
  const bovinsCount = analytics.maraichage?.bovinsCount || 0;
  const cultures = analytics.maraichage?.cultures || [];
  const [npkPrice, setNpkPrice] = useState(baseBiomass.npk_bag_price || 15000);
  const [sandbox, setSandbox] = useState({ baseCharges: 450000, extraCharges: 0, yieldKg: 500, marketPriceA: 900, marketPriceB: 700, costPerKg: 420 });

  const biomass = useMemo(
    () => calculateBiomassValue(poulesCount, bovinsCount, npkPrice),
    [poulesCount, bovinsCount, npkPrice],
  );
  const simulation = useMemo(() => simulateMaraichageSandbox(sandbox), [sandbox]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-emerald-300 bg-emerald-50 p-5 shadow-sm space-y-3">
        <h3 className="text-lg font-black text-emerald-900">Simulateur Sandbox Maraîchage — valorisation biomasse</h3>
        <p className="text-sm text-emerald-800">Fientes pondeuses + fumier bovin → sacs NPK économisés sur futures cultures (tomates, oignons…).</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl bg-white border border-emerald-200 p-3">
            <p className="text-[10px] text-[#8a7456]">Fientes / mois (t)</p>
            <p className="font-black text-lg">{fmtNumber(biomass.fientes_tonnes)}</p>
          </div>
          <div className="rounded-xl bg-white border border-emerald-200 p-3">
            <p className="text-[10px] text-[#8a7456]">Fumier bovin / mois (t)</p>
            <p className="font-black text-lg">{fmtNumber(biomass.fumier_bovin_tonnes)}</p>
          </div>
          <div className="rounded-xl bg-white border border-emerald-200 p-3">
            <p className="text-[10px] text-[#8a7456]">Sacs NPK économisés</p>
            <p className="font-black text-lg">{fmtNumber(biomass.sacs_npk_economises)}</p>
          </div>
          <div className="rounded-xl bg-white border border-emerald-200 p-3">
            <p className="text-[10px] text-[#8a7456]">Économie mensuelle</p>
            <p className="font-black text-lg text-emerald-700">{fmtCurrency(biomass.economie_totale_fcfa)}</p>
          </div>
        </div>
        <label className="text-xs flex items-center gap-2">
          Prix sac NPK (FCFA)
          <input type="number" className="rounded border px-2 py-1 w-28" value={npkPrice} onChange={(e) => setNpkPrice(Number(e.target.value))} />
        </label>
      </section>

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-3">
        <h4 className="font-black text-[#2f2415]">Simulateur assolement (100 m² par défaut)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[#8a7456] border-b border-[#eadcc2]">
                <th className="py-2 text-left">Culture</th>
                <th className="py-2 text-right">CA prévu</th>
                <th className="py-2 text-right">Coût intrants</th>
                <th className="py-2 text-right">Marge brute</th>
                <th className="py-2 text-right">Marge + fumier</th>
              </tr>
            </thead>
            <tbody>
              {cultures.map((c) => (
                <tr key={c.name} className="border-b border-[#eadcc2]/50">
                  <td className="py-2 font-black">{c.name}</td>
                  <td className="py-2 text-right">{fmtCurrency(c.revenue)}</td>
                  <td className="py-2 text-right">{fmtCurrency(c.cost)}</td>
                  <td className="py-2 text-right">{fmtCurrency(c.marginBrute)}</td>
                  <td className="py-2 text-right font-black text-emerald-700">{fmtCurrency(c.marginWithBiomass)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-3">
        <h4 className="font-black text-[#2f2415]">Sandbox campagne — Marché A vs B</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {['baseCharges', 'extraCharges', 'yieldKg', 'costPerKg', 'marketPriceA', 'marketPriceB'].map((key) => (
            <label key={key} className="space-y-1">
              <span className="text-[#8a7456]">{key}</span>
              <input type="number" className="w-full rounded border px-2 py-1" value={sandbox[key]} onChange={(e) => setSandbox((p) => ({ ...p, [key]: Number(e.target.value) }))} />
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-[#eadcc2] p-3">Marché A — marge <b>{fmtCurrency(simulation.marketA.margin)}</b></div>
          <div className="rounded-xl border border-[#eadcc2] p-3">Marché B — marge <b>{fmtCurrency(simulation.marketB.margin)}</b></div>
        </div>
      </section>
    </div>
  );
}
