import { CalendarDays, Target, TrendingUp, WalletCards } from 'lucide-react';
import ObjectivePerformanceCard from '../components/ObjectivePerformanceCard';
import SectionHeader from '../components/SectionHeader';
import { buildDecisionCenterPlan } from '../services/growthDecisionEngine';
import { fmtCurrency } from '../utils/format';

export default function ObjectifsCroissance({ dataMap = {}, onNavigate }) {
  const plan = buildDecisionCenterPlan(dataMap);
  const goal = plan.goals.global;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Objectifs & Croissance"
        sub="Objectifs CA, suivi mensuel, stratégie commerciale, investissements pilotés et trajectoire de croissance."
        actions={
          <button
            type="button"
            onClick={() => onNavigate?.('centre_ia')}
            className="rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white hover:bg-[#3d2f1d]"
          >
            Voir Centre décisionnel
          </button>
        }
      />

      <ObjectivePerformanceCard dataMap={dataMap} activity="global" onNavigate={onNavigate} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi icon={Target} label="Objectif annuel" value={fmtCurrency(goal.annualTarget)} sub="Base de pilotage" />
        <Kpi icon={CalendarDays} label="Objectif mensuel" value={fmtCurrency(goal.monthTarget)} sub={plan.goals.currentMonth} />
        <Kpi icon={TrendingUp} label="CA réalisé" value={fmtCurrency(goal.realized)} sub={`${goal.attainment}% atteint`} />
        <Kpi icon={WalletCards} label="Encaissement" value={fmtCurrency(goal.encaisse)} sub={`${goal.cashRate}% du CA`} />
      </div>

      <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Objectifs par activité</p>
          <h3 className="text-xl font-black text-[#2f2415] mt-1">Où concentrer l’effort commercial ?</h3>
          <p className="text-sm text-[#8a7456] mt-1">
            Le Centre décisionnel compare les activités pour savoir quoi pousser, quoi optimiser et où investir.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {plan.goals.activities.map((activity) => (
            <div key={activity.activity} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
              <p className="text-xs font-black text-[#8a7456]">{activity.label}</p>
              <p className="text-2xl font-black text-[#2f2415] mt-1">{activity.attainment}%</p>
              <p className="text-xs text-[#8a7456] mt-1">Objectif {fmtCurrency(activity.target)}</p>
              <p className="text-xs text-[#8a7456]">Réalisé {fmtCurrency(activity.realized)}</p>
              <p className="text-xs text-[#8a7456]">Reste {fmtCurrency(activity.remaining)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-[#d6c3a0] bg-[#2f2415] text-white p-5 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#f8e8b6] font-black">Investissements pilotés</p>
          <h3 className="text-xl font-black mt-1">Quand investir, comment investir, sur quoi investir</h3>
          <p className="text-sm text-[#f8e8b6]/80 mt-1">
            Horizon distingue vente immédiate, optimisation de capacité, investissement futur et compensation court terme.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {plan.recommendations.map((item) => (
            <div key={item.id} className="rounded-2xl bg-white/10 border border-white/10 p-4">
              <span className="text-[10px] uppercase tracking-wider text-[#f8e8b6] font-black">{item.priority}</span>
              <p className="text-sm font-black mt-1">{item.title}</p>
              <p className="text-[11px] text-white/70 mt-1">{item.timing}</p>
              <p className="text-xs text-white/80 mt-3">{item.recommendation}</p>
              <button
                type="button"
                onClick={() => onNavigate?.('investissements')}
                className="mt-3 w-full rounded-xl bg-[#f6c453] px-2 py-1.5 text-[10px] font-black text-[#2f2415] hover:bg-[#ffe08a]"
              >
                Préparer business plan
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
      <Icon size={18} className="text-[#c9a96a]" />
      <p className="text-xs text-[#8a7456] mt-3">{label}</p>
      <p className="text-lg font-black text-[#2f2415] mt-1">{value}</p>
      <p className="text-xs text-[#8a7456] mt-1">{sub}</p>
    </div>
  );
}
