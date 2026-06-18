import { Database } from 'lucide-react';
import { setSimulatedDataMode } from '../../utils/uiPreferences.js';

export default function DashboardDataModeBanner({ simulated = false, startupMode = false, onEnabled }) {
  if (simulated || !startupMode) return null;

  const enableSimulated = () => {
    setSimulatedDataMode(true);
    onEnabled?.();
  };

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <Database size={18} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <p className="text-sm font-black text-amber-950">Mode données réelles — exploitation vide</p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-900">
              Les cartes affichent 0 car aucune vente, stock ou production n&apos;est encore saisie. Pour voir le scénario complet Horizon Farm (lots, ventes, trésorerie), activez les données simulées dans Paramètres.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={enableSimulated}
          className="shrink-0 rounded-xl bg-[#052e16] px-4 py-2.5 text-xs font-black text-white hover:bg-[#0a3d24]"
        >
          Activer données simulées
        </button>
      </div>
    </section>
  );
}
