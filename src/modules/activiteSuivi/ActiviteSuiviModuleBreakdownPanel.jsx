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
  commercial: ['commercial', { tab: 'Pilotage' }],
  finance_pilotage: ['finance_pilotage', { tab: 'Résumé' }],
  finances: ['finance_pilotage', { tab: 'Trésorerie' }],
  elevage: ['elevage', { tab: 'Lots & bandes' }],
  achats_stock: ['achats_stock', { tab: 'Inventaire' }],
  stock: ['achats_stock', { tab: 'Inventaire' }],
  animaux: ['elevage', { tab: 'Lots & bandes' }],
  avicole: ['elevage', { tab: 'Lots & bandes' }],
};

export default function ActiviteSuiviModuleBreakdownPanel({ breakdown = [], onNavigate }) {
  if (!breakdown.length) return null;

  return (
    <ActiviteSection
      title="Charge par module source"
      subtitle="D'où viennent les alertes et tâches ouvertes - ouvrir le module métier pour traiter la cause."
    >
      <div className="divide-y divide-line/60">
        {breakdown.map(([mod, count]) => (
          <div key={mod} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-semibold text-earth flex items-center gap-2">
              <GitBranch size={14} className="text-horizon-dark" />
              {MODULE_LABELS[mod] || mod}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-horizon-dark">{count} ouvert(s)</span>
              {onNavigate && NAV_FOR[mod] ? (
                <button
                  type="button"
                  onClick={() => onNavigate(...NAV_FOR[mod])}
                  className="rounded-lg border border-line bg-white px-2 py-1 text-xs font-semibold text-earth"
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
