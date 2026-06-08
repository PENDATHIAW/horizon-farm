import { Banknote, ExternalLink } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';
import FinanceExportsPanel from './FinanceExportsPanel.jsx';
import FinanceFinancingSimulatorPanel from './FinanceFinancingSimulatorPanel.jsx';
import FinanceRepaymentCapacityPanel from './FinanceRepaymentCapacityPanel.jsx';

export default function FinanceFinancingPanel({
  financing = null,
  simulator = null,
  directExports = null,
  onNavigate,
  onSimulatorParamsChange,
}) {
  if (!financing) return null;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Banknote size={20} className="text-[#9a6b12]" />
          <div>
            <h2 className="text-lg font-black text-[#2f2415]">Financement</h2>
            <p className="text-sm text-[#8a7456]">Lecture banque / investisseur — données reprises du business plan.</p>
          </div>
        </div>

        {financing.planName ? (
          <p className="mt-3 text-sm text-[#8a7456]">
            Business plan :
            {' '}
            <span className="font-black text-[#2f2415]">{financing.planName}</span>
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Besoin de financement" value={fmtCurrency(financing.investmentNeed)} />
          <Metric label="Apport personnel" value={fmtCurrency(financing.personalContribution)} />
          <Metric label="Financement recherché" value={fmtCurrency(financing.soughtFunding)} />
          <Metric label="Dettes existantes" value={fmtCurrency(financing.existingDebts)} />
        </div>

        {financing.useOfFunds?.length ? (
          <div className="mt-4">
            <p className="text-xs font-black uppercase tracking-wide text-[#8a7456]">Utilisation des fonds</p>
            <ul className="mt-2 space-y-2">
              {financing.useOfFunds.map((row) => (
                <li key={row.label} className="flex items-center justify-between rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm">
                  <span className="font-bold text-[#2f2415]">{row.label}</span>
                  <span className="font-black text-[#9a6b12]">{fmtCurrency(row.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.(financing.investorsModule, { tab: financing.investorsTab })}
            className="inline-flex items-center gap-1 rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-xs font-black text-[#2f2415] hover:bg-[#fffdf8]"
          >
            <ExternalLink size={14} />
            Investisseurs & Forums
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('documents_rapports', { tab: 'Rapports' })}
            className="inline-flex items-center gap-1 rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-xs font-black text-[#8a7456] hover:bg-[#fffdf8]"
          >
            Dossier banque complet (Documents)
          </button>
        </div>

        <p className="mt-3 text-xs text-[#8a7456]">
          Documents financiers disponibles :
          {' '}
          {financing.documentCount}
        </p>
      </section>

      <FinanceFinancingSimulatorPanel
        simulator={simulator}
        defaultAmount={financing.soughtFunding}
        onParamsChange={onSimulatorParamsChange}
      />

      <FinanceRepaymentCapacityPanel capacity={financing.repayment} />

      <FinanceExportsPanel exportPayload={directExports} directOnly compact />
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8a7456]">{label}</p>
      <p className="mt-1 text-base font-black text-[#2f2415]">{value}</p>
    </div>
  );
}
