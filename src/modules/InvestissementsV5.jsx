import { Building2, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import { fmtCurrency, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import InvestissementsV4 from './InvestissementsV4';

const safeArray = (value) => Array.isArray(value) ? value : [];
const isHorizon = (bp = {}) => String(bp.nom || '').toLowerCase().includes('horizon farm');
const RENT_AMOUNT = 500000;

function FieldRentalPatch({
  businessPlans = [],
  bpInvestmentLines = [],
  bpRecurringCosts = [],
  bpRevenueProjections = [],
  onCreateBpRecurringCost,
  onUpdateBpRecurringCost,
  onUpdateBpInvestmentLine,
  onUpdateBpRevenueProjection,
  onRefreshBusinessPlans,
}) {
  const [saving, setSaving] = useState(false);
  const plan = useMemo(() => safeArray(businessPlans).find(isHorizon), [businessPlans]);
  const lines = useMemo(() => plan ? safeArray(bpInvestmentLines).filter((line) => line.business_plan_id === plan.id) : [], [plan, bpInvestmentLines]);
  const costs = useMemo(() => plan ? safeArray(bpRecurringCosts).filter((row) => row.business_plan_id === plan.id) : [], [plan, bpRecurringCosts]);
  const projections = useMemo(() => plan ? safeArray(bpRevenueProjections).filter((row) => row.business_plan_id === plan.id) : [], [plan, bpRevenueProjections]);
  const rentCost = costs.find((row) => String(row.designation || '').toLowerCase().includes('location champ'));
  const fieldLines = lines.filter((line) => {
    const label = String(line.designation || '').toLowerCase();
    return label.includes('préparation champ') || label.includes('preparation champ') || label.includes('irrigation goutte') || label.includes('champ poivrons');
  });
  const fieldInitialTotal = fieldLines.reduce((acc, line) => acc + toNumber(line.total), 0);

  if (!plan) return null;

  const applyRental = async () => {
    setSaving(true);
    try {
      const previousRent = rentCost ? toNumber(rentCost.montant_mensuel) : 0;
      const delta = RENT_AMOUNT - previousRent;
      if (rentCost) {
        await onUpdateBpRecurringCost?.(rentCost.id, {
          designation: 'Location champ prêt à exploiter',
          categorie: 'location_champ',
          montant_mensuel: RENT_AMOUNT,
          frequence: 'mensuelle',
        });
      } else {
        await onCreateBpRecurringCost?.({
          id: makeId('BPCOST'),
          business_plan_id: plan.id,
          designation: 'Location champ prêt à exploiter',
          categorie: 'location_champ',
          montant_mensuel: RENT_AMOUNT,
          frequence: 'mensuelle',
        });
      }
      await Promise.all(fieldLines.map((line) => onUpdateBpInvestmentLine?.(line.id, {
        ...line,
        prix_unitaire: 0,
        total: 0,
        designation: `${line.designation} (remplacé par location mensuelle)`,
      })));
      if (delta !== 0) {
        await Promise.all(projections.map((row) => {
          const charges = toNumber(row.charges_estimees) + delta;
          return onUpdateBpRevenueProjection?.(row.id, {
            charges_estimees: charges,
            marge_estimee: toNumber(row.ca_estime) - charges,
          });
        }));
      }
      await onRefreshBusinessPlans?.();
      toast.success('Location champ 500 000F/mois appliquée au BP Horizon Farm');
    } catch (error) {
      toast.error(error.message || 'Mise à jour location champ impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border-2 border-emerald-300 rounded-2xl p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Building2 size={18} /></div>
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-700">Hypothèse terrain corrigée</p>
            <h3 className="text-lg font-black text-[#2f2415]">Champ déjà prêt loué à {fmtCurrency(RENT_AMOUNT)} / mois</h3>
            <p className="text-sm text-[#7d6a4a] mt-1">Ce n’est pas un investissement initial: c’est une charge mensuelle. Les postes initiaux de préparation/irrigation champ peuvent être mis à 0 et remplacés par cette location.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2">
            <p className="text-xs text-[#8a7456]">Postes champ initiaux détectés</p>
            <p className="font-black text-[#2f2415]">{fmtCurrency(fieldInitialTotal)}</p>
          </div>
          <Btn icon={RefreshCw} onClick={applyRental} disabled={saving}>Appliquer location champ</Btn>
        </div>
      </div>
    </div>
  );
}

export default function InvestissementsV5(props) {
  return (
    <div className="space-y-6">
      <FieldRentalPatch {...props} />
      <InvestissementsV4 {...props} />
    </div>
  );
}
