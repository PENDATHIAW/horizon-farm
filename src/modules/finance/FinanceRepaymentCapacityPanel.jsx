import { Scale } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';

export default function FinanceRepaymentCapacityPanel({ capacity = null }) {
  if (!capacity?.ready) {
    return (
      <section className="rounded-3xl border border-[#eadcc2] bg-[#fffdf8] p-5 text-sm text-[#8a7456]">
        Capacité de remboursement disponible après saisie de ventes, charges et échéances.
      </section>
    );
  }

  const tone = capacity.capacityKey === 'strong' ? 'text-emerald-700'
    : capacity.capacityKey === 'ok' ? 'text-emerald-600'
      : capacity.capacityKey === 'watch' ? 'text-amber-700' : 'text-red-600';

  const loan = capacity.loanParameters;

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Scale size={20} className="text-[#9a6b12]" />
        <div>
          <h2 className="text-lg font-black text-[#2f2415]">Capacité de remboursement</h2>
          <p className="text-sm text-[#8a7456]">{capacity.explanation}</p>
        </div>
      </div>

      {loan ? (
        <div className="mt-4 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs font-black uppercase tracking-wide text-[#8a7456]">Paramètres du financement envisagé</p>
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
            <p className="mt-3 text-xs text-amber-800">{loan.hint}</p>
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
        <div className="mt-4 rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm">
          <p className="text-[#8a7456]">
            Ratio de couverture (DSCR) :
            {' '}
            <span className="font-black text-[#2f2415]">{capacity.dscr}</span>
          </p>
          <p className="mt-1 text-xs text-[#8a7456]">{capacity.dscrExplanation}</p>
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value, tone = 'text-[#2f2415]', hint = null }) {
  return (
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8a7456]">{label}</p>
      <p className={`mt-1 text-base font-black ${tone}`}>{value}</p>
      {hint ? <p className="mt-1 text-[10px] text-[#8a7456]">{hint}</p> : null}
    </div>
  );
}

function Param({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-[#8a7456]">{label}</p>
      <p className="font-bold text-[#2f2415]">{value}</p>
    </div>
  );
}
