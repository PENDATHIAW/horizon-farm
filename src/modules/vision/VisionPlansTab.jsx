import { Goal } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';
import { dateOf, Empty, label, Row, Section } from './visionUtils';

export default function VisionPlansTab({ data, onCreateBusinessPlan, onNavigate }) {
  return (
    <Section icon={Goal} title="Objectifs, investissements et plans d'action" action={onCreateBusinessPlan ? <div className="flex gap-2"><button type="button" onClick={() => onNavigate?.('investissements')} className="rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-black text-white">Nouveau plan</button><button type="button" onClick={() => onNavigate?.('rapports')} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black">Dossier financeur</button></div> : null}>
      {data.goals.length ? data.goals.slice(0, 12).map((r) => (
        <Row key={r.id || label(r)} title={label(r)} detail={`${r.status || r.statut || 'Objectif'} · ${dateOf(r)}`} value={fmtCurrency(r.montant || r.amount || r.budget || 0)} onClick={() => onNavigate?.('finance_pilotage')} />
      )) : <Empty>Aucun objectif renseigné. Business plans et investissements centralisés ici.</Empty>}
    </Section>
  );
}
