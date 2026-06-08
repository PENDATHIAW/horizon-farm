import { MessageCircle } from 'lucide-react';
import { launchHeyHorizonAssistant } from '../../utils/dashboardHeyHorizon.js';

export default function FinanceHeyHorizonStrip({ questions = [], onNavigate, onOpenAssistant }) {
  if (!questions.length) return null;

  return (
    <section className="rounded-3xl border border-violet-200 bg-violet-50/40 p-5">
      <div className="flex items-center gap-2">
        <MessageCircle size={18} className="text-violet-700" />
        <h2 className="text-base font-black text-[#2f2415]">Hey Horizon Finance</h2>
      </div>
      <p className="mt-1 text-sm text-[#8a7456]">Questions rapides basées sur vos données financières.</p>
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
