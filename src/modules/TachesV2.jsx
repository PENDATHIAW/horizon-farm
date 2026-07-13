import { AlertTriangle, CalendarClock, CheckCircle2, ChevronDown, ListChecks, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { buildTaskFromAlert, completeTaskWorkflow, hasOpenTaskForAlert, isTaskClosed } from '../utils/taskWorkflows';
import Taches from './Taches.jsx';
import TaskAlertQualityControl from './TaskAlertQualityControl.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const low = (value = '') => String(value || '').toLowerCase();
const isDone = isTaskClosed;
const isLate = (task = {}) => task.status === 'retard' || (task.due_date && !isDone(task) && new Date(task.due_date) < new Date());
const isToday = (task = {}) => task.due_date && String(task.due_date).slice(0, 10) === today() && !isDone(task);
const isPriority = (task = {}) => ['critique', 'haute'].includes(low(task.priority)) && !isDone(task);

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4"><div><p className="flex items-center gap-2 text-lg font-semibold text-earth"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-slate">{subtitle}</p> : null}</div>{children}</section>;
}
function CollapsibleSection({ icon: Icon, title, subtitle, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return <section className="rounded-3xl border border-line bg-white shadow-card overflow-hidden"><button type="button" onClick={() => setOpen((value) => !value)} className="flex min-h-[64px] w-full items-center justify-between gap-3 px-6 py-4 text-left hover:bg-card"><span><span className="flex items-center gap-2 text-lg font-semibold text-earth"><Icon size={20} /> {title}</span>{subtitle ? <span className="mt-1 block text-sm text-slate">{subtitle}</span> : null}</span><ChevronDown size={20} className={`shrink-0 text-slate transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open ? <div className="border-t border-line p-6">{children}</div> : null}</section>;
}

async function createTaskFromAlert(alert, props, setSavingId) {
  if (!alert?.id) return toast.error('Alerte invalide');
  if (hasOpenTaskForAlert(props.rows || [], alert)) return toast.success('Une tâche ouverte existe déjà');
  try {
    setSavingId(alert.id);
    const workflow = buildTaskFromAlert(alert, props.rows || [], today());
    await props.onCreate?.(workflow.task);
    await props.onUpdateAlert?.(alert.id, workflow.alertPatch);
    await props.onCreateBusinessEvent?.(workflow.event);
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
    const workflow = completeTaskWorkflow(task, today(), now());
    await props.onUpdate?.(task.id, workflow.taskPatch);
    if (workflow.alertPatch) await props.onUpdateAlert?.(workflow.alertPatch.id, workflow.alertPatch.patch);
    await props.onCreateBusinessEvent?.(workflow.event);
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
  const late = useMemo(() => tasks.filter(isLate).slice(0, 5), [tasks]);
  const todayTasks = useMemo(() => tasks.filter((task) => isToday(task) || isPriority(task)).filter((task) => !isLate(task)).slice(0, 5), [tasks]);
  const openAlerts = useMemo(() => alerts.filter((alert) => !hasOpenTaskForAlert(tasks, alert) && !['traitee', 'traitée', 'resolue', 'résolue'].includes(low(alert.status))).slice(0, 5), [alerts, tasks]);
  const empty = !late.length && !todayTasks.length && !openAlerts.length;
  return (
    <div className="rounded-2xl border border-line bg-white p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div><p className="text-xs uppercase tracking-normal text-slate">Tâches terrain</p><h3 className="font-semibold text-earth">À faire maintenant</h3><p className="text-sm text-slate mt-1">Priorité aux retards, urgences du jour et alertes sans tâche.</p></div>
        <div className="grid grid-cols-3 gap-2 text-sm"><Mini icon={CalendarClock} label="Retards" value={late.length} /><Mini icon={ListChecks} label="Priorités" value={todayTasks.length} /><Mini icon={AlertTriangle} label="Alertes libres" value={openAlerts.length} /></div>
      </div>
      {empty ? <div className="rounded-xl border border-positive bg-positive-bg p-3 text-sm text-positive"><CheckCircle2 size={14} className="inline" /> Rien d’urgent à transformer ou clôturer.</div> : null}
      {late.length ? <div className="rounded-xl border border-urgent bg-urgent-bg p-3"><p className="text-sm font-semibold text-urgent mb-2">Tâches en retard</p>{late.map((task) => <button key={task.id} type="button" disabled={savingId === task.id} onClick={() => finishTask(task, props, setSavingId)} className="mr-2 mb-2 rounded-lg border border-urgent bg-white px-3 py-1 text-xs text-urgent disabled:opacity-60">{savingId === task.id ? 'Clôture...' : `Terminer ${task.title || task.id}`}</button>)}</div> : null}
      {todayTasks.length ? <div className="rounded-xl border border-vigilance bg-vigilance-bg p-3"><p className="text-sm font-semibold text-horizon-dark mb-2">À faire aujourd’hui / prioritaire</p>{todayTasks.map((task) => <button key={task.id} type="button" disabled={savingId === task.id} onClick={() => finishTask(task, props, setSavingId)} className="mr-2 mb-2 rounded-lg border border-vigilance bg-white px-3 py-1 text-xs text-horizon-dark disabled:opacity-60">{savingId === task.id ? 'Clôture...' : `Terminer ${task.title || task.id}`}</button>)}</div> : null}
      {openAlerts.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{openAlerts.map((alert) => <div key={alert.id} className="rounded-xl border border-line bg-card p-3"><p className="font-semibold text-earth line-clamp-2">{alert.title || alert.message || alert.id}</p><p className="text-xs text-slate mt-1">{alert.module_source || alert.module || 'alerte'} · {alert.severity || 'info'}</p><button type="button" disabled={savingId === alert.id} className="mt-3 text-sm font-semibold text-positive disabled:opacity-60" onClick={() => createTaskFromAlert(alert, props, setSavingId)}><CheckCircle2 size={14} className="inline" /> {savingId === alert.id ? 'Création...' : 'Créer tâche'}</button></div>)}</div> : null}
    </div>
  );
}
function Mini({ icon: Icon, label, value }) { return <div className="rounded-xl bg-card border border-line px-3 py-2 min-w-[100px]"><Icon size={14} className="text-horizon-dark" /><b className="block text-earth">{value}</b><span className="text-xs text-slate">{label}</span></div>; }

export default function TachesV2(props) {
  return <div className="space-y-6 taches-mobile-structured">
    <style>{`@media (max-width: 640px){.taches-mobile-structured .rounded-2xl{border-radius:18px}.taches-mobile-structured table{font-size:12px}.taches-mobile-structured th,.taches-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.taches-mobile-structured .text-2xl{font-size:1.35rem}.taches-mobile-structured .grid{gap:.75rem}.taches-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>

    <ModuleSection icon={AlertTriangle} title="Actions à faire maintenant" subtitle="Retards, priorités du jour et alertes transformables en tâches.">
      <TasksBridge {...props} />
    </ModuleSection>

    <ModuleSection icon={ListChecks} title="Liste des tâches" subtitle="Tâches terrain, priorités, échéances et suivi quotidien.">
      <Taches {...props} />
    </ModuleSection>

    <CollapsibleSection icon={ShieldCheck} title="Cohérence tâches / alertes" subtitle="Contrôle des alertes déjà prises en charge, retards et actions orphelines." defaultOpen={false}>
      <TaskAlertQualityControl tasks={props.rows || []} alerts={props.alertes || []} />
    </CollapsibleSection>
  </div>;
}
