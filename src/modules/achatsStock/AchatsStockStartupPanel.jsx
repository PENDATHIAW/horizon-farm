import { CheckCircle2, Circle, Package, ShoppingBag, Users, Warehouse } from 'lucide-react';

const STEPS = [
  { id: 'supplier', label: 'Créer un premier fournisseur', tab: 'Fournisseurs', icon: Users },
  { id: 'article', label: 'Créer un premier article', tab: 'Stock', icon: Package },
  { id: 'reception', label: 'Enregistrer une première réception', tab: 'Stock', icon: ShoppingBag },
  { id: 'proof', label: 'Ajouter une preuve', tab: 'Annexe', icon: Warehouse },
  { id: 'threshold', label: 'Définir un seuil minimum', tab: 'Stock', icon: Package },
  { id: 'sales', label: 'Connecter le stock aux ventes', tab: 'Stock', icon: ShoppingBag },
  { id: 'debt', label: 'Suivre les dettes fournisseurs', tab: 'Fournisseurs', icon: Users },
];

export default function AchatsStockStartupPanel({ setTab, onNavigate }) {
  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-800">Premiers pas</p>
      <h2 className="mt-1 text-xl font-black text-[#2f2415]">Votre module Achats &amp; Stock est prêt.</h2>
      <p className="mt-2 text-sm text-[#6b8a6b]">Suivez cette checklist pour structurer vos approvisionnements.</p>
      <ul className="mt-5 space-y-2">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => {
                  if (step.tab === 'commercial') onNavigate?.('commercial');
                  else setTab?.(step.tab);
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-[#eadcc2] bg-white px-4 py-3 text-left transition hover:border-emerald-300"
              >
                <Circle size={18} className="shrink-0 text-[#8a7456]" />
                <Icon size={16} className="shrink-0 text-emerald-700" />
                <span className="text-sm font-black text-[#2f2415]">{index + 1}. {step.label}</span>
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
