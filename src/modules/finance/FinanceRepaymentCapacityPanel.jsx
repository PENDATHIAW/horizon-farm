import { Scale } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';

export default function FinanceRepaymentCapacityPanel({ capacity = null }) {
  if (!capacity?.ready) {
    return (
      <section className="rounded-3xl border border-line bg-card p-6 text-sm text-slate">
        Capacité de remboursement disponible après saisie de ventes, charges et échéances.
      </section>
    );
  }

  const tone = capacity.capacityKey === 'strong' ? 'text-positive'
    : capacity.capacityKey === 'ok' ? 'text-positive'
      : capacity.capacityKey === 'watch' ? 'text-horizon-dark' : 'text-urgent';

  const loan = capacity.loanParameters;

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
      <div className="flex items-center gap-2">
        <Scale size={20} className="text-horizon-dark" />
        <div>
          <h2 className="text-lg font-semibold text-earth">Capacité de remboursement</h2>
          <p className="text-sm text-slate">{capacity.explanation}</p>
        </div>
      </div>

      {loan ? (
        <div className="mt-4 rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate">Paramètres du financement envisagé</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm lg:grid-cols-3">
            <Param label="Montant du prêt" value={loan.loanAmount ? fmtCurrency(loan.loanAmount) : '—'} />
            <Param label="Durée" value={loan.durationMonths ? `${loan.durationMonths} mois` : '—'} />
            <Param label="Taux indicatif" value={loan.annualRate != null ? `${loan.annualRate} %` : '—'} />
            <Param label="Mensualité estimée" value={loan.estimatedMonthlyPayment ? fmtCurrency(loan.estimatedMonthlyPayment) : '—'} />
            <Param label="Service de dette mensuel" value={capacity.monthlyDebtService ? fmtCurrency(capacity.monthlyDebtService) : '—'} />
            <Param label="Apport personnel" value={loan.personalContribution ? fmtCurrency(loan.personalContribution) : '—'} />
            <Param label="Différé" value={loan.deferMonths ? `${loan.deferMonths} mois` : 'Aucun'} />
          </div>
          {!loan.filled && loan.hint ? (
            <p className="mt-3 text-xs text-horizon-dark">{loan.hint}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Metric label="Résultat opérationnel" value={fmtCurrency(capacity.operatingResult)} />
        <Metric label="Trésorerie et flux disponibles" value={fmtCurrency(capacity.availableCashFlow)} hint="Trésorerie + créances − dettes" />
        <Metric label="Mensualité max. prudente" value={fmtCurrency(capacity.maxMonthlyPayment)} />
        <Metric label="Dettes existantes" value={fmtCurrency(capacity.existingDebts)} />
        <Metric label="Marge de sécurité" value={fmtCurrency(capacity.safetyMargin)} />
        <Metric label="Capacité de remboursement" value={capacity.capacityLabel} tone={tone} />
      </div>

      {capacity.dscr != null ? (
        <div className="mt-4 rounded-xl border border-line bg-card px-3 py-2 text-sm">
          <p className="text-slate">
            Ratio de couverture (DSCR) :
            {' '}
            <span className="font-semibold text-earth">{capacity.dscr}</span>
          </p>
          <p className="mt-1 text-xs text-slate">{capacity.dscrExplanation}</p>
        </div>
      ) : null}
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

function Param({ label, value }) {
  return (
    <div>
      <p className="text-meta text-slate">{label}</p>
      <p className="font-semibold text-earth">{value}</p>
    </div>
  );
}
