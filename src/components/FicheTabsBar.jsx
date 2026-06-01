/** Barre d'onglets pour fiches détail (animaux, lots avicoles, ventes, etc.). */
export default function FicheTabsBar({ tabs = [], active, onChange, className = '' }) {
  if (!tabs.length) return null;
  return (
    <div className={`overflow-x-auto ${className}`}>
      <div className="flex min-w-max gap-1.5 rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-1.5">
        {tabs.map((tab) => {
          const id = typeof tab === 'string' ? tab : tab.id;
          const label = typeof tab === 'string' ? tab : tab.label;
          const badge = typeof tab === 'object' ? tab.badge : null;
          const selected = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition whitespace-nowrap sm:text-sm sm:px-4 ${selected ? 'bg-[#2f2415] text-white' : 'text-[#8a7456] hover:bg-white hover:text-[#2f2415]'}`}
            >
              {label}
              {badge > 0 ? (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${selected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
