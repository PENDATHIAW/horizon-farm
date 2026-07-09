import { Package } from 'lucide-react';

/** Étape 1 — coquille. Matières / QC / fournisseurs enrichis en étape 2. */
export default function MaterialsSuppliersTab() {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-2">
      <p className="text-lg font-black text-[#2f2415] flex items-center gap-2">
        <Package size={20} /> Matières & fournisseurs
      </p>
      <p className="text-sm text-[#8a7456] leading-relaxed max-w-2xl">
        Disponible à l’étape suivante : matières premières, réceptions avec contrôle qualité,
        et enrichissement des fournisseurs existants (sans table parallèle).
      </p>
      <p className="text-sm text-[#2f2415]">
        En Mode Référence, continuez d’acheter les aliments du marché via <b>Achats & Stock</b>
        pour alimenter la référence Phase 1.
      </p>
    </section>
  );
}
