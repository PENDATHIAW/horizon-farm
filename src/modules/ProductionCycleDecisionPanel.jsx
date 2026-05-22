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

function CycleLine({ label, date, qty, action }) {
  return <div className="rounded-xl border border-[#eadcc2] bg-white p-3 text-sm">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
      <p className="font-black text-[#2f2415]">{label}</p>
      <span className="text-xs font-black text-[#9a6b12]">{date || 'à planifier'}</span>
    </div>
    <p className="mt-1 text-xs text-[#8a7456]">Quantité : <b>{qty}</b></p>
    <p className="mt-1 text-xs text-[#7d6a4a] leading-relaxed">{action}</p>
  </div>;
}

function DecisionCard({ decision }) {
  const Icon = iconByActivity[decision.activity] || TrendingUp;
  return <article className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-3">
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-start gap-2 min-w-0">
        <span className="rounded-xl bg-white border border-[#eadcc2] p-2 text-[#9a6b12]"><Icon size={17} aria-hidden="true" /></span>
        <div className="min-w-0"><p className="font-black text-[#2f2415] leading-tight">{decision.title}</p><p className="text-xs text-[#8a7456] mt-1">Date cible : {decision.targetDate || 'à planifier'}</p></div>
      </div>
      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-black uppercase ${priorityClass[decision.priority] || priorityClass.moyenne}`}>{decision.priority}</span>
    </div>
    <p className="text-sm text-[#7d6a4a] leading-relaxed">{decision.recommendation}</p>
    <div className="rounded-xl border border-[#eadcc2] bg-white p-3 text-xs text-[#8a7456]"><b>Impact :</b> {decision.impact}</div>
  </article>;
}

export default function ProductionCycleDecisionPanel({ dataMap = {}, lots = [], animaux = [], productionLogs = [], onNavigate }) {
  const plan = buildProductionCyclePlan({
    ...dataMap,
    lots: lots?.length ? lots : dataMap.lots || dataMap.avicole || [],
    animaux: animaux?.length ? animaux : dataMap.animaux || [],
    productionLogs: productionLogs?.length ? productionLogs : dataMap.productionLogs || dataMap.production_oeufs_logs || [],
  });
  const chairRows = plan.chair.ramp.slice(0, 4);
  const bovinRows = plan.bovins.cycles.slice(0, 6);
  const layerRows = plan.pondeuses.bands.slice(0, 2);

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#9a6b12] font-black flex items-center gap-2"><TrendingUp size={15} aria-hidden="true" /> Cycles animaux & volaille</p>
          <h2 className="mt-1 text-xl font-black text-[#2f2415]">Piloter les bandes et ventes sans rupture</h2>
          <p className="mt-1 text-sm text-[#8a7456] leading-relaxed">Chair, bovins et pondeuses suivent la stratégie validée : bandes de 500, pipeline bovin 90 jours, 3 000 pondeuses au démarrage.</p>
        </div>
        <div className="flex flex-wrap gap-2"><Btn small variant="outline" icon={CalendarDays} onClick={() => onNavigate?.('avicole')}>Avicole</Btn><Btn small variant="outline" icon={Beef} onClick={() => onNavigate?.('animaux')}>Animaux</Btn></div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <MiniMetricCard icon={Drumstick} tone="warning" label="Chair" value="500 / bande" sub={`vente J+${plan.chair.cycleDays}`} />
        <MiniMetricCard icon={CalendarDays} tone="white" label="1ère vente chair" value={plan.chair.firstSaleDate} sub="après démarrage" />
        <MiniMetricCard icon={Beef} tone="info" label="Bovins" value="5 / mois" sub="M4 vend M1" />
        <MiniMetricCard icon={Egg} tone="success" label="Pondeuses départ" value={fmtNumber(plan.pondeuses.initialBandSize || 3000)} sub="puis décision réelle" />
        <MiniMetricCard icon={Egg} tone="warning" label="Œufs visés" value={`${fmtNumber(plan.pondeuses.targetEggsDay)}/j`} sub="objectif annuel" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <article className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-3">
          <div className="flex items-center gap-2"><span className="rounded-xl bg-white border border-[#eadcc2] p-2 text-[#9a6b12]"><Drumstick size={18} /></span><div><p className="font-black text-[#2f2415]">Poulets de chair</p><p className="text-xs text-[#8a7456]">Bandes de 500, vente à J+40, puis roulement.</p></div></div>
          {chairRows.map((row) => <CycleLine key={row.id} label={row.label} date={`achat ${row.launchDate} · vente ${row.expectedSaleDate}`} qty={`${row.placementQty} poussins`} action={row.action} />)}
        </article>

        <article className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-3">
          <div className="flex items-center gap-2"><span className="rounded-xl bg-white border border-[#eadcc2] p-2 text-[#9a6b12]"><Beef size={18} /></span><div><p className="font-black text-[#2f2415]">Bovins / embouche</p><p className="text-xs text-[#8a7456]">Pipeline 90 jours : M4 vend M1, M5 vend M2, M6 vend M3.</p></div></div>
          {bovinRows.map((row) => <CycleLine key={row.id} label={row.label} date={`achat M${row.purchaseMonth} · vente M${row.saleMonth}`} qty={`${row.qty} bovins`} action={row.action} />)}
        </article>

        <article className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-3">
          <div className="flex items-center gap-2"><span className="rounded-xl bg-white border border-[#eadcc2] p-2 text-[#9a6b12]"><Egg size={18} /></span><div><p className="font-black text-[#2f2415]">Pondeuses</p><p className="text-xs text-[#8a7456]">Démarrer 3 000, puis décider la 2e bande selon la ponte réelle.</p></div></div>
          <div className="grid grid-cols-2 gap-2">
            <MiniMetricCard tone="light" label="Pondeuses prévues" value={fmtNumber(plan.pondeuses.plannedOrCurrentLayers || plan.pondeuses.initialBandSize || 3000)} />
            <MiniMetricCard tone="light" label="Taux observé" value={`${plan.pondeuses.observedLayingRate || 0}%`} />
            <MiniMetricCard tone="light" label="Œufs / jour visés" value={fmtNumber(plan.pondeuses.targetEggsDay)} />
            <MiniMetricCard tone="light" label="Bande conseillée" value={fmtNumber(plan.pondeuses.recommendedNextBandSize || 0)} />
          </div>
          {layerRows.map((row) => <CycleLine key={row.id} label={row.label} date={row.launchDate} qty={`${fmtNumber(row.recommendedQty || 0)} pondeuses`} action={row.action} />)}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><b>Règle réforme :</b> {plan.pondeuses.reformRule}</div>
        </article>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {plan.decisions.map((decision) => <DecisionCard key={decision.id} decision={decision} />)}
      </div>
    </section>
  );
}