import { useMemo, useState } from 'react';
import {
  buildPhase1FeedBenchmark,
  compareMarketFeedToAgriFeedsFormula,
} from '../../../services/agriFeeds/phase1FeedBenchmarkEngine.js';
import { normalizeAgriFeedsDataMap } from '../../../services/agriFeeds/agriFeedsReadinessEngine.js';
import { fmtCurrency, fmtNumber, fmtPercent } from '../../../utils/format.js';

const RESULT_TONE = {
  favorable: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  equivalent: 'text-sky-900 bg-sky-50 border-sky-200',
  moins_performant: 'text-amber-900 bg-amber-50 border-amber-200',
  donnees_insuffisantes: 'text-[#8a7456] bg-[#fffdf8] border-[#eadcc2]',
};

function fmtMaybe(value, kind = 'number') {
  if (value == null || value === '' || Number.isNaN(Number(value))) return '—';
  if (kind === 'currency') return fmtCurrency(value);
  if (kind === 'percent') return fmtPercent(value);
  return fmtNumber(value);
}

export default function Phase1BenchmarkTab({ dataMap = {} }) {
  const normalized = useMemo(() => normalizeAgriFeedsDataMap(dataMap), [dataMap]);
  const benchmark = useMemo(() => buildPhase1FeedBenchmark(normalized), [normalized]);
  const [selectedLotId, setSelectedLotId] = useState('');
  const [formulaVersionId, setFormulaVersionId] = useState('');

  const formulaVersions = useMemo(
    () => (Array.isArray(normalized.feed_formula_versions) ? normalized.feed_formula_versions : []),
    [normalized.feed_formula_versions],
  );

  const comparison = useMemo(() => {
    if (!selectedLotId && !formulaVersionId) return null;
    return compareMarketFeedToAgriFeedsFormula({
      dataMap: normalized,
      animalLotId: selectedLotId || undefined,
      formulaVersionId: formulaVersionId || undefined,
    });
  }, [normalized, selectedLotId, formulaVersionId]);

  const lotOptions = benchmark.rows.filter((r) => r.animal_lot_id || r.animal_id);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5">
        <p className="text-lg font-black text-[#2f2415]">Référence alimentation Phase 1</p>
        <p className="text-sm text-[#8a7456] mt-1 leading-relaxed max-w-3xl">
          Historique des aliments achetés sur le marché et consommés par les animaux Horizon Farm.
          Cette base servira de comparaison lorsque AGRI FEEDS produira ses propres formules.
        </p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="text-[10px] font-black uppercase text-[#8a7456]">Distributions</p>
            <p className="text-lg font-black">{fmtNumber(benchmark.totals.distributions)}</p>
          </div>
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="text-[10px] font-black uppercase text-[#8a7456]">Quantité consommée</p>
            <p className="text-lg font-black">{fmtNumber(benchmark.totals.quantity_consumed)} kg</p>
          </div>
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="text-[10px] font-black uppercase text-[#8a7456]">Coût alimentaire</p>
            <p className="text-lg font-black">{fmtCurrency(benchmark.totals.feed_cost_total)}</p>
          </div>
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="text-[10px] font-black uppercase text-[#8a7456]">Prix moyen / kg</p>
            <p className="text-lg font-black">
              {benchmark.totals.avg_price_per_kg > 0 ? fmtCurrency(benchmark.totals.avg_price_per_kg) : '—'}
            </p>
          </div>
        </div>
      </section>

      {!benchmark.hasData ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Données insuffisantes pour conclure. Enregistrez des distributions d’aliment (Élevage)
          et des achats d’aliment marché (Achats & Stock) pour construire la référence.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-[#d6c3a0] bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-[#fffdf8] text-[10px] uppercase font-black text-[#8a7456]">
              <tr>
                <th className="px-3 py-2 text-left">Cible</th>
                <th className="px-3 py-2 text-left">Fournisseur</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-right">Prix/kg</th>
                <th className="px-3 py-2 text-right">Qté</th>
                <th className="px-3 py-2 text-right">Coût total</th>
                <th className="px-3 py-2 text-right">Coût/sujet</th>
                <th className="px-3 py-2 text-right">Mortalité</th>
                <th className="px-3 py-2 text-right">Poids</th>
                <th className="px-3 py-2 text-right">Ponte</th>
                <th className="px-3 py-2 text-right">Marge</th>
                <th className="px-3 py-2 text-left">Période</th>
              </tr>
            </thead>
            <tbody>
              {benchmark.rows.map((row) => (
                <tr key={row.id} className="border-t border-[#eadcc2]">
                  <td className="px-3 py-2 font-semibold text-[#2f2415]">
                    {row.label}
                    <span className="block text-[11px] font-normal text-[#8a7456]">{row.speciesLabel}</span>
                  </td>
                  <td className="px-3 py-2">{row.supplier}</td>
                  <td className="px-3 py-2">{row.feed_type}</td>
                  <td className="px-3 py-2 text-right">{fmtMaybe(row.price_per_kg, 'currency')}</td>
                  <td className="px-3 py-2 text-right">{fmtMaybe(row.quantity_consumed)} kg</td>
                  <td className="px-3 py-2 text-right">{fmtMaybe(row.feed_cost_total, 'currency')}</td>
                  <td className="px-3 py-2 text-right">{fmtMaybe(row.cost_feed_per_subject, 'currency')}</td>
                  <td className="px-3 py-2 text-right">
                    {row.mortality_rate != null ? fmtPercent(row.mortality_rate) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">{row.weight_final ? `${fmtNumber(row.weight_final)} kg` : '—'}</td>
                  <td className="px-3 py-2 text-right">
                    {row.laying_rate != null ? fmtPercent(row.laying_rate) : (row.egg_production_total ? fmtNumber(row.egg_production_total) : '—')}
                  </td>
                  <td className="px-3 py-2 text-right">{fmtMaybe(row.margin, 'currency')}</td>
                  <td className="px-3 py-2 text-[#8a7456] whitespace-nowrap">
                    {row.period_start || '—'}{row.period_end ? ` → ${row.period_end}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-3">
        <p className="font-black text-[#2f2415]">Comparer avec une formule AGRI FEEDS</p>
        <p className="text-sm text-[#8a7456]">
          Choisissez un lot de référence et, si disponible, une version de formule.
          Sans test interne clôturé, la comparaison reste partielle.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-bold text-[#8a7456]">Lot / animal comparable</span>
            <select
              value={selectedLotId}
              onChange={(e) => setSelectedLotId(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm"
            >
              <option value="">Sélectionner…</option>
              {lotOptions.map((row) => (
                <option key={row.id} value={row.animal_lot_id || row.animal_id}>
                  {row.label} — {row.speciesLabel}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold text-[#8a7456]">Version de formule</span>
            <select
              value={formulaVersionId}
              onChange={(e) => setFormulaVersionId(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm"
            >
              <option value="">
                {formulaVersions.length ? 'Sélectionner…' : 'Aucune formule (étape production à venir)'}
              </option>
              {formulaVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.version_code || v.id}
                </option>
              ))}
            </select>
          </label>
        </div>

        {comparison ? (
          <div className={`rounded-2xl border p-4 ${RESULT_TONE[comparison.status] || RESULT_TONE.donnees_insuffisantes}`}>
            <p className="font-black text-sm">Résultat observé</p>
            <p className="text-sm mt-1">{comparison.message}</p>
            {comparison.comparison?.length ? (
              <div className="mt-3 space-y-1">
                {comparison.comparison.map((row) => (
                  <p key={row.key} className="text-xs">
                    <b>{row.label}</b> — marché : {fmtMaybe(row.market, row.key.includes('cost') || row.key.includes('price') || row.key === 'margin' ? 'currency' : 'number')}
                    {' · '}AGRI FEEDS : {fmtMaybe(row.agri, row.key.includes('cost') || row.key.includes('price') || row.key === 'margin' ? 'currency' : 'number')}
                    {' · '}{row.resultLabel}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
