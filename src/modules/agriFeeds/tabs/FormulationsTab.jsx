import { FlaskConical } from 'lucide-react';

/** Étape 1 — coquille. Formules / versions / coûts en étape 2. */
export default function FormulationsTab() {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-2">
      <p className="text-lg font-black text-[#2f2415] flex items-center gap-2">
        <FlaskConical size={20} /> Formulations
      </p>
      <p className="text-sm text-[#8a7456] leading-relaxed max-w-2xl">
        Les formules, versions et coûts théoriques seront ouverts en Mode Pilote interne (étape 2).
        Une formule ne pourra pas devenir commercialisable sans test, coût réel et validation humaine.
      </p>
    </section>
  );
}
