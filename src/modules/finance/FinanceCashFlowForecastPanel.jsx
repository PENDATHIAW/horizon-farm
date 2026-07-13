import { TrendingUp } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-positive' : tone === 'warn' ? 'text-horizon-dark' : tone === 'bad' ? 'text-urgent' : 'text-earth';
  return (
    <div className="rounded-2xl border border-line bg-card p-3">
      <p className="text-meta font-semibold uppercase tracking-normal text-slate">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${cls}`}>{value}</p>
    </div>
  );
}

export default function FinanceCashFlowForecastPanel({ forecast = null }) {
  if (!forecast) return null;

  if (!forecast.ready) {
    return (
      <section className="rounded-3xl border border-vigilance bg-vigilance-bg p-6 text-sm text-horizon-dark">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} />
          <h2 className="text-lg font-semibold text-earth">Cash-flow prévisionnel</h2>
        </div>
        <p className="mt-2">{forecast.message}</p>
      </section>
    );
  }

  const toneFor = (value) => (value >= 0 ? 'good' : 'bad');
  const riskTone = forecast.risk === 'high' ? 'bad' : forecast.risk === 'medium' ? 'warn' : 'good';

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
      <div className="flex items-center gap-2">
        <TrendingUp size={20} className="text-horizon-dark" />
        <div>
          <h2 className="text-lg font-semibold text-earth">Cash-flow prévisionnel 30 / 60 / 90 jours</h2>
          <p className="text-sm text-slate">Projection prudente à partir de l'échéancier et de la trésorerie officielle.</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Trésorerie actuelle" value={fmtCurrency(forecast.currentTreasury)} tone={toneFor(forecast.currentTreasury)} />
        <Stat label="Projection 30 jours" value={fmtCurrency(forecast.projection30)} tone={toneFor(forecast.projection30)} />
        <Stat label="Projection 60 jours" value={fmtCurrency(forecast.projection60)} tone={toneFor(forecast.projection60)} />
        <Stat label="Projection 90 jours" value={fmtCurrency(forecast.projection90)} tone={toneFor(forecast.projection90)} />
      </div>
      <p className="mt-4 text-sm text-slate">
        Risque trésorerie :
        {' '}
        <span className={`font-semibold ${riskTone === 'bad' ? 'text-urgent' : riskTone === 'warn' ? 'text-horizon-dark' : 'text-positive'}`}>
          {forecast.riskLabel}
        </span>
      </p>
    </section>
  );
}
