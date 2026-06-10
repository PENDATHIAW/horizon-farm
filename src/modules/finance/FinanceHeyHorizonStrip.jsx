import { MessageCircle } from 'lucide-react';
import { launchHeyHorizonAssistant } from '../../utils/dashboardHeyHorizon.js';

import { EMPTY_STATE_FINANCE_QA } from '../../utils/financeEmptyState.js';

export default function FinanceHeyHorizonStrip({ questions = [], onNavigate, onOpenAssistant, insufficientData = false }) {
  if (!questions.length) return null;

  return (
    <section className="rounded-3xl border border-violet-200 bg-violet-50/40 p-5">
      <div className="flex items-center gap-2">
        <MessageCircle size={18} className="text-violet-700" />
        <h2 className="text-base font-black text-[#2f2415]">Hey Horizon Finance</h2>
      </div>
      <p className="mt-1 text-sm text-[#8a7456]">
        {insufficientData
          ? 'Questions guidées — réponses honnêtes même sans historique financier.'
          : 'Questions rapides basées sur vos données financières.'}
      </p>
      {insufficientData ? (
        <p className="mt-2 rounded-xl border border-violet-100 bg-white/80 px-3 py-2 text-xs text-violet-900">{EMPTY_STATE_FINANCE_QA}</p>
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
            className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-black text-violet-900 hover:bg-violet-50"
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}
