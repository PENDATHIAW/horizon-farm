import { AlertTriangle, BrainCircuit, CheckCircle2, Target, TrendingUp, Zap } from 'lucide-react';
import { buildDecisionCenterPlan } from '../services/growthDecisionEngine';
import { buildAnimalDecisionProfile } from '../services/animalDecisionEngine';
import { buildAvicoleLotDecision } from '../services/avicoleDecisionEngine';
import { buildCultureDecisionProfile } from '../services/cultureDecisionEngine';
import { fmtCurrency } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const high = (value = '') => String(value || '').toLowerCase().includes('haute');

function ImpactMini({ icon: Icon, label, value, detail, tone = 'neutral' }) {
  const cls = tone === 'good'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-700'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-[#eadcc2] bg-[#fffdf8] text-[#7d6a4a]';

  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <Icon size={18} />
      <p className="mt-2 text-2xl font-black text-[#2f2415]">{value}</p>
      <p className="font-black text-[#2f2415]">{label}</p>
      <p className="mt-1 text-xs">{detail}</p>
    </div>
  );
}

export default function ImpactDecisionBridge(props) {
  const dataMap = {
    animaux: arr(props.animaux),
    avicole: arr(props.lots || props.avicole),
    lots: arr(props.lots || props.avicole),
    cultures: arr(props.cultures),
    stock: arr(props.stocks || props.stock),
    stocks: arr(props.stocks || props.stock),
    clients: arr(props.clients),
    fournisseurs: arr(props.fournisseurs),
    investissements: arr(props.investissements),
    business_plans: arr(props.businessPlans || props.business_plans),
    sales_orders: arr(props.salesOrders || props.sales_orders),
    salesOrders: arr(props.salesOrders || props.sales_orders),
    payments: arr(props.payments),
    finances: arr(props.transactions || props.finances),
    transactions: arr(props.transactions || props.finances),
    production_oeufs_logs: arr(props.productionLogs || props.production_oeufs_logs),
    productionLogs: arr(props.productionLogs || props.production_oeufs_logs),
    alimentation_logs: arr(props.alimentationLogs || props.alimentation_logs),
    alimentationLogs: arr(props.alimentationLogs || props.alimentation_logs),
  };

  const plan = buildDecisionCenterPlan(dataMap);
  const animalProfiles = dataMap.animaux.map((animal) => buildAnimalDecisionProfile(animal));
  const avicoleProfiles = dataMap.avicole.map((lot) => buildAvicoleLotDecision(lot, dataMap.productionLogs));
  const cultureProfiles = dataMap.cultures.map((culture) => buildCultureDecisionProfile(culture));

  const animalCashRisk = animalProfiles.filter((item) => item.ageDays > item.targetDelay).length;
  const weighingActions = animalProfiles.filter((item) => item.nextWeighingDate).length;
  const avicoleHigh = avicoleProfiles.filter((item) => high(item.priority)).length;
  const cultureHigh = cultureProfiles.filter((item) => high(item.priority)).length;
  const totalDecisionSignals = plan.recommendations.length + animalCashRisk + avicoleHigh + cultureHigh;
  const goal = plan.goals.global;

  const proofs = [
    goal.attainment < 100 ? `Objectif mensuel à ${goal.attainment}% : ${fmtCurrency(goal.remaining)} restent à vendre.` : 'Objectif mensuel atteint ou dépassé : sécuriser le cash et préparer la croissance.',
    plan.recommendations.length ? `${plan.recommendations.length} recommandation(s) d’investissement ou de vente générées.` : null,
    animalCashRisk ? `${animalCashRisk} animal(aux) dépassent le délai cible : cash immobilisé à arbitrer.` : null,
    avicoleHigh ? `${avicoleHigh} lot(s) avicoles demandent une décision : vente, ponte, santé ou réforme.` : null,
    cultureHigh ? `${cultureHigh} culture(s) nécessitent une décision : sol, eau, rendement ou vente.` : null,
  ].filter(Boolean);

  return (
    <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black flex items-center gap-2">
            <BrainCircuit size={16} /> Impact du Centre décisionnel
          </p>
          <h2 className="mt-1 text-xl font-black text-[#2f2415]">Ce que l’IA apporte concrètement à la ferme</h2>
          <p className="mt-1 text-sm text-[#8a7456]">
            Cette zone relie Impact & Valeur ERP au Centre décisionnel : objectifs, risques détectés, décisions terrain et investissements pilotés.
          </p>
        </div>
        <button
          type="button"
          onClick={() => props.onNavigate?.('centre_ia')}
          className="rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white hover:bg-[#3d2f1d]"
        >
          Voir Centre décisionnel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <ImpactMini icon={Target} label="Objectif CA" value={`${goal.attainment}%`} detail={`${fmtCurrency(goal.realized)} réalisés / ${fmtCurrency(goal.monthTarget)}`} tone={goal.attainment >= 90 ? 'good' : 'warning'} />
        <ImpactMini icon={TrendingUp} label="Reste à vendre" value={fmtCurrency(goal.remaining)} detail={`Objectif hebdo ${fmtCurrency(goal.weekTarget)}`} tone={goal.remaining > 0 ? 'warning' : 'good'} />
        <ImpactMini icon={Zap} label="Signaux IA" value={totalDecisionSignals} detail="recommandations + risques terrain" tone={totalDecisionSignals ? 'warning' : 'good'} />
        <ImpactMini icon={AlertTriangle} label="Cash immobilisé" value={animalCashRisk} detail="animaux au-delà du délai cible" tone={animalCashRisk ? 'danger' : 'good'} />
        <ImpactMini icon={CheckCircle2} label="Pesées pilotées" value={weighingActions} detail="dates et poids attendus proposés" tone="neutral" />
      </div>

      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <p className="font-black text-[#2f2415]">Preuves de valeur IA</p>
        <ul className="mt-3 space-y-2 text-sm text-[#7d6a4a]">
          {proofs.map((item) => (
            <li key={item} className="flex gap-2">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
