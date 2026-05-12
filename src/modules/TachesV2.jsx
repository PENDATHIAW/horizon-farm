import { AlertTriangle, CalendarClock, CheckCircle2, ListChecks } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { generateSequentialId, makeId } from '../utils/ids';
import Taches from './Taches.jsx';
import TaskAlertQualityControl from './TaskAlertQualityControl.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const isDone = (task = {}) => ['termine', 'terminé', 'annule', 'annulé'].includes(String(task.status || '').toLowerCase());
const isLate = (task = {}) => task.status === 'retard' || (task.due_date && !isDone(task) && new Date(task.due_date) < new Date());
const alertKey = (alert = {}) => `${alert.module_source || alert.module || 'alertes'}:${alert.entity_type || 'alerte'}:${alert.entity_id || alert.id}:${alert.action_recommandee || alert.title || alert.message || 'action'}`;
const taskKey = (task = {}) => task.alert_dedupe_key || `${task.module_lie || task.source_module || 'alertes'}:${task.entity_type || 'alerte'}:${task.related_id || task.source_record_id || task.id}:${task.action_key || task.title || 'action'}`;
const hasOpenTaskForAlert = (tasks = [], alert = {}) => arr(tasks).some((task) => !isDone(task) && (String(task.source_record_id || '') === String(alert.id || '') || taskKey(task) === alertKey(alert)));

async function createTaskFromAlert(alert, props, setSavingId) {
  if (!alert?.id) return toast.error('Alerte invalide');
  if (hasOpenTaskForAlert(props.rows || [], alert)) return toast.success('Une tâche ouverte existe déjà');
  try {
    setSavingId(alert.id);
    const id = generateSequentialId('taches', props.rows || []);
    const dedupeKey = alertKey(alert);
    await props.onCreate?.({ id, title: alert.title || alert.message || 'Action alerte', module_lie: alert.module_source || alert.module || 'alertes', entity_type: alert.entity_type || 'alerte', related_id: alert.entity_id || alert.id, assigned_to: 'TEAM-FERME', due_date: today(), priority: alert.severity === 'critical' || alert.severity === 'critique' || alert.severity === 'urgence' ? 'critique' : 'haute', status: 'a_faire', notes: alert.message || alert.action_recommandee || '', source_module: 'alertes', source_record_id: alert.id, action_key: alert.action_recommandee || alert.title || 'action', alert_dedupe_key: dedupeKey });
    await props.onUpdateAlert?.(alert.id, { linked_task_id: id, status: alert.status === 'nouvelle' ? 'lue' : alert.status || 'lue' });
    await props.onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'tache_creee_depuis_alerte', module_source: 'taches', entity_type: alert.entity_type || 'alerte', entity_id: alert.entity_id || alert.id, title: `Tâche créée: ${alert.title || alert.message || alert.id}`, description: alert.action_recommandee || alert.message || '', event_date: today(), severity: alert.severity || 'info', linked_task_id: id, linked_alert_id: alert.id, saisies_evitees: 2 });
    await Promise.allSettled([props.onRefresh?.(), props.onRefreshAlertes?.(), props.onRefreshBusinessEvents?.()]);
    toast.success('Tâche créée depuis l’alerte');
  } catch {
    toast.error('Création tâche impossible');
  } finally {
    setSavingId('');
  }
}

async function finishTask(task, props, setSavingId) {
  if (!task?.id) return toast.error('Tâche invalide');
  try {
    setSavingId(task.id);
    await props.onUpdate?.(task.id, { status: 'termine', completed_at: now() });
    if (task.source_module === 'alertes' && task.source_record_id) await props.onUpdateAlert?.(task.source_record_id, { status: 'traitee', completed_task_id: task.id, treated_at: now() });
    await props.onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'tache_terminee', module_source: 'taches', entity_type: task.module_lie || task.entity_type || 'tache', entity_id: task.related_id || task.id, title: `Tâche terminée: ${task.title || task.id}`, description: task.notes || '', event_date: today(), severity: 'info', linked_task_id: task.id, linked_alert_id: task.source_module === 'alertes' ? task.source_record_id : '' });
    await Promise.allSettled([props.onRefresh?.(), props.onRefreshAlertes?.(), props.onRefreshBusinessEvents?.()]);
    toast.success('Tâche terminée');
  } catch {
    toast.error('Clôture tâche impossible');
  } finally {
    setSavingId('');
  }
}

function TasksBridge(props) {
  const [savingId, setSavingId] = useState('');
  const tasks = arr(props.rows);
  const alerts = arr(props.alertes);
  const late = useMemo(() => tasks.filter(isLate).slice(0, 6), [tasks]);
  const openAlerts = useMemo(() => alerts.filter((alert) => !hasOpenTaskForAlert(tasks, alert) && !['traitee', 'traitée'].includes(String(alert.status || '').toLowerCase())).slice(0, 6), [alerts, tasks]);
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Tâches & alertes</p><h3 className="font-black text-[#2f2415]">Transformer les alertes en actions terrain</h3></div>
        <div className="grid grid-cols-3 gap-2 text-sm"><Mini icon={ListChecks} label="Tâches" value={tasks.length} /><Mini icon={CalendarClock} label="En retard" value={late.length} /><Mini icon={AlertTriangle} label="Alertes libres" value={openAlerts.length} /></div>
      </div>
      {openAlerts.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{openAlerts.map((alert) => <div key={alert.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="font-bold text-[#2f2415]">{alert.title || alert.message || alert.id}</p><p className="text-xs text-[#8a7456] mt-1">{alert.module_source || alert.module || 'alerte'} · {alert.severity || 'info'}</p><button type="button" disabled={savingId === alert.id} className="mt-3 text-sm font-bold text-emerald-700 disabled:opacity-60" onClick={() => createTaskFromAlert(alert, props, setSavingId)}><CheckCircle2 size={14} className="inline" /> {savingId === alert.id ? 'Création...' : 'Créer tâche'}</button></div>)}</div> : <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><CheckCircle2 size={14} className="inline" /> Aucune alerte sans tâche.</div>}
      {late.length ? <div className="rounded-xl border border-red-200 bg-red-50/50 p-3"><p className="text-sm font-bold text-red-600 mb-2">Tâches en retard</p>{late.map((task) => <button key={task.id} type="button" disabled={savingId === task.id} onClick={() => finishTask(task, props, setSavingId)} className="mr-2 mb-2 rounded-lg border border-red-200 bg-white px-3 py-1 text-xs text-red-600 disabled:opacity-60">{savingId === task.id ? 'Clôture...' : `Terminer ${task.title || task.id}`}</button>)}</div> : null}
    </div>
  );
}
function Mini({ icon: Icon, label, value }) { return <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2 min-w-[100px]"><Icon size={14} className="text-[#9a6b12]" /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>; }

export default function TachesV2(props) {
  return <div className="space-y-6"><TasksBridge {...props} /><TaskAlertQualityControl tasks={props.rows || []} alerts={props.alertes || []} /><Taches {...props} /></div>;
}
