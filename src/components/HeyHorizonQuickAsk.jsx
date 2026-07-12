import { Bot } from 'lucide-react';
import { launchProductionQuestion } from '../utils/productionNavigation.js';
import { commercialHeyHorizonPresets, launchCommercialHeyHorizonQuestion } from '../utils/commercialHeyHorizon.js';
import { centreHeyHorizonPresets, launchCentreHeyHorizonQuestion } from '../utils/centreHeyHorizon.js';

const PRESETS = {
  commercial: commercialHeyHorizonPresets(),
  elevage: [
    { label: 'Nouvelle bande', questionId: 'new_layer_band', moduleId: 'elevage' },
    { label: 'Bande chair', questionId: 'new_chair_band', moduleId: 'elevage' },
  ],
  centre_decisionnel: centreHeyHorizonPresets(),
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
          key={item.id || item.label}
          type="button"
          onClick={() => {
            if (moduleKey === 'centre_decisionnel' && item.query) {
              launchCentreHeyHorizonQuestion({ questionId: item.id, onNavigate, onOpenAssistant, mode: 'tab' });
              return;
            }
            if (moduleKey === 'commercial' && item.query) {
              launchCommercialHeyHorizonQuestion({ questionId: item.id, onNavigate, onOpenAssistant });
              return;
            }
            if (item.questionId) {
              launchProductionQuestion({ questionId: item.questionId, moduleId: item.moduleId, onNavigate });
              return;
            }
            onNavigate?.(item.moduleId, { tab: item.tab, heyHorizonQuery: item.query });
          }}
          className="rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#2f2415] hover:bg-[#dcfce7]"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
