import { MessageCircle } from 'lucide-react';
import { launchHeyHorizonAssistant } from '../../utils/dashboardHeyHorizon.js';

import { EMPTY_STATE_FINANCE_QA } from '../../utils/financeEmptyState.js';

export default function FinanceHeyHorizonStrip({ questions = [], onNavigate, onOpenAssistant, insufficientData = false }) {
  if (!questions.length) return null;

  return (
    <section className="rounded-3xl border border-line bg-neutral-bg p-6">
      <div className="flex items-center gap-2">
        <MessageCircle size={18} className="text-neutral" />
        <h2 className="text-base font-semibold text-earth">Hey Horizon Finance</h2>
      </div>
      <p className="mt-1 text-sm text-slate">
        {insufficientData
          ? 'Questions guidées — réponses honnêtes même sans historique financier.'
          : 'Questions rapides basées sur vos données financières.'}
      </p>
      {insufficientData ? (
        <p className="mt-2 rounded-xl border border-line bg-white/80 px-3 py-2 text-xs text-neutral">{EMPTY_STATE_FINANCE_QA}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {questions.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => launchHeyHorizonAssistant({
              query: item.query,
              sourceLabel: 'Finance & Pilotage',
              onNavigate,
              onOpenAssistant,
            })}
            className="rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-neutral hover:bg-neutral-bg"
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}
