import { BookOpen, HelpCircle } from 'lucide-react';
import { DECISION_METHODOLOGY_SECTIONS, ENTITY_GLOSSARY } from '../../services/decisionMethodology.js';

export default function DecisionAnnexeTab({ moduleLabel = 'Centre décisionnel' }) {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5">
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2">
          <BookOpen size={15} /> Annexe — méthode & calculs
        </p>
        <h2 className="text-xl font-black text-[#2f2415] mt-1">Comprendre les chiffres du {moduleLabel}</h2>
        <p className="text-sm text-[#8a7456] mt-1">
          Cette annexe documente les formules, seuils et vocabulaire utilisés par les moteurs. Les dates de fêtes sont calculées automatiquement (calendrier hijri).
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {DECISION_METHODOLOGY_SECTIONS.map((section) => (
          <section key={section.id} className="rounded-2xl border border-[#eadcc2] bg-white p-4 space-y-2">
            <h3 className="font-black text-[#2f2415] text-sm">{section.title}</h3>
            <ul className="space-y-1.5">
              {section.items.map((line) => (
                <li key={line} className="text-xs text-[#7d6a4a] leading-relaxed flex gap-2">
                  <span className="text-emerald-700 shrink-0">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="font-black text-emerald-900 flex items-center gap-2 text-sm">
          <HelpCircle size={15} /> Glossaire métier
        </p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {ENTITY_GLOSSARY.map((row) => (
            <div key={row.term} className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
              <p className="text-xs font-black text-[#2f2415]">{row.term}</p>
              <p className="text-[11px] text-[#7d6a4a] mt-0.5">{row.definition}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
