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
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-800">Mode démarrage</p>
          <h2 className="mt-1 text-xl font-black text-[#2f2415]">Votre module Élevage est prêt.</h2>
          <p className="mt-2 text-sm text-[#6b8a6b]">
            Progression {completed}/{total} · {percent}%
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100 sm:w-48">
          <div className="h-full bg-emerald-600 transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {nextStep ? (
        <div className="mt-4 rounded-xl border border-emerald-300 bg-white p-3 text-sm">
          <p className="text-xs font-black text-emerald-800">Prochaine étape</p>
          <p className="mt-1 font-black text-[#2f2415]">{nextStep.label}</p>
          <button
            type="button"
            onClick={() => runStep(nextStep)}
            className="mt-2 rounded-lg bg-[#2f2415] px-3 py-1.5 text-xs font-black text-white"
          >
            Continuer →
          </button>
        </div>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-sm font-black text-emerald-900">
          <CheckCircle2 size={16} /> Parcours démarrage complété
        </p>
      )}

      <ul className="mt-5 space-y-2">
        {steps.map((step, index) => {
          const Icon = ICONS[step.id] || Milk;
          const DoneIcon = step.done ? CheckCircle2 : Circle;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => runStep(step)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  step.done ? 'border-emerald-300 bg-white' : 'border-[#eadcc2] bg-white hover:border-emerald-300'
                }`}
              >
                <DoneIcon size={18} className={`shrink-0 ${step.done ? 'text-emerald-600' : 'text-[#8a7456]'}`} />
                <Icon size={16} className="shrink-0 text-emerald-700" />
                <span className={`text-sm font-black ${step.done ? 'text-emerald-900' : 'text-[#2f2415]'}`}>
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
