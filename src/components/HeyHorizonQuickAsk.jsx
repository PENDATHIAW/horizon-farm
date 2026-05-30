import { Bot } from 'lucide-react';
import { launchHeyHorizonAssistant } from '../utils/dashboardHeyHorizon.js';

const PRESETS = {
  commercial: [
    { label: 'Créances', query: 'Quels clients me doivent de l\'argent ?' },
    { label: 'Objectif mois', query: 'Où en suis-je sur mon objectif du mois ?' },
  ],
  elevage: [
    { label: 'Lots rentables', query: 'Quels sont mes lots les moins rentables ?' },
    { label: 'Risques', query: 'Quels sont mes risques du mois ?' },
  ],
};

export default function HeyHorizonQuickAsk({
  moduleKey = 'commercial',
  onNavigate,
  onOpenAssistant,
  className = '',
}) {
  const items = PRESETS[moduleKey] || PRESETS.commercial;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-[#9a6b12]">
        <Bot size={14} /> Hey Horizon
      </span>
      {items.map((item) => (
        <button
          key={item.query}
          type="button"
          onClick={() => launchHeyHorizonAssistant({
            query: item.query,
            sourceLabel: moduleKey,
            onNavigate,
            onOpenAssistant,
          })}
          className="rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#2f2415] hover:bg-[#dcfce7]"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
