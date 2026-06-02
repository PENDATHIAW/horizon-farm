import { ERP_OPERATIONAL_PILLARS } from '../../utils/productionStockCatalog';

export default function AchatsStockPillarsBanner() {
  return (
    <section className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-widest text-[#9a6b12]">Alignement ERP — 4 domaines</p>
      <p className="mt-1 text-sm text-[#8a7456]">
        Ce module gère le <b>stock physique</b> et les <b>achats</b>. La production (œufs, viande chair, viande animaux, récoltes) se saisit dans Élevage ou Cultures, puis impacte l’inventaire ici.
      </p>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {ERP_OPERATIONAL_PILLARS.map((pillar) => (
          <div
            key={pillar.id}
            className={`rounded-xl border p-3 text-xs ${pillar.id === 'stock' ? 'border-[#2f2415] bg-[#2f2415] text-white' : 'border-[#eadcc2] bg-white text-[#2f2415]'}`}
          >
            <p className="font-black">{pillar.label}</p>
            <p className={`mt-1 leading-relaxed ${pillar.id === 'stock' ? 'text-white/85' : 'text-[#8a7456]'}`}>{pillar.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
