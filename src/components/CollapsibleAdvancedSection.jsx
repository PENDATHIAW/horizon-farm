import { ChevronDown, ChevronRight } from 'lucide-react';

export default function CollapsibleAdvancedSection({ eyebrow = 'Analyse avancée', title, description, open, onToggle, children }) {
  return (
    <section className="rounded-3xl border border-line bg-white shadow-card overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-3 p-6 text-left">
        <div>
          <p className="text-xs uppercase tracking-normal text-slate">{eyebrow}</p>
          <h3 className="text-lg font-semibold text-earth">{title}</h3>
          {description ? <p className="mt-1 text-sm text-slate">{description}</p> : null}
        </div>
        {open ? <ChevronDown className="text-slate shrink-0" /> : <ChevronRight className="text-slate shrink-0" />}
      </button>
      {open ? <div className="border-t border-line p-6 space-y-6 bg-card/40">{children}</div> : null}
    </section>
  );
}
