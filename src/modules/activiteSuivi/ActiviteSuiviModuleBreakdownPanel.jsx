import { GitBranch } from 'lucide-react';
import { ActiviteSection } from './activiteSuiviUi.jsx';

const MODULE_LABELS = {
  commercial: 'Commercial',
  finance_pilotage: 'Finance',
  elevage: 'Élevage',
  achats_stock: 'Achats & Stock',
  animaux: 'Animaux',
  avicole: 'Avicole',
  stock: 'Stock',
  general: 'Général',
};

const NAV_FOR = {
  commercial: ['commercial', { tab: 'Résumé' }],
  finance_pilotage: ['finance_pilotage', { tab: 'Résumé' }],
  finances: ['finance_pilotage', { tab: 'Trésorerie' }],
  elevage: ['elevage', { tab: 'Résumé' }],
  achats_stock: ['achats_stock', { tab: 'Résumé' }],
  stock: ['achats_stock', { tab: 'Stock' }],
  animaux: ['elevage', { tab: 'Animaux' }],
  avicole: ['elevage', { tab: 'Avicole' }],
};

export default function ActiviteSuiviModuleBreakdownPanel({ breakdown = [], onNavigate }) {
  if (!breakdown.length) return null;

  return (
    <ActiviteSection
      title="Charge par module source"
      subtitle="D'où viennent les alertes et tâches ouvertes — ouvrir le module métier pour traiter la cause."
    >
      <div className="divide-y divide-[#eadcc2]/60">
        {breakdown.map(([mod, count]) => (
          <div key={mod} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-black text-[#2f2415] flex items-center gap-2">
              <GitBranch size={14} className="text-[#9a6b12]" />
              {MODULE_LABELS[mod] || mod}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-amber-700">{count} ouvert(s)</span>
              {onNavigate && NAV_FOR[mod] ? (
                <button
                  type="button"
                  onClick={() => onNavigate(...NAV_FOR[mod])}
                  className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black text-[#2f2415]"
                >
                  Ouvrir
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </ActiviteSection>
  );
}
