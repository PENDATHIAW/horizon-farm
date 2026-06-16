import { BookOpen } from 'lucide-react';
import { MARGIN_GLOSSARY_ENTRIES } from '../utils/marginGlossary.js';

/**
 * Panneau repliable — clarifie les libellés « marge » selon le contexte ERP.
 */
export default function MarginGlossaryPanel({ className = '', defaultOpen = false }) {
  return (
    <details
      className={`rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 ${className}`}
      open={defaultOpen}
    >
      <summary className="cursor-pointer font-black text-sm text-[#2f2415] flex items-center gap-2">
        <BookOpen size={16} className="text-[#9a6b12]" aria-hidden="true" />
        Glossaire des marges
      </summary>
      <ul className="mt-3 space-y-3 text-sm text-[#5c4a32]">
        {MARGIN_GLOSSARY_ENTRIES.map((entry) => (
          <li key={entry.key} className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2">
            <p className="font-black text-[#2f2415]">{entry.title}</p>
            <p className="mt-0.5 text-xs font-bold text-[#8a7456]">{entry.formula}</p>
            <p className="mt-1 text-xs leading-relaxed">{entry.usage}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
