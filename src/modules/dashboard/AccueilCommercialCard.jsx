const QUICK_LINKS = [
  {
    id: 'commercial',
    label: 'Commercial',
    detail: 'Ventes, créances et livraisons',
    module: 'commercial',
    tab: 'Pilotage',
  },
  {
    id: 'centre',
    label: 'Centre décisionnel',
    detail: 'Urgences et opportunités',
    module: 'centre_ia',
    tab: 'Urgences & risques',
  },
  {
    id: 'investisseurs',
    label: 'Financements',
    detail: 'Dossier financeur',
    module: 'financements',
    tab: 'cockpit-dashboard',
  },
];

export default function AccueilCommercialCard({ onNavigate }) {
  if (!onNavigate) return null;

  return (
    <section className="rounded-xl border border-[#e5dcc8] bg-[#fffdf8] p-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-[#9a6b12]">Raccourcis pilotage</p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {QUICK_LINKS.map((link) => (
          <button
            key={link.id}
            type="button"
            onClick={() => onNavigate(link.module, { tab: link.tab })}
            className="rounded-lg border border-emerald-200/60 bg-emerald-400/10 p-2.5 text-left transition hover:border-emerald-300 hover:bg-emerald-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            <p className="text-[11px] font-black text-[#2f2415]">{link.label}</p>
            <p className="mt-0.5 text-[10px] text-[#5c4d38]">{link.detail}</p>
            <p className="mt-1.5 text-[10px] font-black text-emerald-800/70">Ouvrir →</p>
          </button>
        ))}
      </div>
    </section>
  );
}
