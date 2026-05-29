import { AlertTriangle } from 'lucide-react';
import { buildObjectiveActionTask } from '../../utils/objectivesWorkflows';
import { Empty, Row, Section, Stat } from './visionUtils';

export default function VisionPrioritiesTab({ data, setTab, onNavigate, onCreateTask, onCreateAlert, onCreateBusinessEvent, onRefreshTasks, onRefreshAlertes }) {
  const markTreated = async (item) => {
    if (item.record?.id && onCreateBusinessEvent) {
      await onCreateBusinessEvent({ event_type: 'priorite_traitee', module_source: 'objectifs_croissance', entity_id: item.id, title: `Priorité traitée : ${item.title}`, event_date: new Date().toISOString().slice(0, 10), severity: 'info' });
    }
  };
  const createTask = async (item) => {
    if (!onCreateTask) return;
    const built = buildObjectiveActionTask({ label: item.title, activity: item.sourceModule || 'global' });
    await onCreateTask({ ...built.task, title: `Traiter : ${item.title}`, notes: item.detail });
    await onRefreshTasks?.();
  };
  const createAlert = async (item) => {
    if (!onCreateAlert) return;
    await onCreateAlert({ title: item.title, message: item.detail, module_source: item.sourceModule || 'objectifs_croissance', severity: item.tone === 'bad' ? 'critique' : 'warning', status: 'nouvelle', action_recommandee: 'Voir Vision & Croissance' });
    await onRefreshAlertes?.();
  };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Stat label="Santé ferme" value={`${data.globalScore}/100`} tone={data.globalScore >= 75 ? 'good' : 'warn'} />
        <Stat label="Trésorerie" value={`${data.balance.toLocaleString('fr-FR')} F`} tone={data.balance >= 0 ? 'good' : 'bad'} />
        <Stat label="À traiter" value={data.priorities.length} tone={data.priorities.length ? 'warn' : 'good'} />
        <Stat label="Risques" value={data.risks.length} tone={data.risks.length ? 'warn' : 'good'} />
        <Stat label="Opportunités" value={data.opportunities.length} tone="good" />
      </div>
      <Section icon={AlertTriangle} title="Ce qu'il faut traiter maintenant">
        {data.priorities.length ? data.priorities.slice(0, 10).map((r) => (
          <Row key={r.id} title={r.title} detail={r.detail} tone={r.tone} onClick={() => setTab(r.tab || 'À traiter')} actions={<>
            <button type="button" onClick={() => onNavigate?.(r.sourceModule)} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">Voir module</button>
            {onCreateTask ? <button type="button" onClick={() => createTask(r)} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-black text-emerald-700">Créer tâche</button> : null}
            {onCreateAlert ? <button type="button" onClick={() => createAlert(r)} className="rounded-lg border border-amber-300 px-2 py-1 text-xs font-black text-amber-700">Créer alerte</button> : null}
            <button type="button" onClick={() => markTreated(r)} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">Marquer traité</button>
          </>} />
        )) : <Empty>Aucune priorité critique détectée.</Empty>}
      </Section>
    </div>
  );
}
