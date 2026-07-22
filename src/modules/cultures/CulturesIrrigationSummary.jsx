import { Droplets } from 'lucide-react';
import { useMemo } from 'react';
import { fmtCurrency, fmtNumber } from '../../utils/format.js';
import { buildIrrigationSummary } from '../../utils/culturesIrrigationSummary.js';
import { getRealCultureRows } from '../CulturesTabActionsBridge.jsx';

/**
 * Suivi d'irrigation - eau consommée, coût et dernières irrigations par culture.
 * Donne à l'onglet Irrigation son identité propre, sans redupliquer le hub
 * « Intrants & météo » (onglet Intrants & fertilisation).
 */
export default function CulturesIrrigationSummary({ rows = [] }) {
  const cultures = useMemo(() => getRealCultureRows(rows), [rows]);
  const summary = useMemo(() => buildIrrigationSummary(cultures), [cultures]);

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-earth">
          <Droplets size={18} aria-hidden="true" />
          Suivi de l’irrigation
        </h2>
        <p className="mt-1 text-sm text-slate">Eau consommée, coût et dernières irrigations enregistrées par culture.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-slate">Eau consommée</p>
          <p className="mt-1 text-lg font-semibold text-earth">{summary.totalVolume ? `${fmtNumber(summary.totalVolume)} L` : '-'}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-slate">Coût eau</p>
          <p className="mt-1 text-lg font-semibold text-earth">{fmtCurrency(summary.totalCost)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-slate">Irrigations</p>
          <p className="mt-1 text-lg font-semibold text-earth">{fmtNumber(summary.irrigationCount)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-slate">Cultures irriguées</p>
          <p className="mt-1 text-lg font-semibold text-earth">{fmtNumber(summary.culturesIrrigated)}</p>
        </div>
      </div>

      {summary.recent.length ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-horizon-dark">Dernières irrigations</p>
          <ul className="divide-y divide-line/70">
            {summary.recent.map((entry, index) => (
              <li key={`${entry.cultureId}-${entry.date}-${index}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <b className="text-earth">{entry.label}</b>
                  <span className="text-slate">{entry.date ? ` · ${entry.date}` : ''}{entry.source ? ` · ${entry.source}` : ''}</span>
                </span>
                <span className="shrink-0 font-semibold text-slate">{fmtNumber(entry.volume)} L{entry.cost ? ` · ${fmtCurrency(entry.cost)}` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-line bg-card px-4 py-3 text-sm text-slate">
          Aucune irrigation enregistrée pour l’instant. Utilisez le formulaire ci-dessus pour en saisir une.
        </p>
      )}
    </section>
  );
}
