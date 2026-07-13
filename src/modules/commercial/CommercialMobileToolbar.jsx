import { ShoppingCart, FileText, CreditCard, Truck, MessageCircle, Users } from 'lucide-react';

export default function CommercialMobileToolbar({ onNewSale, setTab, onCollect, onDeliver, onRelance }) {
  const actions = [
    { key: 'sale', label: 'Vente', icon: ShoppingCart, onClick: onNewSale, primary: true },
    { key: 'quote', label: 'Devis', icon: FileText, onClick: () => setTab?.('Ventes') },
    { key: 'pay', label: 'Encaisser', icon: CreditCard, onClick: onCollect || (() => setTab?.('Ventes')) },
    { key: 'deliver', label: 'Livrer', icon: Truck, onClick: onDeliver || (() => setTab?.('Livraisons')) },
    { key: 'relance', label: 'Relancer', icon: MessageCircle, onClick: onRelance || (() => setTab?.('Relances')) },
    { key: 'client', label: 'Client', icon: Users, onClick: () => setTab?.('Clients') },
  ];

  return (
    <div className="sticky bottom-2 z-20 md:hidden">
      <div className="rounded-2xl border border-line bg-white/95 backdrop-blur p-2 shadow-float grid grid-cols-3 gap-1">
        {actions.map(({ key, label, icon: Icon, onClick, primary }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className={`flex flex-col items-center justify-center rounded-xl px-2 py-2 text-meta font-semibold min-h-[52px] ${primary ? 'bg-earth text-white' : 'bg-card text-earth border border-line'}`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
