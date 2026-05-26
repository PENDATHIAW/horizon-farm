import { AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { buildTaskFromAlert, hasOpenTaskForAlert } from '../utils/taskWorkflows';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value = '') => String(value || '').toLowerCase();
const open = (row = {}) => !['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'closed', 'done'].includes(lower(row.status || row.statut));
const moduleOf = (alert = {}) => alert.module_source || alert.module || alert.module_lie || 'alertes';
const titleOf = (alert = {}) => alert.title || alert.titre || alert.message || 'Alerte à traiter';

export default function AlertTaskBridgePanel({ alertes = [], tasks = [], onCreateTask, onRefreshTasks, onUpdateAlert, onRefreshAlertes, onNavigate }) {
  const openAlerts = arr(alertes).filter(open);
  const withoutTask = openAlerts.filter((alert) => !hasOpenTaskForAlert(tasks, alert));
  const createTask = async (alert) => {
    try {
      const workflow = buildTaskFromAlert(alert, tasks, alert.due_date || alert.date_prevue || new Date().toISOString().slice(0, 10));
      await onCreateTask?.({ ...workflow.task, created_from: 'alerte' });
      await onUpdateAlert?.(alert.id, { ...workflow.alertPatch, task_status: 'tache_creee', linked_task_status: 'created' });
      await Promise.allSettled([onRefreshTasks?.(), onRefreshAlertes?.()]);
      toast.success('Tâche créée depuis l’alerte');
    } catch (error) { toast.error(error.message || 'Création de tâche impossible'); }
  };
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><ClipboardList size={15} /> Alertes à transformer en tâches</p><h3 className="text-xl font-black text-[#2f2415] mt-1">Planifier l’action terrain depuis l’alerte</h3><p className="text-sm text-[#8a7456] mt-1">Les routines restent dans Tâches. Ici, on traite uniquement les alertes réelles qui nécessitent une action.</p></div><div className={`rounded-2xl border p-3 text-sm ${withoutTask.length ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{withoutTask.length ? `${withoutTask.length} alerte(s) sans tâche` : 'Alertes reliées aux tâches'}</div></div>{withoutTask.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{withoutTask.slice(0, 6).map((alert) => <article key={alert.id || titleOf(alert)} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="flex items-start gap-2 font-black text-[#2f2415]"><AlertTriangle size={17} className="text-amber-700" /> {titleOf(alert)}</p><p className="mt-1 text-sm text-[#8a7456]">{alert.message || alert.action_recommandee || 'Action à planifier.'}</p><p className="mt-2 text-xs font-black text-[#9a6b12]">{moduleOf(alert)}</p><button type="button" onClick={() => createTask(alert)} className="mt-3 rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-black text-white">Créer tâche</button></article>)}</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={16} className="inline" /> Aucune alerte ouverte sans tâche terrain.</div>}<div className="flex justify-end"><button type="button" onClick={() => onNavigate?.('taches')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Ouvrir Tâches</button></div></section>;
}
