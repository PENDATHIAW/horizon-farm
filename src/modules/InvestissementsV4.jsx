import { Edit, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import { fmtCurrency, toNumber } from '../utils/format';
import InvestissementsV3 from './InvestissementsV3';

const safeArray = (value) => Array.isArray(value) ? value : [];
const isHorizon = (bp = {}) => String(bp.nom || '').toLowerCase().includes('horizon farm');
const lineTotal = (line) => Math.round(toNumber(line.quantite) * toNumber(line.prix_unitaire));

const recommendedStarterPatch = (line) => {
  const label = String(line.designation || '').toLowerCase();
  if (label.includes('poulette') || (label.includes('pondeuse') && label.includes('sujet'))) {
    return { ...line, designation: 'Poussins pondeuses 1 jour', quantite: 4000, unite: 'sujets', prix_unitaire: 900, total: 3600000 };
  }
  if (label.includes('imprevus') || label.includes('imprévus')) {
    return { ...line, prix_unitaire: Math.min(toNumber(line.prix_unitaire), 300000), total: Math.min(toNumber(line.total), 300000) };
  }
  if (label.includes('fonds de roulement')) {
    return { ...line, prix_unitaire: Math.min(toNumber(line.prix_unitaire), 1000000), total: Math.min(toNumber(line.total), 1000000) };
  }
  return line;
};

function HorizonQuickEditor({
  businessPlans = [],
  bpInvestmentLines = [],
  bpRecurringCosts = [],
  bpRevenueProjections = [],
  bpFundingSources = [],
  onUpdateBusinessPlan,
  onDeleteBusinessPlan,
  onUpdateBpInvestmentLine,
  onDeleteBpInvestmentLine,
  onUpdateBpRecurringCost,
  onDeleteBpRecurringCost,
  onUpdateBpRevenueProjection,
  onDeleteBpRevenueProjection,
  onUpdateBpFundingSource,
  onDeleteBpFundingSource,
  onRefreshBusinessPlans,
}) {
  const [editing, setEditing] = useState(false);
  const [draftLines, setDraftLines] = useState([]);
  const [saving, setSaving] = useState(false);

  const plan = useMemo(() => safeArray(businessPlans).find(isHorizon), [businessPlans]);
  const lines = useMemo(() => plan ? safeArray(bpInvestmentLines).filter((line) => line.business_plan_id === plan.id) : [], [plan, bpInvestmentLines]);
  const costs = useMemo(() => plan ? safeArray(bpRecurringCosts).filter((row) => row.business_plan_id === plan.id) : [], [plan, bpRecurringCosts]);
  const projections = useMemo(() => plan ? safeArray(bpRevenueProjections).filter((row) => row.business_plan_id === plan.id) : [], [plan, bpRevenueProjections]);
  const fundings = useMemo(() => plan ? safeArray(bpFundingSources).filter((row) => row.business_plan_id === plan.id) : [], [plan, bpFundingSources]);
  const total = lines.reduce((acc, line) => acc + toNumber(line.total), 0);
  const draftTotal = draftLines.reduce((acc, line) => acc + toNumber(line.total), 0);

  useEffect(() => {
    if (plan) setDraftLines(lines.map((line) => ({ ...line })));
  }, [plan?.id, lines.length]);

  if (!plan) return null;

  const patchPoussins = async () => {
    setSaving(true);
    try {
      const patched = lines.map(recommendedStarterPatch);
      await Promise.all(patched.map((line) => onUpdateBpInvestmentLine?.(line.id, {
        designation: line.designation,
        quantite: line.quantite,
        unite: line.unite,
        prix_unitaire: line.prix_unitaire,
        total: line.total,
      })));
      await onUpdateBusinessPlan?.(plan.id, {
        nom: 'HORIZON FARM - 4000 poussins pondeuses + chair + ruminants + poivrons',
        objectif_production: '4000 poussins pondeuses à 900F/unité, ponte à partir de 5 mois, 200 poulets de chair, 10 bœufs, 5 moutons, 5 chèvres et poivrons.',
        metadata: { ...(plan.metadata || {}), pondeuses: 4000, prixPoussinPondeuse: 900, ageDebutPonteMois: 5, source_prix: 'modifiable dans Investissements' },
      });
      await onRefreshBusinessPlans?.();
      toast.success('BP Horizon Farm corrigé en poussins pondeuses à 900F');
    } catch (error) {
      toast.error(error.message || 'Correction impossible');
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      await Promise.all(draftLines.map((line) => onUpdateBpInvestmentLine?.(line.id, {
        designation: line.designation,
        categorie: line.categorie,
        quantite: toNumber(line.quantite),
        unite: line.unite,
        prix_unitaire: toNumber(line.prix_unitaire),
        total: lineTotal(line),
      })));
      await onRefreshBusinessPlans?.();
      setEditing(false);
      toast.success('Lignes Horizon Farm mises à jour');
    } catch (error) {
      toast.error(error.message || 'Mise à jour impossible');
    } finally {
      setSaving(false);
    }
  };

  const deleteWholePlan = async () => {
    const ok = window.confirm('Supprimer complètement ce BP Horizon Farm et ses lignes liées ?');
    if (!ok) return;
    setSaving(true);
    try {
      await Promise.all([
        ...lines.map((line) => onDeleteBpInvestmentLine?.(line.id)),
        ...costs.map((row) => onDeleteBpRecurringCost?.(row.id)),
        ...projections.map((row) => onDeleteBpRevenueProjection?.(row.id)),
        ...fundings.map((row) => onDeleteBpFundingSource?.(row.id)),
      ]);
      await onDeleteBusinessPlan?.(plan.id);
      await onRefreshBusinessPlans?.();
      toast.success('BP Horizon Farm supprimé. Tu peux le recréer après vérification des prix.');
    } catch (error) {
      toast.error(error.message || 'Suppression impossible');
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = (id, patch) => {
    setDraftLines((prev) => prev.map((line) => {
      if (line.id !== id) return line;
      const next = { ...line, ...patch };
      next.total = lineTotal(next);
      return next;
    }));
  };

  const rows = editing ? draftLines : lines;

  return (
    <div className="bg-white border-2 border-amber-300 rounded-2xl p-5 space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-amber-700">Correction directe dans le module</p>
          <h3 className="text-xl font-black text-[#2f2415]">Modifier le BP Horizon Farm créé</h3>
          <p className="text-sm text-[#7d6a4a] mt-1">Tu peux corriger les quantités, prix unitaires et totaux ici même, sans sortir du module Investissements.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2">
            <p className="text-xs text-[#8a7456]">Total actuel</p>
            <p className="font-black text-[#2f2415]">{fmtCurrency(total)}</p>
          </div>
          {editing && <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2"><p className="text-xs text-[#8a7456]">Total brouillon</p><p className="font-black text-[#2f2415]">{fmtCurrency(draftTotal)}</p></div>}
          <Btn icon={RefreshCw} variant="outline" onClick={patchPoussins} disabled={saving}>Corriger poussins 900F</Btn>
          {editing ? <Btn icon={Save} onClick={saveDraft} disabled={saving}>Enregistrer lignes</Btn> : <Btn icon={Edit} onClick={() => setEditing(true)}>Modifier les prix</Btn>}
          {editing && <Btn variant="outline" onClick={() => { setDraftLines(lines.map((line) => ({ ...line }))); setEditing(false); }}>Annuler</Btn>}
          <Btn icon={Trash2} variant="danger" onClick={deleteWholePlan} disabled={saving}>Supprimer BP</Btn>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#eadcc2]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]">
              <th className="px-3 py-2">Dépense</th>
              <th className="px-3 py-2">Catégorie</th>
              <th className="px-3 py-2">Qté</th>
              <th className="px-3 py-2">Unité</th>
              <th className="px-3 py-2">Prix unitaire</th>
              <th className="px-3 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((line) => (
              <tr key={line.id} className="border-t border-[#eadcc2]">
                <td className="px-3 py-2 min-w-[260px]">{editing ? <input className="w-full rounded-lg border border-[#d6c3a0] px-2 py-1" value={line.designation || ''} onChange={(e) => updateDraft(line.id, { designation: e.target.value })} /> : line.designation}</td>
                <td className="px-3 py-2 min-w-[120px]">{editing ? <input className="w-full rounded-lg border border-[#d6c3a0] px-2 py-1" value={line.categorie || ''} onChange={(e) => updateDraft(line.id, { categorie: e.target.value })} /> : line.categorie}</td>
                <td className="px-3 py-2 min-w-[90px]">{editing ? <input type="number" className="w-full rounded-lg border border-[#d6c3a0] px-2 py-1" value={line.quantite ?? 0} onChange={(e) => updateDraft(line.id, { quantite: e.target.value })} /> : line.quantite}</td>
                <td className="px-3 py-2 min-w-[90px]">{editing ? <input className="w-full rounded-lg border border-[#d6c3a0] px-2 py-1" value={line.unite || ''} onChange={(e) => updateDraft(line.id, { unite: e.target.value })} /> : line.unite}</td>
                <td className="px-3 py-2 min-w-[130px]">{editing ? <input type="number" className="w-full rounded-lg border border-[#d6c3a0] px-2 py-1" value={line.prix_unitaire ?? 0} onChange={(e) => updateDraft(line.id, { prix_unitaire: e.target.value })} /> : fmtCurrency(line.prix_unitaire)}</td>
                <td className="px-3 py-2 font-black text-[#2f2415] min-w-[130px]">{fmtCurrency(editing ? lineTotal(line) : line.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#8a7456]">Conseil: commence par corriger les gros postes ou supprime le BP puis recrée-le après vérification. Les lignes détaillées restent ensuite éditables dans la vue détail du Business Plan.</p>
    </div>
  );
}

export default function InvestissementsV4(props) {
  return (
    <div className="space-y-6">
      <HorizonQuickEditor {...props} />
      <InvestissementsV3 {...props} />
    </div>
  );
}
