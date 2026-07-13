import { BookOpen, Calculator } from 'lucide-react';
import FarmCostSettingsPanel from '../FarmCostSettingsPanel.jsx';
import { UNIFIED_COST_FORMULA } from '../../services/unifiedCostService.js';

const MODULE_LABELS = {
  elevage: 'Élevage',
  finance_pilotage: 'Finance & Pilotage',
  achats_stock: 'Achats & Stock',
  commercial: 'Commercial',
  dashboard: 'Accueil',
};

/** Onglet Annexe — paramètres coûts + formules unifiées par module. */
export default function ModuleAnnexeTab({ moduleId = 'elevage', onNavigate }) {
  const label = MODULE_LABELS[moduleId] || 'Module ERP';

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-card p-6">
        <p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2"><BookOpen size={15} /> Annexe — {label}</p>
        <h2 className="mt-1 text-xl font-semibold text-earth">Un seul coût affiché partout</h2>
        <p className="mt-1 text-sm text-slate">
          Animaux, lots avicoles, fiches, opportunités de vente et consolidation Finance utilisent le même calcul de coût.
          Modifiez les rations et prix par défaut ci-dessous pour éviter les écarts de caisse.
        </p>
      </section>

      <FarmCostSettingsPanel />

      <section className="rounded-2xl border border-line bg-white p-4 space-y-3">
        <p className="font-semibold text-earth text-sm flex items-center gap-2"><Calculator size={15} className="text-positive" /> Formules appliquées</p>
        <div className="rounded-xl border border-line bg-card p-3 text-sm text-earth whitespace-pre-wrap">{UNIFIED_COST_FORMULA}</div>
        <ul className="space-y-2 text-xs text-slate">
          <li><b className="text-earth">Animal :</b> achat + max(journal alimentation, champ fiche) + santé (événements + champ) + charges directes. Prix vente proposé = max(coût + marge %, poids × prix/kg Annexe ou fiche, prix marché).</li>
          <li><b className="text-earth">Lot chair :</b> poussins + alimentation + santé + emballage/transport si renseignés.</li>
          <li><b className="text-earth">Lot ponte :</b> amortissement sujets + alimentation période + santé + emballage/transport ; coût / œuf et / tablette.</li>
          <li><b className="text-earth">Finance :</b> max(coûts champs fiche, moteur unifié logs) pour animaux et avicole — anti double comptage avec trésorerie.</li>
          <li><b className="text-earth">Vente :</b> marge = chiffre d’affaires − coût direct.</li>
        </ul>
        {onNavigate ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => onNavigate('elevage', { tab: 'Animaux' })} className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-positive hover:bg-positive-bg">Voir Animaux</button>
            <button type="button" onClick={() => onNavigate('finance_pilotage', { tab: 'Rentabilité' })} className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-positive hover:bg-positive-bg">Rentabilité Finance</button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
