import { Beef, CalendarDays, Drumstick, Egg, TrendingUp } from 'lucide-react';
import Btn from '../components/Btn';
import MiniMetricCard from '../components/MiniMetricCard.jsx';
import { buildProductionCyclePlan } from '../services/productionCyclePlanService';
import { fmtNumber } from '../utils/format';

const priorityClass = {
  haute: 'border-red-200 bg-red-50 text-red-700',
  moyenne: 'border-amber-200 bg-amber-50 text-amber-700',
  basse: 'border-sky-200 bg-sky-50 text-sky-700',
};
const iconByActivity = { poulets_chair: Drumstick, bovins: Beef, oeufs: Egg };

export default function ProductionCycleDecisionPanel({ dataMap = {}, lots = [], animaux = [], productionLogs = [], onNavigate }) {
  const plan = buildProductionCyclePlan({
    ...dataMap,
    lots: lots?.length ? lots : dataMap.lots || dataMap.avicole || [],
    animaux: animaux?.length ? animaux : dataMap.animaux || [],
    productionLogs: productionLogs?.length ? productionLogs : dataMap.productionLogs || dataMap.production_oeufs_logs || [],
  });

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#9a6b12] font-black flex items-center gap-2"><TrendingUp size={15} aria-hidden="true" /> Plan d’investissement & cycles</p>
          <h2 className="mt-1 text-xl font-black text-[#2f2415]">Tenir le prévisionnel sans rupture de production</h2>
          <p className="mt-1 text-sm text-[#8a7456] leading-relaxed">Chair, bœufs et pondeuses sont cadencés pour vendre régulièrement et garder des œufs toute l’année.</p>
        </div>
        <Btn small variant="outline" icon={CalendarDays} onClick={() => onNavigate?.('investissements')}>Plan complet</Btn>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <MiniMetricCard icon={Drumstick} tone="warning" label="Chair" value="500 / 15 j" sub={`stable dès ${plan.chair.steadySaleStartDate}`} />
        <MiniMetricCard icon={CalendarDays} tone="white" label="1ère vente chair" value={plan.chair.firstSaleDate} sub="cycle 45 jours" />
        <MiniMetricCard icon={Beef} tone="info" label="Bœufs départ" value="5" sub={`vente ${plan.bovins.firstSaleDate}`} />
        <MiniMetricCard icon={Egg} tone="success" label="Œufs visés" value={`${fmtNumber(plan.pondeuses.targetEggsDay)}/j`} sub="toute l’année" />
        <MiniMetricCard icon={Egg} tone="warning" label="Bande pondeuse" value={fmtNumber(plan.pondeuses.recommendedNextBandSize)} sub="à sécuriser" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {plan.decisions.map((decision) => {
          const Icon = iconByActivity[decision.activity] || TrendingUp;
          return <article key={decision.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-3"><div className="flex items-start justify-between gap-2"><div className="flex items-start gap-2 min-w-0"><span className="rounded-xl bg-white border border-[#eadcc2] p-2 text-[#9a6b12]"><Icon size={17} aria-hidden="true" /></span><div className="min-w-0"><p className="font-black text-[#2f2415] leading-tight">{decision.title}</p><p className="text-xs text-[#8a7456] mt-1">Date cible : {decision.targetDate || 'à planifier'}</p></div></div><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-black uppercase ${priorityClass[decision.priority] || priorityClass.moyenne}`}>{decision.priority}</span></div><p className="text-sm text-[#7d6a4a] leading-relaxed">{decision.recommendation}</p><div className="rounded-xl border border-[#eadcc2] bg-white p-3 text-xs text-[#8a7456]"><b>Impact :</b> {decision.impact}</div></article>;
        })}
      </div>
    </section>
  );
}
