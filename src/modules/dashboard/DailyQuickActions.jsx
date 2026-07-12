import { CircleMinus, CreditCard, Droplets, Egg, PackageCheck, Scale, Wheat } from 'lucide-react';
import { openFormModal } from '../../services/formModalManager.js';
import { makeId } from '../../utils/ids.js';

const ACTIONS = Object.freeze([
  { id: 'feeding', label: 'Aliment', icon: Wheat, module: 'elevage', tab: 'Production élevage', formType: 'daily_feeding' },
  { id: 'eggs', label: 'Œufs', icon: Egg, module: 'elevage', tab: 'Production élevage', formType: 'daily_eggs' },
  { id: 'mortality', label: 'Mortalité', icon: CircleMinus, module: 'elevage', tab: 'Production élevage', formType: 'daily_mortality' },
  { id: 'weighing', label: 'Pesée', icon: Scale, module: 'elevage', tab: 'Production élevage', formType: 'daily_weighing' },
  { id: 'irrigation', label: 'Irrigation', icon: Droplets, module: 'cultures', tab: 'Irrigation cultures', formType: 'daily_irrigation' },
  { id: 'harvest', label: 'Récolte', icon: PackageCheck, module: 'cultures', tab: 'Récoltes cultures', formType: 'daily_harvest' },
  { id: 'sale', label: 'Vente', icon: CreditCard, module: 'commercial', tab: 'Ventes', formType: 'sale_record' },
]);

export default function DailyQuickActions({ onNavigate }) {
  const open = (action) => {
    onNavigate?.(action.module, { tab: action.tab });
    window.setTimeout(() => {
      openFormModal({
        module: action.module,
        draft: {
          entry_id: makeId('ENTRY'),
          primary_module: action.module,
          form_type: action.formType,
          status: 'draft_ready',
          draft_fields: {},
        },
      });
    }, 180);
  };

  return (
    <section className="border-b border-[#eadcc2] pb-3" aria-label="Saisies du jour" data-testid="daily-quick-actions">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button key={action.id} type="button" onClick={() => open(action)} className="flex min-h-[42px] shrink-0 items-center gap-2 rounded-lg border border-[#d6c3a0] bg-white px-3 text-xs font-black text-[#2f2415] hover:bg-[#fffdf8]" data-testid={`daily-action-${action.id}`}>
              <Icon size={15} aria-hidden="true" /> {action.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
