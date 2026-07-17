import { useMemo } from 'react';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { fmtCurrency } from '../../utils/format.js';
import { buildDecisionBriefing } from '../../utils/decisionBriefing.js';

const SEVERITY_STYLE = {
  critique: 'border-vigilance bg-vigilance-bg',
  warning: 'border-vigilance bg-vigilance-bg',
  info: 'border-line bg-card',
};

/**
 * Briefing décisionnel : les 3 décisions prioritaires chiffrées du jour,
 * dérivées des chiffres consolidés. Lecture seule, chaque décision mène au
 * module concerné.
 */
export default function DecisionBriefingCard({ dataMap = {}, onNavigate }) {
  const briefing = useMemo(() => buildDecisionBriefing(dataMap), [dataMap]);
  if (!briefing.decisions.length) {
    return (
      <section className="hf-card" data-testid="decision-briefing">
        <p className="text-label font-semibold uppercase text-earth flex items-center gap-2">
          <Sparkles size={15} /> Décisions du jour
        </p>
        <p className="mt-2 flex items-center gap-2 text-sm text-positive">
          <CheckCircle2 size={15} /> Rien d’urgent : trésorerie, créances et stocks sous contrôle.
        </p>
      </section>
    );
  }

  return (
    <section className="hf-card" data-testid="decision-briefing">
      <div className="flex items-center justify-between gap-2">
        <p className="text-label font-semibold uppercase text-earth flex items-center gap-2">
          <Sparkles size={15} /> Décisions du jour
        </p>
        <span className="text-meta text-slate">Priorités chiffrées</span>
      </div>
      <ol className="mt-3 space-y-2">
        {briefing.decisions.map((decision, index) => (
          <li key={decision.key} className={`rounded-2xl border p-3 ${SEVERITY_STYLE[decision.severity] || SEVERITY_STYLE.info}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-earth">
                  <span className="text-slate">{index + 1}.</span> {decision.title}
                </p>
                <p className="text-sm text-slate mt-1">{decision.detail}</p>
              </div>
              {!decision.impactIsCount && decision.impact ? (
                <span className="shrink-0 text-sm font-semibold tabular-nums text-horizon-dark">{fmtCurrency(decision.impact)}</span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.(decision.module, decision.tab ? { tab: decision.tab } : undefined)}
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-horizon-dark underline underline-offset-2"
            >
              {decision.action} <ArrowRight size={14} />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
