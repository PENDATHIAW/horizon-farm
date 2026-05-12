import { ChevronDown, ChevronRight } from 'lucide-react';

export default function CollapsibleAdvancedSection({ eyebrow = 'Analyse avancée', title, description, open, onToggle, children }) {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white shadow-sm overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-3 p-5 text-left">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">{eyebrow}</p>
          <h3 className="text-lg font-black text-[#2f2415]">{title}</h3>
          {description ? <p className="mt-1 text-sm text-[#8a7456]">{description}</p> : null}
        </div>
        {open ? <ChevronDown className="text-[#8a7456] shrink-0" /> : <ChevronRight className="text-[#8a7456] shrink-0" />}
      </button>
      {open ? <div className="border-t border-[#eadcc2] p-5 space-y-6 bg-[#fffdf8]/40">{children}</div> : null}
    </section>
  );
}
