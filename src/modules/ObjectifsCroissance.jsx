import { AlertTriangle, Target, TrendingUp, WalletCards } from 'lucide-react';
import Btn from '../components/Btn';
import SectionHeader from '../components/SectionHeader';
import { buildDecisionCenterPlan } from '../services/growthDecisionEngine';
import { fmtCurrency } from '../utils/format';
import FinancialPlanLightPanel from './FinancialPlanLightPanel.jsx';

export default function ObjectifsCroissance({ dataMap = {}, onNavigate }) {
  const plan = buildDecisionCenterPlan(dataMap);
  const goal = plan.goals?.global || {};
  const lateActivities = [...(plan.goals?.activities || [])]
    .filter((activity) => Number(activity.remaining || 0) > 0)
    .sort((a, b) => Number(b.remaining || 0) - Number(a.remaining || 0));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Objectifs & Croissance"
        sub="Objectifs issus du plan financier Horizon Farm : annuel, mensuel, activité par activité, avec le réalisé et le reste à vendre."
        actions={<Btn onClick={() => onNavigate?.('centre_ia')}>Décisions & recommandations</Btn>}
      />

      <GrowthPrioritySummary goal={goal} lateActivities={lateActivities} onNavigate={onNavigate} />

      <FinancialPlanLightPanel dataMap={dataMap} onNavigate={onNavigate} />

      <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Objectifs par activité</p>
          <h3 className="text-xl font-black text-[#2f2415] mt-1">Quelle activité pousse ou retarde la croissance ?</h3>
          <p className="text-sm text-[#8a7456] mt-1">Les objectifs viennent du fichier financier : œufs, poulets de chair, bœufs et fumier.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {(plan.goals?.activities || []).map((activity) => (
            <div key={activity.activity} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
              <p className="text-xs font-black text-[#8a7456]">{activity.label}</p>
              <p className="text-2xl font-black text-[#2f2415] mt-1">{activity.attainment ?? 0}%</p>
              <p className="text-xs text-[#8a7456] mt-1">Objectif {fmtCurrency(activity.target)}</p>
              <p className="text-xs text-[#8a7456]">Réalisé {fmtCurrency(activity.realized)}</p>
              <p className="text-xs text-[#8a7456]">Reste {fmtCurrency(activity.remaining)}</p>
            </div>
          ))}
          {!(plan.goals?.activities || []).length ? <div className="col-span-full rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456]">Aucun objectif par activité disponible pour le moment.</div> : null}
        </div>
      </div>

      <div className="rounded-3xl border border-[#eadcc2] bg-[#fffdf8] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Lecture simple</p>
          <h3 className="font-black text-[#2f2415]">Objectifs ici, décisions dans le Centre décisionnel</h3>
          <p className="text-sm text-[#8a7456] mt-1">Pour savoir quoi faire concrètement — investir, relancer, acheter, vendre ou sécuriser une échéance — ouvre le Centre décisionnel.</p>
        </div>
        <Btn onClick={() => onNavigate?.('centre_ia')}>Ouvrir Centre décisionnel</Btn>
      </div>
    </div>
  );
}

function GrowthPrioritySummary({ goal, lateActivities, onNavigate }) {
  const needsCash = Number(goal.cashRate || 0) < 80 && Number(goal.realized || 0) > 0;
  const remaining = Number(goal.remaining || 0);
  const priorities = [
    remaining > 0 ? `Reste à vendre ce mois : ${fmtCurrency(remaining)}.` : null,
    needsCash ? `Encaissement faible : ${goal.cashRate ?? 0}% du CA seulement.` : null,
    ...lateActivities.slice(0, 3).map((activity) => `${activity.label} : ${fmtCurrency(activity.remaining)} à rattraper.`),
  ].filter(Boolean);
  const visiblePriorities = priorities.slice(0, 3);
  const hiddenCount = Math.max(0, priorities.length - visiblePriorities.length);
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8a7456]">Croissance à traiter maintenant</p>
        <h3 className="font-black text-[#2f2415]">Écarts d’objectif et encaissement à sécuriser</h3>
        <p className="text-sm text-[#8a7456] mt-1">Avant les détails, on affiche uniquement le retard commercial et l’effort d’encaissement.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <Mini icon={Target} label="Atteinte" value={`${goal.attainment ?? 0}%`} danger={Number(goal.attainment || 0) < 80} />
        <Mini icon={WalletCards} label="Encaissement" value={`${goal.cashRate ?? 0}%`} danger={needsCash} />
        <Mini icon={TrendingUp} label="Reste" value={fmtCurrency(remaining)} danger={remaining > 0} />
        <Mini icon={AlertTriangle} label="Activités" value={lateActivities.length} danger={lateActivities.length > 0} />
      </div>
    </div>
    {priorities.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{visiblePriorities.map((item) => <div key={item} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={14} className="inline" /> {item}</div>)}{hiddenCount ? <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm font-bold text-[#7d6a4a]">+ {hiddenCount} autre{hiddenCount > 1 ? 's' : ''} point{hiddenCount > 1 ? 's' : ''} dans le Centre décisionnel</div> : null}</div> : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Objectifs et encaissements semblent sous contrôle.</div>}
    <div className="flex justify-end"><Btn small onClick={() => onNavigate?.('ventes')}>Agir côté ventes</Btn></div>
  </section>;
}

function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border px-3 py-2 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}><Icon size={14} className={danger ? 'text-amber-700' : 'text-[#9a6b12]'} /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>;
}
