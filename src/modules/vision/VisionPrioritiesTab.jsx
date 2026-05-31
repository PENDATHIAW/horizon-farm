import { useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, BrainCircuit } from 'lucide-react';
import { applyOneClickRecommendation } from '../../services/heyHorizonRecommendationActions.js';
import { buildObjectiveActionTask } from '../../utils/objectivesWorkflows';
import { openVisionPriority } from './visionMetrics.js';
import { Empty, Row, Section, Stat } from './visionUtils';

export default function VisionPrioritiesTab({
  data,
  moduleId = 'centre_ia',
  setTab,
  onNavigate,
  onCreateTask,
  onCreateAlert,
  onUpdateAlert,
  onCreateBusinessEvent,
  onRefreshTasks,
  onRefreshAlertes,
  existingTasks = [],
  existingAlerts = [],
}) {
  const [busyId, setBusyId] = useState(null);

  const actionHandlers = {
    onNavigate,
    onCreateTask,
    onCreateAlert,
    onUpdateAlert,
    onCreateBusinessEvent,
    existingTasks,
    existingAlerts,
  };

  const applyFinding = async (item) => {
    if (!item.finding) return;
    setBusyId(item.id);
    try {
      const result = await applyOneClickRecommendation(item.finding, actionHandlers);
      if (result.createdTasks || result.createdAlerts) {
        toast.success(`${result.createdTasks || 0} tâche(s), ${result.createdAlerts || 0} alerte(s)`);
        await onRefreshTasks?.();
        await onRefreshAlertes?.();
      } else {
        toast.success('Module ouvert');
      }
    } catch (e) {
      toast.error(e.message || 'Action impossible');
    } finally {
      setBusyId(null);
    }
  };

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
    toast.success('Tâche créée');
  };

  const createAlert = async (item) => {
    if (!onCreateAlert) return;
    await onCreateAlert({ title: item.title, message: item.detail, module_source: item.sourceModule || 'objectifs_croissance', severity: item.tone === 'bad' ? 'critique' : 'warning', status: 'nouvelle', action_recommandee: item.detail || 'Voir Vision & Croissance' });
    await onRefreshAlertes?.();
    toast.success('Alerte créée');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <Stat label="Santé ERP" value={`${data.healthScore ?? data.globalScore}/100`} tone={(data.healthScore ?? data.globalScore) >= 75 ? 'good' : 'warn'} />
        <Stat label="Trésorerie" value={`${data.balance.toLocaleString('fr-FR')} F`} tone={data.balance >= 0 ? 'good' : 'bad'} />
        <Stat label="À traiter" value={data.priorities.length} tone={data.priorities.length ? 'warn' : 'good'} />
        <Stat label="Risques" value={data.risks.length} tone={data.risks.length ? 'warn' : 'good'} />
        <Stat label="Prévisions IA" value={data.predictions?.length || 0} tone={data.predictions?.length ? 'warn' : 'good'} />
        <Stat label="Opportunités" value={data.opportunities.length + (data.iaOpportunities?.length || 0)} tone="good" />
      </div>
      <Section icon={BrainCircuit} title="Recommandations IA — actions directes">
        {data.priorities.filter((p) => p.isEngine).length ? data.priorities.filter((p) => p.isEngine).slice(0, 10).map((r) => (
          <Row key={r.id} title={r.title} detail={r.detail} tone={r.tone} onClick={() => onNavigate?.(r.sourceModule)} actions={<>
            <button type="button" disabled={busyId === r.id} onClick={() => applyFinding(r)} className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50">
              {busyId === r.id ? '…' : r.finding?.auto_action === 'create_task' ? 'Créer tâche' : r.finding?.auto_action === 'create_alert' ? 'Créer alerte' : 'Appliquer'}
            </button>
            <button type="button" onClick={() => onNavigate?.(r.sourceModule)} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">Module</button>
          </>} />
        )) : <Empty>Aucune recommandation IA active.</Empty>}
      </Section>
      <Section icon={AlertTriangle} title="Ce qu'il faut traiter maintenant">
        {data.priorities.filter((p) => !p.isEngine).length ? data.priorities.filter((p) => !p.isEngine).slice(0, 10).map((r) => (
          <Row key={r.id} title={r.title} detail={r.detail} tone={r.tone} onClick={() => openVisionPriority(r, moduleId, { setTab, onNavigate })} actions={<>
            <button type="button" onClick={() => onNavigate?.(r.sourceModule)} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">Voir module</button>
            {onCreateTask ? <button type="button" onClick={() => createTask(r)} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-black text-emerald-700">Créer tâche</button> : null}
            {onCreateAlert ? <button type="button" onClick={() => createAlert(r)} className="rounded-lg border border-amber-300 px-2 py-1 text-xs font-black text-amber-700">Créer alerte</button> : null}
            <button type="button" onClick={() => markTreated(r)} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">Marquer traité</button>
          </>} />
        )) : !data.priorities.filter((p) => p.isEngine).length ? <Empty>Aucune priorité métier en attente.</Empty> : null}
      </Section>
    </div>
  );
}
