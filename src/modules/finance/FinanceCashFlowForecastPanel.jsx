import { TrendingUp } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : tone === 'bad' ? 'text-red-700' : 'text-[#2f2415]';
  return (
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8a7456]">{label}</p>
      <p className={`mt-1 text-lg font-black ${cls}`}>{value}</p>
    </div>
  );
}

export default function FinanceCashFlowForecastPanel({ forecast = null }) {
  if (!forecast) return null;

  if (!forecast.ready) {
    return (
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} />
          <h2 className="text-lg font-black text-[#2f2415]">Cash-flow prévisionnel</h2>
        </div>
        <p className="mt-2">{forecast.message}</p>
      </section>
    );
  }

  const toneFor = (value) => (value >= 0 ? 'good' : 'bad');
  const riskTone = forecast.risk === 'high' ? 'bad' : forecast.risk === 'medium' ? 'warn' : 'good';

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <TrendingUp size={20} className="text-[#9a6b12]" />
        <div>
          <h2 className="text-lg font-black text-[#2f2415]">Cash-flow prévisionnel 30 / 60 / 90 jours</h2>
          <p className="text-sm text-[#8a7456]">Projection prudente à partir de l'échéancier et de la trésorerie officielle.</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Trésorerie actuelle" value={fmtCurrency(forecast.currentTreasury)} tone={toneFor(forecast.currentTreasury)} />
        <Stat label="Projection 30 jours" value={fmtCurrency(forecast.projection30)} tone={toneFor(forecast.projection30)} />
        <Stat label="Projection 60 jours" value={fmtCurrency(forecast.projection60)} tone={toneFor(forecast.projection60)} />
        <Stat label="Projection 90 jours" value={fmtCurrency(forecast.projection90)} tone={toneFor(forecast.projection90)} />
      </div>
      <p className="mt-4 text-sm text-[#8a7456]">
        Risque trésorerie :
        {' '}
        <span className={`font-black ${riskTone === 'bad' ? 'text-red-600' : riskTone === 'warn' ? 'text-amber-600' : 'text-emerald-700'}`}>
          {forecast.riskLabel}
        </span>
      </p>
    </section>
  );
}
