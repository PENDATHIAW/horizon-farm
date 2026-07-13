import { BookOpen } from 'lucide-react';
import { MARGIN_GLOSSARY_ENTRIES } from '../utils/marginGlossary.js';

/**
 * Panneau repliable — clarifie les libellés « marge » selon le contexte ERP.
 */
export default function MarginGlossaryPanel({ className = '', defaultOpen = false }) {
  return (
    <details
      className={`rounded-2xl border border-line bg-card p-4 ${className}`}
      open={defaultOpen}
    >
      <summary className="cursor-pointer font-semibold text-sm text-earth flex items-center gap-2">
        <BookOpen size={16} className="text-horizon-dark" aria-hidden="true" />
        Glossaire des marges
      </summary>
      <ul className="mt-3 space-y-3 text-sm text-slate">
        {MARGIN_GLOSSARY_ENTRIES.map((entry) => (
          <li key={entry.key} className="rounded-xl border border-line bg-white px-3 py-2">
            <p className="font-semibold text-earth">{entry.title}</p>
            <p className="mt-1 text-xs font-semibold text-slate">{entry.formula}</p>
            <p className="mt-1 text-xs leading-relaxed">{entry.usage}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
