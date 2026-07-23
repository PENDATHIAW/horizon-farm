import { Calculator } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fmtCurrency } from '../../utils/format';
import { readFinanceSimulatorParams, writeFinanceSimulatorParams } from '../../utils/financePilotageV3.js';

function Field({ label, value, onChange, suffix = '' }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate">{label}</span>
      <div className="mt-1 flex items-center gap-1 rounded-xl border border-line bg-card px-3 py-2">
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full bg-transparent text-sm font-semibold text-earth outline-none"
        />
        {suffix ? <span className="text-xs text-slate">{suffix}</span> : null}
      </div>
    </label>
  );
}

export default function FinanceFinancingSimulatorPanel({
  simulator = null,
  defaultAmount = 0,
  onParamsChange,
}) {
  const [params, setParams] = useState(() => {
    const stored = readFinanceSimulatorParams();
    return { ...stored, loanAmount: stored.loanAmount || defaultAmount };
  });

  useEffect(() => {
    onParamsChange?.(params);
    writeFinanceSimulatorParams(params);
  }, [params, onParamsChange]);

  const prudenceTone = simulator?.prudence === 'high'
    ? 'text-positive'
    : simulator?.prudence === 'low' ? 'text-urgent' : 'text-horizon-dark';

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
      <div className="flex items-center gap-2">
        <Calculator size={20} className="text-horizon-dark" />
        <div>
          <h2 className="text-lg font-semibold text-earth">Simulation d’emprunt</h2>
          <p className="text-sm text-slate">Estimation indicative - à confirmer avec votre banque.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Field label="Montant recherché" value={params.loanAmount} onChange={(v) => setParams((p) => ({ ...p, loanAmount: v }))} suffix="FCFA" />
        <Field label="Durée" value={params.durationMonths} onChange={(v) => setParams((p) => ({ ...p, durationMonths: v }))} suffix="mois" />
        <Field label="Taux annuel indicatif" value={params.annualRate} onChange={(v) => setParams((p) => ({ ...p, annualRate: v }))} suffix="%" />
        <Field label="Différé éventuel" value={params.deferMonths} onChange={(v) => setParams((p) => ({ ...p, deferMonths: v }))} suffix="mois" />
        <Field label="Apport personnel" value={params.personalContribution} onChange={(v) => setParams((p) => ({ ...p, personalContribution: v }))} suffix="FCFA" />
      </div>

      {!simulator?.ready ? (
        <p className="mt-4 rounded-2xl border border-vigilance bg-vigilance-bg px-4 py-3 text-sm text-horizon-dark">
          {simulator?.message || 'Renseignez les paramètres du financement pour obtenir une estimation plus précise.'}
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Mensualité estimée" value={fmtCurrency(simulator.monthlyPayment)} />
          <Metric label="Coût total du crédit" value={fmtCurrency(simulator.totalCost)} />
          <Metric label="Charge annuelle" value={fmtCurrency(simulator.annualCharge)} />
          <Metric label="Vs cash-flow dispo." value={fmtCurrency(simulator.vsCashFlow)} tone={simulator.vsCashFlow >= 0 ? 'text-positive' : 'text-urgent'} />
          <Metric label="Niveau de prudence" value={simulator.prudenceLabel} tone={prudenceTone} />
          {simulator.dscr != null ? (
            <Metric label="Ratio de couverture (DSCR)" value={String(simulator.dscr)} hint="Flux disponibles / remboursements mensuels" />
          ) : null}
        </div>
      )}

      <p className="mt-4 text-xs text-slate">{simulator?.disclaimer}</p>
    </section>
  );
}

function Metric({ label, value, tone = 'text-earth', hint = null }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3">
      <p className="text-meta font-semibold uppercase tracking-normal text-slate">{label}</p>
      <p className={`mt-1 text-base font-semibold ${tone}`}>{value}</p>
      {hint ? <p className="mt-1 text-meta text-slate">{hint}</p> : null}
    </div>
  );
}
