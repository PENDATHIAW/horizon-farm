import { Landmark } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';
import { TREASURY_LABELS } from '../../utils/financePilotageCore.js';
import { FINANCE_EMPTY_LABELS, formatTreasuryRiskLabel, treasuryRiskTone } from '../../utils/financeEmptyState.js';

function Stat({ label, hint, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-positive' : tone === 'warn' ? 'text-horizon-dark' : tone === 'bad' ? 'text-urgent' : 'text-earth';
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-xs font-semibold text-slate">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${cls}`}>{value}</p>
      {hint ? <p className="mt-1 text-meta leading-tight text-slate">{hint}</p> : null}
    </div>
  );
}

export default function FinanceExecutiveSituationPanel({ situation = null, onNavigateTab }) {
  if (!situation) return null;

  // Position nette = argent réel + ce qu'on me doit − ce que je dois.
  const netPosition = Number(situation.treasuryAvailable || 0)
    + Number(situation.receivables || 0)
    - Number(situation.payables || 0);
  const rentabilite = situation.insufficientData || !situation.profitabilityReady
    ? FINANCE_EMPTY_LABELS.notCalculable
    : situation.isProfitable ? 'Rentable' : 'À surveiller';

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
      <div className="flex items-center gap-2">
        <Landmark size={20} className="text-horizon-dark" />
        <div>
          <h2 className="text-lg font-semibold text-earth">Situation financière</h2>
          <p className="text-sm text-slate">L’essentiel, sans doublon : ce que j’ai, ce qu’on me doit, ce que je dois.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label={TREASURY_LABELS.treasuryAvailable} hint="Argent réel, tous comptes (Wave, OM, espèces, banque)." value={fmtCurrency(situation.treasuryAvailable)} tone={situation.treasuryAvailable >= 0 ? 'good' : 'bad'} />
        <Stat label={TREASURY_LABELS.receivables} hint="Ce que les clients vous doivent encore." value={fmtCurrency(situation.receivables)} tone={situation.receivables ? 'warn' : 'good'} />
        <Stat label={TREASURY_LABELS.payables} hint="Ce qu’il reste à régler aux fournisseurs." value={fmtCurrency(situation.payables)} tone={situation.payables ? 'warn' : 'good'} />
        <Stat label="Position nette" hint="Trésorerie + créances − dettes." value={fmtCurrency(netPosition)} tone={netPosition >= 0 ? 'good' : 'bad'} />
        <Stat label={TREASURY_LABELS.realMargin} hint="Ventes − charges d’exploitation (cumul, hors investissements)." value={fmtCurrency(situation.realMargin)} tone={situation.realMargin >= 0 ? 'good' : 'bad'} />
        <Stat label="Rentabilité" hint="L’exploitation gagne-t-elle de l’argent ?" value={rentabilite} tone={situation.insufficientData || !situation.profitabilityReady ? 'neutral' : situation.isProfitable ? 'good' : 'bad'} />
      </div>

      {situation.priorityAction ? (
        <button
          type="button"
          onClick={() => onNavigateTab?.(situation.priorityAction.tab)}
          className="mt-4 w-full rounded-2xl border border-horizon-dark/30 bg-card p-4 text-left hover:bg-mist"
        >
          <p className="text-xs font-semibold uppercase tracking-normal text-horizon-dark">Prochaine action prioritaire</p>
          <p className="mt-1 font-semibold text-earth">{situation.priorityAction.label}</p>
          <p className="mt-1 text-sm text-slate">{situation.priorityAction.detail}</p>
        </button>
      ) : null}

      <p className="mt-3 text-sm text-slate">
        Risque de tension trésorerie :
        {' '}
        <span className={`font-semibold ${treasuryRiskTone({ forecastReady: situation.forecastReady, risk: situation.treasuryRisk }) === 'bad' ? 'text-urgent' : treasuryRiskTone({ forecastReady: situation.forecastReady, risk: situation.treasuryRisk }) === 'warn' ? 'text-horizon-dark' : treasuryRiskTone({ forecastReady: situation.forecastReady, risk: situation.treasuryRisk }) === 'good' ? 'text-positive' : 'text-slate'}`}>
          {formatTreasuryRiskLabel({ forecastReady: situation.forecastReady, risk: situation.treasuryRisk })}
        </span>
      </p>
    </section>
  );
}
