import { CheckCircle2, Circle, Package, ShoppingBag, Users, Warehouse } from 'lucide-react';

const ICONS = {
  supplier: Users,
  article: Package,
  unit: Package,
  threshold: Package,
  reception: ShoppingBag,
  proof: Warehouse,
  sellable: ShoppingBag,
  commercial: ShoppingBag,
  watch: Package,
};

export default function AchatsStockStartupPanel({ progress, setTab, onNavigate }) {
  if (!progress?.steps?.length) return null;

  const { steps, completed, total, nextStep, percent } = progress;

  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-800">Mode démarrage</p>
          <h2 className="mt-1 text-xl font-black text-[#2f2415]">Structurer Achats &amp; Stock</h2>
          <p className="mt-2 text-sm text-[#6b8a6b]">
            Progression {completed}/{total} · {percent}%
          </p>
        </div>
        <div className="h-2 w-full sm:w-48 rounded-full bg-emerald-100 overflow-hidden">
          <div className="h-full bg-emerald-600 transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {nextStep ? (
        <div className="mt-4 rounded-xl border border-emerald-300 bg-white p-3 text-sm">
          <p className="text-xs font-black text-emerald-800">Prochaine étape</p>
          <p className="font-black text-[#2f2415] mt-1">{nextStep.label}</p>
          <button
            type="button"
            onClick={() => {
              if (nextStep.navigate) onNavigate?.(nextStep.navigate);
              else setTab?.(nextStep.tab);
            }}
            className="mt-2 rounded-lg bg-[#2f2415] px-3 py-1.5 text-xs font-black text-white"
          >
            Continuer →
          </button>
        </div>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-sm text-emerald-900 font-black">
          <CheckCircle2 size={16} /> Parcours démarrage complété
        </p>
      )}

      <ul className="mt-5 space-y-2">
        {steps.map((step, index) => {
          const Icon = ICONS[step.id] || Package;
          const DoneIcon = step.done ? CheckCircle2 : Circle;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => {
                  if (step.navigate) onNavigate?.(step.navigate);
                  else setTab?.(step.tab);
                }}
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
      <p className="mt-4 flex items-center gap-2 text-xs text-emerald-900/80">
        <CheckCircle2 size={14} />
        Chaque réception passe par le chemin canonique : stock, finance, mouvement et preuve.
      </p>
    </section>
  );
}
