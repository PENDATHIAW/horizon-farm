import { AlertTriangle, Banknote, CreditCard, PiggyBank, Receipt, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { fmtCurrency } from '../utils/format';
import { buildOfficialTreasuryView, TREASURY_LABELS } from '../utils/financePilotageCore.js';

function Mini({ icon: Icon, label, value, hint, danger = false }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${danger ? 'border-vigilance bg-vigilance-bg' : 'border-line bg-white'}`}>
      <Icon size={15} className={danger ? 'text-horizon-dark' : 'text-horizon-dark'} />
      <b className="block text-earth break-words">{value}</b>
      <span className="text-xs text-slate">{label}</span>
      {hint ? <p className="text-meta text-slate mt-1">{hint}</p> : null}
    </div>
  );
}

export default function FinanceCashPilotPanel(props) {
  const treasury = buildOfficialTreasuryView(props);
  const warnings = treasury.warnings;

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2">
            <Wallet size={15} /> Trésorerie officielle
          </p>
          <h3 className="text-xl font-semibold text-earth mt-1">{TREASURY_LABELS.treasuryAvailable}</h3>
          <p className="text-sm text-slate mt-1">
            Source unique : moteur <code className="text-xs">consolidateFinance</code>. Les libellés ci-dessous ne doublent pas la trésorerie disponible.
          </p>
        </div>
        {warnings.length ? (
          <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark">
            <AlertTriangle size={15} className="inline" /> {warnings.length} point(s) à vérifier
          </div>
        ) : (
          <div className="rounded-2xl border border-positive bg-positive-bg p-3 text-sm text-positive">Trésorerie consolidée</div>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 text-sm">
        <Mini icon={PiggyBank} label={TREASURY_LABELS.treasuryAvailable} value={fmtCurrency(treasury.treasuryAvailable)} danger={treasury.treasuryAvailable < 0} hint="Disponibilité après encaissements et dépenses payées." />
        <Mini icon={TrendingUp} label={TREASURY_LABELS.cashCollected} value={fmtCurrency(treasury.cashCollected)} hint="Encaissements ventes et autres entrées payées." />
        <Mini icon={TrendingDown} label={TREASURY_LABELS.chargesEngaged} value={fmtCurrency(treasury.chargesEngaged)} hint="Dépenses et coûts engagés." danger={treasury.chargesEngaged > treasury.cashCollected} />
        <Mini icon={CreditCard} label={TREASURY_LABELS.receivables} value={fmtCurrency(treasury.receivables)} hint="Reste à encaisser clients." danger={treasury.receivables > 0} />
        <Mini icon={Receipt} label={TREASURY_LABELS.payables} value={fmtCurrency(treasury.payables)} hint="Dettes fournisseurs et charges ouvertes." danger={treasury.payables > 0} />
        <Mini icon={Banknote} label={TREASURY_LABELS.netPosition} value={fmtCurrency(treasury.netPosition)} hint="Trésorerie + créances − dettes." danger={treasury.netPosition < 0} />
      </div>
      {warnings.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {warnings.map((warning) => (
            <div key={warning} className="rounded-xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark">{warning}</div>
          ))}
        </div>
      ) : null}
      <div className="rounded-2xl border border-line bg-card p-4 text-sm text-slate">
        <b className="text-earth">Lecture :</b> {TREASURY_LABELS.treasuryAvailable} ({fmtCurrency(treasury.treasuryAvailable)}) est le chiffre de référence.
        {TREASURY_LABELS.netPosition} inclut créances et dettes - ce n&apos;est pas un second solde de trésorerie.
        {TREASURY_LABELS.realMargin} : {fmtCurrency(treasury.realMargin)} ({treasury.marginRate}%).
      </div>
    </section>
  );
}
