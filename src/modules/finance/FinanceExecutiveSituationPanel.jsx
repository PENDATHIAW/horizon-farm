import { Landmark } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';
import { TREASURY_LABELS } from '../../utils/financePilotageCore.js';
import { FINANCE_EMPTY_LABELS, formatTreasuryRiskLabel, treasuryRiskTone } from '../../utils/financeEmptyState.js';

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  return (
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
      <p className="text-xs text-[#8a7456]">{label}</p>
      <p className={`mt-1 text-xl font-black ${cls}`}>{value}</p>
    </div>
  );
}

export default function FinanceExecutiveSituationPanel({ situation = null, onNavigateTab }) {
  if (!situation) return null;

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Landmark size={20} className="text-[#9a6b12]" />
        <div>
          <h2 className="text-lg font-black text-[#2f2415]">Situation financière</h2>
          <p className="text-sm text-[#8a7456]">Lecture dirigeant en moins de 30 secondes.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={TREASURY_LABELS.treasuryAvailable} value={fmtCurrency(situation.treasuryAvailable)} tone={situation.treasuryAvailable >= 0 ? 'good' : 'bad'} />
        <Stat label={TREASURY_LABELS.receivables} value={fmtCurrency(situation.receivables)} tone={situation.receivables ? 'warn' : 'good'} />
        <Stat label={TREASURY_LABELS.payables} value={fmtCurrency(situation.payables)} tone={situation.payables ? 'warn' : 'good'} />
        <Stat label="Encaissements attendus" value={fmtCurrency(situation.expectedInflows)} tone="good" />
        <Stat label="Paiements à venir" value={fmtCurrency(situation.expectedOutflows)} tone="warn" />
        <Stat label={TREASURY_LABELS.realMargin} value={fmtCurrency(situation.realMargin)} tone={situation.realMargin >= 0 ? 'good' : 'bad'} />
        <Stat
          label="Taux de marge"
          value={situation.insufficientData || !situation.marginRateReliable
            ? FINANCE_EMPTY_LABELS.notCalculable
            : `${situation.marginRate} %`}
          tone={situation.insufficientData || !situation.marginRateReliable ? 'neutral' : situation.isProfitable ? 'good' : 'warn'}
        />
        <Stat
          label="Rentabilité"
          value={situation.insufficientData || !situation.profitabilityReady
            ? FINANCE_EMPTY_LABELS.notCalculable
            : situation.isProfitable ? 'Oui' : 'À surveiller'}
          tone={situation.insufficientData || !situation.profitabilityReady ? 'neutral' : situation.isProfitable ? 'good' : 'bad'}
        />
      </div>

      {situation.priorityAction ? (
        <button
          type="button"
          onClick={() => onNavigateTab?.(situation.priorityAction.tab)}
          className="mt-4 w-full rounded-2xl border border-[#9a6b12]/30 bg-[#fffdf8] p-4 text-left hover:bg-[#faf6ee]"
        >
          <p className="text-xs font-black uppercase tracking-wide text-[#9a6b12]">Prochaine action prioritaire</p>
          <p className="mt-1 font-black text-[#2f2415]">{situation.priorityAction.label}</p>
          <p className="mt-1 text-sm text-[#8a7456]">{situation.priorityAction.detail}</p>
        </button>
      ) : null}

      <p className="mt-3 text-sm text-[#8a7456]">
        Risque de tension trésorerie :
        {' '}
        <span className={`font-black ${treasuryRiskTone({ forecastReady: situation.forecastReady, risk: situation.treasuryRisk }) === 'bad' ? 'text-red-600' : treasuryRiskTone({ forecastReady: situation.forecastReady, risk: situation.treasuryRisk }) === 'warn' ? 'text-amber-600' : treasuryRiskTone({ forecastReady: situation.forecastReady, risk: situation.treasuryRisk }) === 'good' ? 'text-emerald-700' : 'text-[#8a7456]'}`}>
          {formatTreasuryRiskLabel({ forecastReady: situation.forecastReady, risk: situation.treasuryRisk })}
        </span>
      </p>
    </section>
  );
}
