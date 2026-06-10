import { Wheat, Egg, HeartPulse, Skull, Scale, ShoppingCart } from 'lucide-react';

export default function ElevageMobileToolbar({ onOpenWorkflow, onNavigate }) {
  const actions = [
    { key: 'feeding', label: 'Aliment', icon: Wheat, onClick: () => onOpenWorkflow?.('feeding'), primary: true },
    { key: 'eggs', label: 'Ponte', icon: Egg, onClick: () => onOpenWorkflow?.('eggs') },
    { key: 'health', label: 'Santé', icon: HeartPulse, onClick: () => onOpenWorkflow?.('health') },
    { key: 'mortality', label: 'Mortalité', icon: Skull, onClick: () => onOpenWorkflow?.('mortality') },
    { key: 'weighing', label: 'Pesée', icon: Scale, onClick: () => onOpenWorkflow?.('weighing') },
    { key: 'sale', label: 'Vente', icon: ShoppingCart, onClick: () => onNavigate?.('commercial', { tab: 'Ventes' }) },
  ];

  return (
    <div className="sticky bottom-2 z-20 md:hidden">
      <div className="rounded-2xl border border-[#d6c3a0] bg-white/95 backdrop-blur p-2 shadow-lg grid grid-cols-3 gap-1">
        {actions.map(({ key, label, icon: Icon, onClick, primary }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
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
