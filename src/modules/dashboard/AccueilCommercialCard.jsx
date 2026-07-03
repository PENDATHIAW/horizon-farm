export default function AccueilCommercialCard({ onNavigate }) {
  return (
    <section className="rounded-xl border border-emerald-200/60 bg-emerald-400/10 p-3 text-left">
      <p className="text-[10px] font-black tracking-wide text-emerald-800/80">COMMERCIAL</p>
      <p className="mt-2 text-sm font-black text-[#2f2415]">Ventes, clients et créances</p>
      <ul className="mt-1 space-y-0.5 text-[11px] text-[#5c4d38]">
        <li>• Suivre le CA et les commandes ouvertes</li>
        <li>• Relancer les créances clients</li>
        <li>• Contrôler les livraisons à préparer</li>
      </ul>
      {onNavigate ? (
        <button type="button" onClick={() => onNavigate('commercial', { tab: 'Pilotage' })} className="mt-2 text-[10px] font-black text-emerald-800/70">
          Ouvrir le module →
        </button>
      ) : null}
    </section>
  );
}
