import { Utensils } from 'lucide-react';
import StockFeedingCostPlanner from '../StockFeedingCostPlanner.jsx';

/** Planificateur en lecture seule : la distribution réelle se fait dans Élevage › Alimentation. */
export default function StockFeedingElevageHint(props) {
  const { onNavigate, ...plannerProps } = props;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="flex items-center gap-2 font-black">
          <Utensils size={16} aria-hidden="true" />
          Distribution aliment
        </p>
        <p className="mt-2 leading-relaxed">
          Le retrait physique d’aliment et le coût lié se font dans <b>Élevage › Alimentation</b>. Ci-dessous : simulateur de ration (sans écriture stock).
        </p>
        <button
          type="button"
          onClick={() => onNavigate?.('elevage', { tab: 'Alimentation' })}
          className="mt-3 rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white"
        >
          Ouvrir Élevage › Alimentation
        </button>
      </div>
      <StockFeedingCostPlanner {...plannerProps} simulateOnly onOpenUseFood={null} />
    </div>
  );
}
