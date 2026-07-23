import { Banknote, Bird, ClipboardList, ShoppingCart, Sprout, Wallet } from 'lucide-react';
import { ASSISTANT_KEY_ACTIONS } from '../../config/assistantKeyActions.config.js';
import { REGISTRE_PAR_ID } from '../../config/formulaires20s.config.js';
import { openDailyQuickEntry } from '../../utils/dailyQuickEntry.js';

const MODULE_ICONS = {
  elevage: Bird,
  cultures: Sprout,
  commercial: ShoppingCart,
  achats_stock: Banknote,
  finance_pilotage: Wallet,
  activite_suivi: ClipboardList,
};

/**
 * Centre de commande de l'Assistant : pour chaque module, les deux gestes les
 * plus déterminants. Un clic ouvre la saisie rapide ou le bon onglet.
 */
export default function AssistantKeyActionsPanel({ onNavigate }) {
  const runAction = (moduleId, action) => {
    if (action.quickId && REGISTRE_PAR_ID[action.quickId]) {
      openDailyQuickEntry(REGISTRE_PAR_ID[action.quickId], onNavigate);
      return;
    }
    onNavigate?.(moduleId, action.navigate?.tab ? { tab: action.navigate.tab } : undefined);
  };

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-line bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-earth">Actions clés</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ASSISTANT_KEY_ACTIONS.map((group) => {
          const Icon = MODULE_ICONS[group.module] || ClipboardList;
          return (
            <div key={group.module} className="rounded-3xl border border-line bg-white p-5 shadow-card">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-positive-bg text-leaf">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <p className="font-semibold text-earth">{group.label}</p>
              </div>
              <div className="mt-4 space-y-2">
                {group.actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => runAction(group.module, action)}
                    className="flex w-full min-h-11 flex-col items-start gap-0.5 rounded-2xl border border-line bg-card px-4 py-3 text-left transition hover:border-leaf hover:bg-positive-bg"
                  >
                    <span className="text-sm font-semibold text-earth">{action.label}</span>
                    {action.hint ? <span className="text-meta leading-tight text-slate">{action.hint}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
