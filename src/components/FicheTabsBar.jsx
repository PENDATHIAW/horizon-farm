/** Barre d'onglets pour fiches détail (animaux, lots avicoles, ventes, etc.). */
export default function FicheTabsBar({ tabs = [], active, onChange, className = '' }) {
  if (!tabs.length) return null;
  return (
    <div className={`overflow-x-auto ${className}`}>
      <div className="flex min-w-max gap-2 rounded-2xl border border-line bg-card p-2">
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
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition whitespace-nowrap sm:text-sm sm:px-4 ${selected ? 'bg-earth text-white' : 'text-slate hover:bg-white hover:text-earth'}`}
            >
              {label}
              {badge > 0 ? (
                <span className={`rounded-full px-2 py-1 text-meta font-semibold leading-none ${selected ? 'bg-white/20 text-white' : 'bg-vigilance-bg text-horizon-dark'}`}>
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
