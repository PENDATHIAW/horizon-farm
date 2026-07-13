import { CheckCircle2, Circle, Rocket } from 'lucide-react';

export default function CommercialStartupPanel({ journey = null, setTab, onNavigate }) {
  const steps = journey?.steps || [];
  const nextStep = journey?.nextStep;

  const openStep = (step) => {
    if (step.module) {
      onNavigate?.(step.module, step.tab ? { tab: step.tab } : undefined);
      return;
    }
    if (step.tab) setTab?.(step.tab);
  };

  return (
    <section className="rounded-3xl border border-vigilance bg-vigilance-bg p-6 shadow-card">
      <p className="text-meta font-semibold uppercase tracking-normal text-horizon-dark flex items-center gap-2"><Rocket size={14} /> Mode démarrage</p>
      <h2 className="mt-1 text-xl font-semibold text-earth">Votre activité commerciale est prête.</h2>
      <p className="mt-1 text-sm text-slate">
        Progression :
        {' '}
        {journey?.completed ?? 0}
        /
        {journey?.total ?? steps.length}
        {' '}
        (
        {journey?.progressPct ?? 0}
        %)
      </p>

      {nextStep && !nextStep.done ? (
        <button type="button" onClick={() => openStep(nextStep)} className="mt-3 w-full rounded-2xl border border-vigilance bg-vigilance-bg px-4 py-3 text-left hover:bg-vigilance-bg">
          <p className="text-xs font-semibold uppercase tracking-normal text-horizon-dark">Prochaine étape</p>
          <p className="mt-1 font-semibold text-earth">{nextStep.label}</p>
        </button>
      ) : null}

      <ul className="mt-4 space-y-2">
        {steps.map((step) => (
          <li key={step.key}>
            <button type="button" onClick={() => openStep(step)} className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm hover:bg-vigilance-bg ${step.done ? 'border-positive bg-positive-bg' : 'border-vigilance bg-white'}`}>
              {step.done ? <CheckCircle2 size={14} className="text-positive shrink-0" /> : <Circle size={14} className="text-slate shrink-0" />}
              <span className={`font-semibold ${step.done ? 'text-positive' : 'text-earth'}`}>{step.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
