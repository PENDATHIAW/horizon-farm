import { useMemo } from 'react';
import { ClipboardCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { fmtCurrency } from '../utils/format';
import { buildChargesCompletenessAudit } from '../utils/chargesCompletenessAudit.js';

const SEVERITY_STYLES = {
  critique: 'border-vigilance bg-vigilance-bg text-horizon-dark',
  warning: 'border-vigilance bg-vigilance-bg text-horizon-dark',
  info: 'border-line bg-card text-slate',
};

/**
 * Audit d'exhaustivité des charges : signale les coûts probablement non tracés
 * (salaires, charges fixes, commissions mobile money, amortissement) pour que la
 * marge réelle soit exacte. Diagnostic seul, aucune charge n'est créée.
 */
export default function ChargesCompletenessPanel({ transactions = [], payments = [], investissements = [], team = [], onNavigate }) {
  const audit = useMemo(
    () => buildChargesCompletenessAudit({ transactions, payments, investissements, team }),
    [transactions, payments, investissements, team],
  );

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2">
            <ClipboardCheck size={15} /> Exhaustivité des charges
          </p>
          <h3 className="text-xl font-semibold text-earth mt-1">Ai-je tracé tous mes coûts ?</h3>
          <p className="text-sm text-slate mt-1">Angles morts qui faussent la marge réelle. Aucune charge n’est créée automatiquement : à saisir vous-même.</p>
        </div>
        {audit.complete ? (
          <div className="rounded-2xl border border-positive bg-positive-bg p-3 text-sm text-positive flex items-center gap-2">
            <CheckCircle2 size={15} /> Charges complètes ({audit.score}/100)
          </div>
        ) : (
          <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark flex items-center gap-2">
            <AlertTriangle size={15} /> {audit.gapCount} point(s) · {audit.score}/100
          </div>
        )}
      </div>

      {audit.complete ? (
        <p className="text-sm text-slate">Salaires, charges fixes, commissions et amortissements semblent saisis. Continuez ainsi.</p>
      ) : (
        <ul className="space-y-2">
          {audit.gaps.map((gap) => (
            <li key={gap.key} className={`rounded-2xl border p-3 ${SEVERITY_STYLES[gap.severity] || SEVERITY_STYLES.info}`}>
              <div className="flex items-center justify-between gap-2">
                <b className="text-earth">{gap.label}</b>
                {gap.estimatedImpact ? <span className="text-sm tabular-nums">~{fmtCurrency(gap.estimatedImpact)}</span> : null}
              </div>
              <p className="text-sm mt-1">{gap.detail}</p>
              <p className="text-meta mt-1">→ {gap.action}</p>
            </li>
          ))}
        </ul>
      )}

      {audit.estimatedUntracked > 0 ? (
        <button
          type="button"
          onClick={() => onNavigate?.('rh')}
          className="text-sm font-semibold text-horizon-dark underline underline-offset-2"
        >
          Charges estimées non tracées : ~{fmtCurrency(audit.estimatedUntracked)}
        </button>
      ) : null}
    </section>
  );
}
