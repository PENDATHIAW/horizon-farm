import { AlertTriangle, ArrowRight, CalendarDays, Package, Target, TrendingUp, Truck, Users, WalletCards } from 'lucide-react';
import ObjectivePerformanceCard from '../components/ObjectivePerformanceCard';
import SectionHeader from '../components/SectionHeader';
import { buildDecisionCenterPlan } from '../services/growthDecisionEngine';
import { buildRelationshipStockScores } from '../services/relationshipStockScoringEngine';
import { fmtCurrency } from '../utils/format';
import ObjectiveDecisionSummary from './ObjectiveDecisionSummary.jsx';

export default function ObjectifsCroissance({ dataMap = {}, onNavigate }) {
  const plan = buildDecisionCenterPlan(dataMap);
  const scores = buildRelationshipStockScores(dataMap);
  const goal = plan.goals.global;
  const lateActivities = [...(plan.goals.activities || [])]
    .filter((activity) => Number(activity.remaining || 0) > 0)
    .sort((a, b) => Number(b.remaining || 0) - Number(a.remaining || 0));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Objectifs & Croissance"
        sub="Objectifs CA, suivi mensuel, effort commercial et trajectoire de croissance. Les décisions détaillées restent dans le Centre décisionnel."
        actions={
          <button type="button" onClick={() => onNavigate?.('centre_ia')} className="rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white hover:bg-[#3d2f1d]">
            Voir Centre décisionnel
          </button>
        }
      />

      <GrowthPrioritySummary goal={goal} lateActivities={lateActivities} onNavigate={onNavigate} />

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
          <p className="text-sm text-[#8a7456] mt-1">Cette vue reste synthétique : objectif, réalisé, taux et reste à vendre. Les recommandations complètes sont dans le Centre décisionnel.</p>
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

      <ObjectiveDecisionSummary plan={plan} onNavigate={onNavigate} />

      <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Fidélisation, fournisseurs & stock</p>
          <h3 className="text-xl font-black text-[#2f2415] mt-1">Vendre encore, sécuriser l’approvisionnement, éviter les ruptures</h3>
          <p className="text-sm text-[#8a7456] mt-1">Horizon score les clients, fournisseurs et stocks pour guider les relances et les décisions commerciales.</p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <ScoreList icon={Users} title="Clients à fidéliser" items={scores.bestClients} empty="Aucun client fidèle identifié pour le moment." onOpen={() => onNavigate?.('clients')} />
          <ScoreList icon={Users} title="Clients à relancer" items={scores.clientsToRecover} empty="Aucune créance client prioritaire." onOpen={() => onNavigate?.('clients')} danger />
          <ScoreList icon={Truck} title="Fournisseurs à risque" items={scores.supplierRisks} empty="Aucun fournisseur risqué identifié." onOpen={() => onNavigate?.('fournisseurs')} danger />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {scores.stockRisks.slice(0, 4).map((item) => (
            <div key={item.id || item.name} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <Package size={16} className="text-amber-700" />
              <p className="mt-2 font-black text-[#2f2415]">{item.name}</p>
              <p className="text-xs text-amber-800">Score {item.score}/100 · valeur {fmtCurrency(item.value)}</p>
              <p className="mt-2 text-xs text-[#7d6a4a]">{item.action}</p>
            </div>
          ))}
          {!scores.stockRisks.length ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">Aucun risque stock prioritaire.</div> : null}
        </div>
      </div>

      <div className="rounded-3xl border border-[#d6c3a0] bg-[#2f2415] text-white p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#f8e8b6] font-black">Investissements pilotés</p>
          <h3 className="text-xl font-black mt-1">Les décisions détaillées sont dans le Centre décisionnel</h3>
          <p className="text-sm text-[#f8e8b6]/80 mt-1">Objectifs & Croissance montre le cap. Le Centre décisionnel explique quand investir, sur quoi investir, qui cibler, quelle deadline respecter et quel BP ouvrir.</p>
        </div>
        <button type="button" onClick={() => onNavigate?.('centre_ia')} className="rounded-xl bg-[#f6c453] px-4 py-2 text-sm font-black text-[#2f2415] hover:bg-[#ffe08a] flex items-center justify-center gap-2">
          Ouvrir les recommandations <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

function GrowthPrioritySummary({ goal, lateActivities, onNavigate }) {
  const needsCash = Number(goal.cashRate || 0) < 80 && Number(goal.realized || 0) > 0;
  const remaining = Number(goal.remaining || 0);
  const priorities = [
    remaining > 0 ? `Reste à vendre ce mois : ${fmtCurrency(remaining)}.` : null,
    needsCash ? `Encaissement faible : ${goal.cashRate}% du CA seulement.` : null,
    ...lateActivities.slice(0, 3).map((activity) => `${activity.label} : ${fmtCurrency(activity.remaining)} à rattraper.`),
  ].filter(Boolean);
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8a7456]">Croissance à traiter maintenant</p>
        <h3 className="font-black text-[#2f2415]">Écarts d’objectif et cash à sécuriser</h3>
        <p className="text-sm text-[#8a7456] mt-1">Avant les détails, on affiche le retard commercial et l’effort d’encaissement.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <Mini icon={Target} label="Atteinte" value={`${goal.attainment}%`} danger={Number(goal.attainment || 0) < 80} />
        <Mini icon={WalletCards} label="Cash rate" value={`${goal.cashRate}%`} danger={needsCash} />
        <Mini icon={TrendingUp} label="Reste" value={fmtCurrency(remaining)} danger={remaining > 0} />
        <Mini icon={AlertTriangle} label="Activités" value={lateActivities.length} danger={lateActivities.length > 0} />
      </div>
    </div>
    {priorities.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{priorities.slice(0, 6).map((item) => <div key={item} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={14} className="inline" /> {item}</div>)}</div> : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Objectifs et encaissements semblent sous contrôle.</div>}
    <div className="flex justify-end"><button type="button" onClick={() => onNavigate?.('ventes')} className="rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white hover:bg-[#3d2f1d]">Agir côté ventes</button></div>
  </section>;
}

function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border px-3 py-2 min-w-[105px] ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}><Icon size={14} className={danger ? 'text-amber-700' : 'text-[#9a6b12]'} /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>;
}

function Kpi({ icon: Icon, label, value, sub }) {
  return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4"><Icon size={18} className="text-[#c9a96a]" /><p className="text-xs text-[#8a7456] mt-3">{label}</p><p className="text-lg font-black text-[#2f2415] mt-1">{value}</p><p className="text-xs text-[#8a7456] mt-1">{sub}</p></div>;
}

function ScoreList({ icon: Icon, title, items, empty, onOpen, danger = false }) {
  return (
    <div className={`rounded-2xl border p-4 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-black text-[#2f2415] flex items-center gap-2"><Icon size={16} /> {title}</p>
        <button type="button" onClick={onOpen} className="text-[11px] font-black text-[#9a6b12]">Ouvrir</button>
      </div>
      <div className="mt-3 space-y-2">
        {items.slice(0, 4).map((item) => (
          <div key={item.id || item.name} className="rounded-xl bg-white/70 border border-white/60 p-3">
            <div className="flex justify-between gap-2"><b className="text-sm text-[#2f2415]">{item.name}</b><span className="text-xs font-black text-[#9a6b12]">{item.score}/100</span></div>
            <p className="mt-1 text-xs text-[#7d6a4a]">{item.action}</p>
          </div>
        ))}
        {!items.length ? <p className="text-sm text-[#8a7456]">{empty}</p> : null}
      </div>
    </div>
  );
}
