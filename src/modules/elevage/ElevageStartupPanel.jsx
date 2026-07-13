import { CheckCircle2, Circle, Egg, HeartPulse, Milk, ShoppingBag, Utensils, Warehouse } from 'lucide-react';

const ICONS = {
  lot: Milk,
  animal: Milk,
  feed_stock: Warehouse,
  feeding: Utensils,
  health: HeartPulse,
  production: Egg,
  commercial: ShoppingBag,
};

export default function ElevageStartupPanel({ progress, setTab, onNavigate, onOpenWorkflow }) {
  if (!progress?.steps?.length) return null;

  const { steps, completed, total, nextStep, percent } = progress;

  const runStep = (step) => {
    if (step.modal) onOpenWorkflow?.(step.modal);
    else if (step.navigate) onNavigate?.(step.navigate, step.navigateTab ? { tab: step.navigateTab } : undefined);
    else setTab?.(step.tab);
  };

  return (
    <section className="rounded-3xl border border-positive bg-positive-bg p-6 shadow-card">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-positive">Mode démarrage</p>
          <h2 className="mt-1 text-xl font-semibold text-earth">Votre module Élevage est prêt.</h2>
          <p className="mt-2 text-sm text-slate">
            Progression {completed}/{total} · {percent}%
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-positive-bg sm:w-48">
          <div className="h-full bg-positive transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {nextStep ? (
        <div className="mt-4 rounded-xl border border-positive bg-white p-3 text-sm">
          <p className="text-xs font-semibold text-positive">Prochaine étape</p>
          <p className="mt-1 font-semibold text-earth">{nextStep.label}</p>
          <button
            type="button"
            onClick={() => runStep(nextStep)}
            className="mt-2 rounded-lg bg-earth px-3 py-2 text-xs font-semibold text-white"
          >
            Continuer →
          </button>
        </div>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-positive">
          <CheckCircle2 size={16} /> Parcours démarrage complété
        </p>
      )}

      <ul className="mt-6 space-y-2">
        {steps.map((step, index) => {
          const Icon = ICONS[step.id] || Milk;
          const DoneIcon = step.done ? CheckCircle2 : Circle;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => runStep(step)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  step.done ? 'border-positive bg-white' : 'border-line bg-white hover:border-positive'
                }`}
              >
                <DoneIcon size={18} className={`shrink-0 ${step.done ? 'text-positive' : 'text-slate'}`} />
                <Icon size={16} className="shrink-0 text-positive" />
                <span className={`text-sm font-semibold ${step.done ? 'text-positive' : 'text-earth'}`}>
                  {index + 1}. {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
