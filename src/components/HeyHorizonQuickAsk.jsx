import { Bot } from 'lucide-react';
import { launchProductionQuestion } from '../utils/productionNavigation.js';

const PRESETS = {
  commercial: [
    { label: 'Créances', moduleId: 'commercial', tab: 'Clients' },
    { label: 'Objectif mois', moduleId: 'objectifs_croissance', tab: 'Performance' },
  ],
  elevage: [
    { label: 'Nouvelle bande', questionId: 'new_layer_band', moduleId: 'elevage' },
    { label: 'Bande chair', questionId: 'new_chair_band', moduleId: 'elevage' },
  ],
  centre_ia: [
    { label: 'À traiter', moduleId: 'centre_ia', tab: 'À traiter' },
    { label: 'Risques', moduleId: 'centre_ia', tab: 'Risques' },
    { label: 'Cycles', moduleId: 'centre_ia', tab: 'Cycles' },
    { label: 'Objectif mois', moduleId: 'objectifs_croissance', tab: 'Performance' },
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
          key={item.label}
          type="button"
          onClick={() => {
            if (item.questionId) {
              launchProductionQuestion({ questionId: item.questionId, moduleId: item.moduleId, onNavigate });
              return;
            }
            onNavigate?.(item.moduleId, { tab: item.tab });
          }}
          className="rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#2f2415] hover:bg-[#dcfce7]"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
