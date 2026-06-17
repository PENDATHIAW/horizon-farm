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
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5">
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><BookOpen size={15} /> Annexe — {label}</p>
        <h2 className="mt-1 text-xl font-black text-[#2f2415]">Un seul coût affiché partout</h2>
        <p className="mt-1 text-sm text-[#8a7456]">
          Animaux, lots avicoles, fiches, opportunités de vente et consolidation Finance utilisent le même calcul de coût.
          Modifiez les rations et prix par défaut ci-dessous pour éviter les écarts de caisse.
        </p>
      </section>

      <FarmCostSettingsPanel />

      <section className="rounded-2xl border border-[#eadcc2] bg-white p-4 space-y-3">
        <p className="font-black text-[#2f2415] text-sm flex items-center gap-2"><Calculator size={15} className="text-emerald-700" /> Formules appliquées</p>
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#2f2415] whitespace-pre-wrap">{UNIFIED_COST_FORMULA}</div>
        <ul className="space-y-2 text-xs text-[#7d6a4a]">
          <li><b className="text-[#2f2415]">Animal :</b> achat + max(journal alimentation, champ fiche) + santé (événements + champ) + charges directes. Prix vente proposé = max(coût + marge %, poids × prix/kg Annexe ou fiche, prix marché).</li>
          <li><b className="text-[#2f2415]">Lot chair :</b> poussins + alimentation + santé + emballage/transport si renseignés.</li>
          <li><b className="text-[#2f2415]">Lot ponte :</b> amortissement sujets + alimentation période + santé + emballage/transport ; coût / œuf et / tablette.</li>
          <li><b className="text-[#2f2415]">Finance :</b> max(coûts champs fiche, moteur unifié logs) pour animaux et avicole — anti double comptage avec trésorerie.</li>
          <li><b className="text-[#2f2415]">Vente :</b> marge = chiffre d’affaires − coût direct.</li>
        </ul>
        {onNavigate ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => onNavigate('elevage', { tab: 'Animaux' })} className="rounded-lg border border-[#d6c3a0] bg-white px-3 py-1.5 text-xs font-black text-emerald-800 hover:bg-emerald-50">Voir Animaux</button>
            <button type="button" onClick={() => onNavigate('finance_pilotage', { tab: 'Rentabilité' })} className="rounded-lg border border-[#d6c3a0] bg-white px-3 py-1.5 text-xs font-black text-emerald-800 hover:bg-emerald-50">Rentabilité Finance</button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
