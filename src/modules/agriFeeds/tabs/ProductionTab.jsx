import { Factory } from 'lucide-react';

/** Étape 1 — coquille. OF / lots / QR en étape 3. */
export default function ProductionTab() {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-2">
      <p className="text-lg font-black text-[#2f2415] flex items-center gap-2">
        <Factory size={20} /> Production
      </p>
      <p className="text-sm text-[#8a7456] leading-relaxed max-w-2xl">
        Les matières et formules sont prêtes (étape 2). Ordres de fabrication, lots produits,
        stock produits finis et QR seront livrés à l’étape 3.
      </p>
    </section>
  );
}
