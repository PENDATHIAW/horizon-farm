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

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Scale size={20} className="text-[#9a6b12]" />
        <div>
          <h2 className="text-lg font-black text-[#2f2415]">Capacité de remboursement</h2>
          <p className="text-sm text-[#8a7456]">{capacity.explanation}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Metric label="Résultat opérationnel" value={fmtCurrency(capacity.operatingResult)} />
        <Metric label="Cash-flow disponible" value={fmtCurrency(capacity.availableCashFlow)} />
        <Metric label="Mensualité max. estimée" value={fmtCurrency(capacity.maxMonthlyPayment)} />
        <Metric label="Dettes existantes" value={fmtCurrency(capacity.existingDebts)} />
        <Metric label="Marge de sécurité" value={fmtCurrency(capacity.safetyMargin)} />
        <Metric label="Capacité de dette" value={capacity.capacityLabel} tone={tone} />
      </div>
      {capacity.dscr != null ? (
        <p className="mt-4 text-sm text-[#8a7456]">
          DSCR (flux disponibles / remboursements) :
          {' '}
          <span className="font-black text-[#2f2415]">{capacity.dscr}</span>
        </p>
      ) : null}
    </section>
  );
}

function Metric({ label, value, tone = 'text-[#2f2415]' }) {
  return (
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8a7456]">{label}</p>
      <p className={`mt-1 text-base font-black ${tone}`}>{value}</p>
    </div>
  );
}
