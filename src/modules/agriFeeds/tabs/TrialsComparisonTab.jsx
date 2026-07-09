import { TestTubes } from 'lucide-react';

/** Étape 1 — coquille. Essais / KPI / décisions en étape 4. */
export default function TrialsComparisonTab() {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-2">
      <p className="text-lg font-black text-[#2f2415] flex items-center gap-2">
        <TestTubes size={20} /> Tests & comparaison
      </p>
      <p className="text-sm text-[#8a7456] leading-relaxed max-w-2xl">
        Les essais sur animaux Horizon Farm et la comparaison détaillée vs Phase 1
        arriveront à l’étape 4. La comparaison partielle est déjà disponible dans
        l’onglet Référence Phase 1.
      </p>
    </section>
  );
}
