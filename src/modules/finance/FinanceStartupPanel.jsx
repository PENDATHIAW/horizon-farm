import { CheckCircle2, Circle } from 'lucide-react';
import { emitHorizonForm } from '../../services/formModalManager';

export default function FinanceStartupPanel({ journey = null, onNavigate, setTab }) {
  const steps = journey?.steps || [];
  const nextStep = journey?.nextStep;

  const openStep = (step) => {
    if (step.key === 'expense') {
      emitHorizonForm('finances', 'finance_entry', 'Nouvelle écriture', { date: new Date().toISOString().slice(0, 10) });
      setTab?.('Trésorerie');
      return;
    }
    if (step.module) {
      onNavigate?.(step.module, step.tab ? { tab: step.tab } : undefined);
      return;
    }
    if (step.tab) setTab?.(step.tab);
  };

  return (
    <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-800">Démarrage Finance</p>
      <h2 className="mt-1 text-xl font-black text-[#2f2415]">Parcours de mise en route</h2>
      <p className="mt-1 text-sm text-[#8a7456]">
        Progression :
        {' '}
        {journey?.completed ?? 0}
        /
        {journey?.total ?? steps.length}
        {' '}
        étapes (
        {journey?.progressPct ?? 0}
        %)
      </p>

      {nextStep && !nextStep.done ? (
        <button
          type="button"
          onClick={() => openStep(nextStep)}
          className="mt-3 w-full rounded-2xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-left hover:bg-emerald-200/70"
        >
          <p className="text-xs font-black uppercase tracking-wide text-emerald-900">Prochaine étape</p>
          <p className="mt-1 font-black text-[#2f2415]">{nextStep.label}</p>
        </button>
      ) : null}

      <ul className="mt-4 space-y-2">
        {steps.map((step) => (
          <li key={step.key}>
            <button
              type="button"
              onClick={() => openStep(step)}
              className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm hover:bg-emerald-50 ${step.done ? 'border-emerald-300 bg-emerald-50/60' : 'border-emerald-200 bg-white'}`}
            >
              {step.done ? (
                <CheckCircle2 size={14} className="text-emerald-700 shrink-0" />
              ) : (
                <Circle size={14} className="text-[#8a7456] shrink-0" />
              )}
              <span className={`font-bold ${step.done ? 'text-emerald-900' : 'text-[#2f2415]'}`}>{step.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
