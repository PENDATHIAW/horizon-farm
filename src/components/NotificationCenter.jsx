import { AlertTriangle, Bell, CheckCircle, WifiOff } from 'lucide-react';

export default function NotificationCenter({ alerts = [], online = true }) {
  const items = [
    !online && { icon: WifiOff, label: 'Mode hors ligne', color: 'text-red-400' },
    ...alerts,
  ].filter(Boolean);

  return (
    <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Bell size={16} className="text-amber-400" />
        <p className="font-semibold text-[#2f2415]">Centre notifications</p>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-[#8a7456] flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-400" />
            Aucune alerte prioritaire.
          </div>
        ) : (
          items.slice(0, 5).map((item, index) => {
            const Icon = item.icon || AlertTriangle;
            return (
              <div key={`${item.label}-${index}`} className="flex items-center gap-2 text-sm text-[#7d6a4a]">
                <Icon size={14} className={item.color || 'text-amber-400'} />
                {item.label}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
