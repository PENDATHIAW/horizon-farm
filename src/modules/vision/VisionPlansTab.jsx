import { Goal } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';
import { dateOf, Empty, label, Row, Section } from './visionUtils';

export default function VisionPlansTab({ data, onCreateBusinessPlan, onNavigate }) {
  const planGoals = data.planGoals || [];
  const recommendations = data.growthRecommendations || [];
  const rows = data.goals || [];

  return (
    <Section icon={Goal} title="Objectifs, investissements et plans d'action" action={<div className="flex gap-2"><button type="button" onClick={() => onNavigate?.('finance_pilotage', { tab: 'Investissements' })} className="rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-black text-white">{onCreateBusinessPlan ? 'Nouveau plan' : 'Investissements'}</button><button type="button" onClick={() => onNavigate?.('rapports')} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black">Dossier financeur</button></div>}>
      {planGoals.length ? planGoals.slice(0, 8).map((r) => (
        <Row key={r.activity || r.label} title={r.label} detail={`Réalisé ${fmtCurrency(r.realized || 0)} · reste ${fmtCurrency(r.remaining || 0)}`} value={`${r.attainment || 0}%`} tone={(r.attainment || 0) >= 100 ? 'good' : 'warn'} onClick={() => onNavigate?.('commercial', { tab: 'Graphiques' })} />
      )) : null}
      {recommendations.length ? recommendations.slice(0, 4).map((r) => (
        <Row key={r.id || r.title} title={r.title} detail={r.recommendation || r.timing || 'Recommandation croissance'} value={r.priority || 'Plan'} tone={r.priority === 'haute' ? 'warn' : 'neutral'} onClick={() => onNavigate?.('centre_decisionnel', { tab: 'Cycles' })} />
      )) : null}
      {rows.length ? rows.slice(0, 12).map((r) => (
        <Row key={r.id || label(r)} title={label(r)} detail={`${r.status || r.statut || 'Objectif'} · ${dateOf(r)}`} value={fmtCurrency(r.montant || r.amount || r.budget || 0)} onClick={() => onNavigate?.('finance_pilotage')} />
      )) : !planGoals.length && !recommendations.length ? <Empty>Aucun objectif renseigné. Business plans et investissements centralisés ici.</Empty> : null}
    </Section>
  );
}
