import { Building2, CalendarDays, PackagePlus, Plus, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import { fmtCurrency, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import InvestissementsV4 from './InvestissementsV4';

const safeArray = (value) => Array.isArray(value) ? value : [];
const isHorizon = (bp = {}) => String(bp.nom || '').toLowerCase().includes('horizon farm');
const RENT_AMOUNT = 500000;

const ONE_TIME_EXPENSES = [
  { designation: 'Achat poussins pondeuses', categorie: 'cheptel', quantite: 4000, unite: 'sujets', prix_unitaire: 900 },
  { designation: 'Achat poussins chair', categorie: 'cheptel', quantite: 200, unite: 'sujets', prix_unitaire: 350 },
  { designation: 'Achat bœufs embouche', categorie: 'cheptel', quantite: 10, unite: 'têtes', prix_unitaire: 350000 },
  { designation: 'Achat moutons embouche', categorie: 'cheptel', quantite: 5, unite: 'têtes', prix_unitaire: 50000 },
  { designation: 'Achat chèvres embouche', categorie: 'cheptel', quantite: 5, unite: 'têtes', prix_unitaire: 20000 },
  { designation: 'Construction / aménagement poulailler', categorie: 'infrastructure', quantite: 1, unite: 'forfait', prix_unitaire: 0 },
  { designation: 'Poussinière / chauffage / lampes', categorie: 'equipement', quantite: 1, unite: 'lot', prix_unitaire: 0 },
  { designation: 'Pondoirs', categorie: 'equipement', quantite: 70, unite: 'pcs', prix_unitaire: 0 },
  { designation: 'Abreuvoirs', categorie: 'equipement', quantite: 60, unite: 'pcs', prix_unitaire: 0 },
  { designation: 'Mangeoires', categorie: 'equipement', quantite: 60, unite: 'pcs', prix_unitaire: 0 },
  { designation: 'Réservoir / pompe / eau', categorie: 'infrastructure', quantite: 1, unite: 'forfait', prix_unitaire: 0 },
  { designation: 'Magasin stock aliments / intrants', categorie: 'infrastructure', quantite: 1, unite: 'forfait', prix_unitaire: 0 },
  { designation: 'Clôture / portail / sécurité', categorie: 'infrastructure', quantite: 1, unite: 'forfait', prix_unitaire: 0 },
  { designation: 'Irrigation culture', categorie: 'equipement', quantite: 1, unite: 'lot', prix_unitaire: 0 },
  { designation: 'Matériel agricole et manutention', categorie: 'equipement', quantite: 1, unite: 'lot', prix_unitaire: 0 },
  { designation: 'Transport initial et installation', categorie: 'logistique', quantite: 1, unite: 'forfait', prix_unitaire: 0 },
  { designation: 'Fonds de roulement initial', categorie: 'fonds_roulement', quantite: 1, unite: 'forfait', prix_unitaire: 0 },
  { designation: 'Démarches administratives / autorisations', categorie: 'administratif', quantite: 1, unite: 'forfait', prix_unitaire: 0 },
  { designation: 'Imprévus de démarrage', categorie: 'imprevus', quantite: 1, unite: 'forfait', prix_unitaire: 0 },
];

const MONTHLY_EXPENSES = [
  { designation: 'Location champ prêt à exploiter', categorie: 'location_champ', montant_mensuel: 500000 },
  { designation: 'Location bâtiment / poulailler', categorie: 'location_batiment', montant_mensuel: 0 },
  { designation: 'Aliment pondeuses en production', categorie: 'alimentation', montant_mensuel: 0 },
  { designation: 'Aliment croissance pondeuses avant ponte', categorie: 'alimentation', montant_mensuel: 0 },
  { designation: 'Aliment poulets de chair', categorie: 'alimentation', montant_mensuel: 0 },
  { designation: 'Aliment bœufs / moutons / chèvres', categorie: 'alimentation', montant_mensuel: 0 },
  { designation: 'Salaires / main d’œuvre', categorie: 'salaires', montant_mensuel: 0 },
  { designation: 'Santé, vaccins et vétérinaire', categorie: 'sante', montant_mensuel: 0 },
  { designation: 'Énergie, eau et nettoyage', categorie: 'energie', montant_mensuel: 0 },
  { designation: 'Litière, désinfection, biosécurité', categorie: 'biosécurité', montant_mensuel: 0 },
  { designation: 'Transport, livraison, commercialisation', categorie: 'logistique', montant_mensuel: 0 },
  { designation: 'Emballages œufs / sacs / consommables', categorie: 'consommables', montant_mensuel: 0 },
  { designation: 'Maintenance équipements et bâtiments', categorie: 'maintenance', montant_mensuel: 0 },
  { designation: 'Téléphone, internet, logiciel, administration', categorie: 'administratif', montant_mensuel: 0 },
  { designation: 'Remboursement financement', categorie: 'financement', montant_mensuel: 0 },
  { designation: 'Imprévus exploitation', categorie: 'imprevus', montant_mensuel: 0 },
];

function getPlan(businessPlans) {
  return safeArray(businessPlans).find(isHorizon) || safeArray(businessPlans)[0];
}

function FieldRentalPatch({ businessPlans = [], bpRecurringCosts = [], bpRevenueProjections = [], onCreateBpRecurringCost, onUpdateBpRecurringCost, onUpdateBpRevenueProjection, onRefreshBusinessPlans }) {
  const [saving, setSaving] = useState(false);
  const plan = useMemo(() => getPlan(businessPlans), [businessPlans]);
  const costs = useMemo(() => plan ? safeArray(bpRecurringCosts).filter((row) => row.business_plan_id === plan.id) : [], [plan, bpRecurringCosts]);
  const projections = useMemo(() => plan ? safeArray(bpRevenueProjections).filter((row) => row.business_plan_id === plan.id) : [], [plan, bpRevenueProjections]);
  const rentCost = costs.find((row) => String(row.designation || '').toLowerCase().includes('location champ'));

  if (!plan) return null;

  const applyRental = async () => {
    setSaving(true);
    try {
      const previousRent = rentCost ? toNumber(rentCost.montant_mensuel) : 0;
      const delta = RENT_AMOUNT - previousRent;
      if (rentCost) {
        await onUpdateBpRecurringCost?.(rentCost.id, { designation: 'Location champ prêt à exploiter', categorie: 'location_champ', montant_mensuel: RENT_AMOUNT, frequence: 'mensuelle' });
      } else {
        await onCreateBpRecurringCost?.({ id: makeId('BPCOST'), business_plan_id: plan.id, designation: 'Location champ prêt à exploiter', categorie: 'location_champ', montant_mensuel: RENT_AMOUNT, frequence: 'mensuelle' });
      }
      if (delta !== 0) {
        await Promise.all(projections.map((row) => {
          const charges = toNumber(row.charges_estimees) + delta;
          return onUpdateBpRevenueProjection?.(row.id, { charges_estimees: charges, marge_estimee: toNumber(row.ca_estime) - charges });
        }));
      }
      await onRefreshBusinessPlans?.();
      toast.success('Location champ 500 000F/mois ajoutée aux charges mensuelles');
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
            <p className="text-xs uppercase tracking-widest text-emerald-700">Charge mensuelle terrain</p>
            <h3 className="text-lg font-black text-[#2f2415]">Champ déjà prêt loué à {fmtCurrency(RENT_AMOUNT)} / mois</h3>
            <p className="text-sm text-[#7d6a4a] mt-1">Je ne supprime plus les postes d’investissement existants. La location est ajoutée comme dépense mensuelle; tu gardes ou retires les autres lignes selon le BP.</p>
          </div>
        </div>
        <Btn icon={RefreshCw} onClick={applyRental} disabled={saving}>Ajouter / mettre à jour location</Btn>
      </div>
    </div>
  );
}

function ExpenseCatalog({ businessPlans = [], onCreateBpInvestmentLine, onCreateBpRecurringCost, onRefreshBusinessPlans }) {
  const [savingKey, setSavingKey] = useState('');
  const plan = useMemo(() => getPlan(businessPlans), [businessPlans]);

  if (!plan) return null;

  const addOneTime = async (item) => {
    setSavingKey(`one-${item.designation}`);
    try {
      await onCreateBpInvestmentLine?.({
        id: makeId('BPLI'), business_plan_id: plan.id, designation: item.designation, categorie: item.categorie,
        quantite: item.quantite, unite: item.unite, prix_unitaire: item.prix_unitaire,
        total: Math.round(toNumber(item.quantite) * toNumber(item.prix_unitaire)),
      });
      await onRefreshBusinessPlans?.();
      toast.success('Dépense ponctuelle ajoutée au BP');
    } catch (error) {
      toast.error(error.message || 'Ajout impossible');
    } finally {
      setSavingKey('');
    }
  };

  const addMonthly = async (item) => {
    setSavingKey(`month-${item.designation}`);
    try {
      await onCreateBpRecurringCost?.({
        id: makeId('BPCOST'), business_plan_id: plan.id, designation: item.designation, categorie: item.categorie,
        montant_mensuel: item.montant_mensuel, frequence: 'mensuelle',
      });
      await onRefreshBusinessPlans?.();
      toast.success('Dépense mensuelle ajoutée au BP');
    } catch (error) {
      toast.error(error.message || 'Ajout impossible');
    } finally {
      setSavingKey('');
    }
  };

  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5 space-y-5">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8a7456]">Bibliothèque BP</p>
        <h3 className="text-xl font-black text-[#2f2415]">Ajouter des dépenses au BP sans sortir du module</h3>
        <p className="text-sm text-[#7d6a4a] mt-1">Un BP agricole doit séparer les dépenses ponctuelles et les dépenses mensuelles. Tu ajoutes seulement ce qui concerne ton projet, puis tu modifies les prix dans le tableau de correction.</p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3"><PackagePlus size={18} className="text-[#9a6b12]" /><h4 className="font-black text-[#2f2415]">Dépenses ponctuelles / investissement initial</h4></div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {ONE_TIME_EXPENSES.map((item) => (
            <button key={item.designation} type="button" onClick={() => addOneTime(item)} disabled={Boolean(savingKey)} className="text-left rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 hover:border-[#b6975f]">
              <p className="font-black text-[#2f2415]">{item.designation}</p>
              <p className="text-xs text-[#8a7456] mt-1">{item.categorie} · {item.quantite} {item.unite} · {fmtCurrency(item.prix_unitaire)}</p>
              <p className="text-xs font-semibold text-[#9a6b12] mt-2"><Plus size={12} className="inline" /> Ajouter</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3"><CalendarDays size={18} className="text-[#9a6b12]" /><h4 className="font-black text-[#2f2415]">Dépenses mensuelles / exploitation</h4></div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {MONTHLY_EXPENSES.map((item) => (
            <button key={item.designation} type="button" onClick={() => addMonthly(item)} disabled={Boolean(savingKey)} className="text-left rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 hover:border-[#b6975f]">
              <p className="font-black text-[#2f2415]">{item.designation}</p>
              <p className="text-xs text-[#8a7456] mt-1">{item.categorie} · {fmtCurrency(item.montant_mensuel)} / mois</p>
              <p className="text-xs font-semibold text-[#9a6b12] mt-2"><Plus size={12} className="inline" /> Ajouter</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function InvestissementsV5(props) {
  return (
    <div className="space-y-6">
      <FieldRentalPatch {...props} />
      <ExpenseCatalog {...props} />
      <InvestissementsV4 {...props} />
    </div>
  );
}
