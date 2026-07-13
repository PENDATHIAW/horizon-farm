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
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
        <div className="flex items-center gap-2">
          <Banknote size={20} className="text-horizon-dark" />
          <div>
            <h2 className="text-lg font-semibold text-earth">Financement</h2>
            <p className="text-sm text-slate">Lecture banque / investisseur — données reprises du business plan.</p>
          </div>
        </div>

        {financing.planName ? (
          <p className="mt-3 text-sm text-slate">
            Business plan :
            {' '}
            <span className="font-semibold text-earth">{financing.planName}</span>
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
            <p className="text-xs font-semibold uppercase tracking-normal text-slate">Utilisation des fonds</p>
            <ul className="mt-2 space-y-2">
              {financing.useOfFunds.map((row) => (
                <li key={row.label} className="flex items-center justify-between rounded-xl border border-line bg-card px-3 py-2 text-sm">
                  <span className="font-semibold text-earth">{row.label}</span>
                  <span className="font-semibold text-horizon-dark">{fmtCurrency(row.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.(financing.investorsModule, { tab: financing.investorsTab })}
            className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-earth hover:bg-card"
          >
            <ExternalLink size={14} />
            Financements
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('documents_rapports', { tab: 'Rapports' })}
            className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-slate hover:bg-card"
          >
            Dossier banque complet (Documents)
          </button>
        </div>

        <p className="mt-3 text-xs text-slate">
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
    <div className="rounded-2xl border border-line bg-card p-3">
      <p className="text-meta font-semibold uppercase tracking-normal text-slate">{label}</p>
      <p className="mt-1 text-base font-semibold text-earth">{value}</p>
    </div>
  );
}
