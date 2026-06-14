import { Wheat, Egg, HeartPulse, Skull, Scale, ShoppingCart } from 'lucide-react';

const AVICOLE_ACTIONS = [
  { key: 'feeding', label: 'Aliment', icon: Wheat, modal: 'feeding', primary: true },
  { key: 'eggs', label: 'Ponte', icon: Egg, modal: 'eggs' },
  { key: 'health', label: 'Santé', icon: HeartPulse, modal: 'health' },
  { key: 'weighing', label: 'Pesée', icon: Scale, modal: 'weighing' },
  { key: 'sale', label: 'Vente', icon: ShoppingCart, modal: 'sale' },
];

const ANIMAUX_ACTIONS = [
  { key: 'feeding', label: 'Aliment', icon: Wheat, modal: 'feeding', primary: true },
  { key: 'health', label: 'Santé', icon: HeartPulse, modal: 'health' },
  { key: 'weighing', label: 'Pesée', icon: Scale, modal: 'weighing' },
  { key: 'sale', label: 'Vente', icon: ShoppingCart, modal: 'sale' },
];

export default function ElevageMobileToolbar({ scope = 'avicole', onOpenWorkflow, onNavigate }) {
  const isAnimaux = scope === 'animaux';
  const actions = isAnimaux ? ANIMAUX_ACTIONS : AVICOLE_ACTIONS;

  const handleClick = (action) => {
    if (action.modal === 'sale') {
      onNavigate?.('commercial', { tab: 'Ventes' });
      return;
    }
    onOpenWorkflow?.(action.modal, { scope });
  };

  return (
    <div className="sticky bottom-2 z-20 md:hidden">
      <div className={`rounded-2xl border border-[#d6c3a0] bg-white/95 backdrop-blur p-2 shadow-lg grid gap-1 ${actions.length > 4 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {actions.map(({ key, label, icon: Icon, primary }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleClick(actions.find((a) => a.key === key))}
            className={`flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[10px] font-black min-h-[52px] ${primary ? 'bg-[#2f2415] text-white' : 'bg-[#fffdf8] text-[#2f2415] border border-[#eadcc2]'}`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
