import { AlertTriangle, CheckCircle2, PiggyBank, ShieldCheck, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import { autoEnrichCharges } from '../services/chargeAssignmentQualityService';
import { computeGlobalProfitability } from '../services/globalProfitabilityService';
import { recommendOwnerSalary } from '../services/ownerSalaryRecommendationService';
import { fmtCurrency } from '../utils/format';
import { makeId } from '../utils/ids';

const today = () => new Date().toISOString().slice(0, 10);
function Mini({ icon: Icon, label, value, hint, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}><p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8a7456]"><Icon size={14} /> {label}</p><p className={`mt-2 text-xl font-black ${danger ? 'text-red-700' : 'text-[#2f2415]'}`}>{value}</p>{hint ? <p className="mt-1 text-xs text-[#8a7456]">{hint}</p> : null}</div>;
}

export default function OwnerSalaryRecommendationPanel({
  transactions = [],
  salesOrders = [],
  payments = [],
  animaux = [],
  lots = [],
  cultures = [],
  stocks = [],
  sante = [],
  alimentationLogs = [],
  fournisseurs = [],
  investissements = [],
  businessEvents = [],
  onCreateFinanceTransaction,
  onRefreshFinances,
  onCreateBusinessEvent,
  onRefreshBusinessEvents,
}) {
  const enriched = autoEnrichCharges({ transactions, animaux, lots, cultures, stocks });
  const profit = computeGlobalProfitability({
    transactions: enriched,
    salesOrders,
    payments,
    animaux,
    lots,
    cultures,
    stocks,
    sante,
    alimentationLogs,
    fournisseurs,
    investissements,
    businessEvents,
  });
  const recommendation = recommendOwnerSalary({
    operatingResult: profit.operatingResult,
    cashAfterInvestments: profit.cashResultAfterInvestments,
    existingOwnerSalary: profit.ownerSalary,
    existingOwnerWithdrawals: profit.ownerWithdrawals,
  });
  const canValidate = recommendation.recommended > 0 && typeof onCreateFinanceTransaction === 'function';
  const negativeContext = profit.operatingResult <= 0 || profit.cashResultAfterInvestments <= 0;
  const validateSalary = async () => {
    if (!canValidate) return toast.error('Aucune rémunération propriétaire à valider');
    const id = makeId('FIN'); const salaryAmount = recommendation.recommended;
    await onCreateFinanceTransaction?.({ id, type: 'sortie', date: today(), categorie: 'Rémunération propriétaire', libelle: 'Salaire propriétaire recommandé', description: `Rémunération propriétaire validée. Réserve conservée: ${Math.round(recommendation.requiredReserve)}.`, montant: salaryAmount, amount: salaryAmount, profit_bucket: 'remuneration_proprietaire', module_lie: 'rh', source_module: 'finances', entity_type: 'structure', assignment_status: 'validated_owner_salary', assignment_confidence: 100, impact_resultat: true, impact_cash: true, statut: 'valide' });
    await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'owner_salary_validated', module_source: 'finances', entity_type: 'finance_transaction', entity_id: id, title: 'Rémunération propriétaire validée', description: `${salaryAmount} validé comme salaire propriétaire.`, event_date: today(), severity: 'info', amount: salaryAmount, saisies_evitees: 2 });
    await Promise.allSettled([onRefreshFinances?.(), onRefreshBusinessEvents?.()]);
    toast.success('Rémunération propriétaire validée');
  };
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Wallet size={20} /> Rémunération propriétaire recommandée</p><p className="mt-1 text-sm text-[#8a7456]">Proposition basée sur le résultat consolidé Finance, le cash disponible et une réserve de sécurité.</p></div><div className={`${recommendation.status === 'valider' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : recommendation.status === 'prudence' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'} rounded-2xl border px-4 py-3 text-sm font-black`}>{recommendation.status === 'valider' ? <CheckCircle2 size={15} className="inline" /> : negativeContext ? <AlertTriangle size={15} className="inline" /> : <ShieldCheck size={15} className="inline" />} {recommendation.reason}</div></div><div className="grid grid-cols-1 md:grid-cols-4 gap-3"><Mini icon={PiggyBank} label="Salaire recommandé" value={fmtCurrency(recommendation.recommended)} hint={recommendation.recommended > 0 ? 'à valider manuellement' : 'non recommandé maintenant'} danger={recommendation.recommended <= 0} /><Mini icon={ShieldCheck} label="Réserve gardée" value={fmtCurrency(recommendation.requiredReserve)} hint="35% du résultat positif" /><Mini icon={Wallet} label="Cash après réserve" value={fmtCurrency(recommendation.cashAvailableAfterReserve)} hint="avant nouveau salaire" danger={recommendation.cashAvailableAfterReserve <= 0} /><Mini icon={CheckCircle2} label="Salaire déjà validé" value={fmtCurrency(recommendation.alreadySalary)} hint="période courante" /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Mini icon={TrendingResultIcon} label="Résultat exploitation consolidé" value={fmtCurrency(profit.operatingResult)} hint="après charges consolidées" danger={profit.operatingResult <= 0} /><Mini icon={Wallet} label="Cash après investissements" value={fmtCurrency(profit.cashResultAfterInvestments)} hint="base de décision rémunération" danger={profit.cashResultAfterInvestments <= 0} /></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]">La rémunération propriétaire utilise maintenant les mêmes sources que Finance : ventes, paiements, animaux, avicole, cultures, santé, alimentation, stock, fournisseurs, investissements et événements métier.</div><div className="flex flex-wrap gap-2"><Btn icon={Wallet} onClick={validateSalary} disabled={!canValidate}>Valider rémunération propriétaire</Btn>{!canValidate ? <span className="text-sm text-[#8a7456] self-center">Aucun montant recommandé pour le moment.</span> : null}</div></section>;
}

function TrendingResultIcon(props) {
  return <AlertTriangle {...props} />;
}
