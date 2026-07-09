import { ShoppingBag } from 'lucide-react';

/** Étape 1 — coquille. Ventes validées / réachats en étape 5. */
export default function CommercialTab() {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-2">
      <p className="text-lg font-black text-[#2f2415] flex items-center gap-2">
        <ShoppingBag size={20} /> Commercial AGRI FEEDS
      </p>
      <p className="text-sm text-[#8a7456] leading-relaxed max-w-2xl">
        La vente progressive (Mode 2B) n’accepte que les formules commercialisables,
        après test interne et validation humaine. Ce flux sera branché sur le module
        Commercial existant à l’étape 5.
      </p>
    </section>
  );
}
