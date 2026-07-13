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
    <section className="rounded-3xl border border-positive bg-positive-bg p-6 shadow-card">
      <p className="text-meta font-semibold uppercase tracking-normal text-positive">Démarrage Finance</p>
      <h2 className="mt-1 text-xl font-semibold text-earth">Parcours de mise en route</h2>
      <p className="mt-1 text-sm text-slate">
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
          className="mt-3 w-full rounded-2xl border border-positive bg-positive-bg px-4 py-3 text-left hover:bg-positive-bg"
        >
          <p className="text-xs font-semibold uppercase tracking-normal text-positive">Prochaine étape</p>
          <p className="mt-1 font-semibold text-earth">{nextStep.label}</p>
        </button>
      ) : null}

      <ul className="mt-4 space-y-2">
        {steps.map((step) => (
          <li key={step.key}>
            <button
              type="button"
              onClick={() => openStep(step)}
              className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm hover:bg-positive-bg ${step.done ? 'border-positive bg-positive-bg' : 'border-positive bg-white'}`}
            >
              {step.done ? (
                <CheckCircle2 size={14} className="text-positive shrink-0" />
              ) : (
                <Circle size={14} className="text-slate shrink-0" />
              )}
              <span className={`font-semibold ${step.done ? 'text-positive' : 'text-earth'}`}>{step.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
