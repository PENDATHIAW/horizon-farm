import { AlertTriangle, CalendarClock, CheckCircle2, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateSequentialId } from '../utils/ids';
import Taches from './Taches.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const isLate = (task = {}) => task.status === 'retard' || (task.due_date && task.status !== 'termine' && new Date(task.due_date) < new Date());

async function createTaskFromAlert(alert, props) {
  try {
    await props.onCreate?.({
      id: generateSequentialId('taches', props.rows || []),
      title: alert.title || alert.message || 'Action alerte',
      module_lie: alert.module_source || alert.module || 'alertes',
      related_id: alert.entity_id || alert.id,
      assigned_to: 'responsable',
      due_date: today(),
      priority: alert.severity === 'critical' || alert.severity === 'critique' ? 'critique' : 'haute',
      status: 'a_faire',
      notes: alert.message || alert.action_recommandee || '',
      source_module: 'alertes',
      source_record_id: alert.id,
    });
    toast.success('Tâche créée depuis l’alerte');
  } catch (error) {
    toast.error(error.message || 'Création tâche impossible');
  }
}

async function finishTask(task, props) {
  try {
    await props.onUpdate?.(task.id, { status: 'termine', completed_at: new Date().toISOString() });
    toast.success('Tâche terminée');
  } catch (error) {
    toast.error(error.message || 'Clôture impossible');
  }
}

function TasksBridge(props) {
  const tasks = arr(props.rows);
  const alerts = arr(props.alertes);
  const late = tasks.filter(isLate).slice(0, 6);
  const openAlerts = alerts.filter((a) => !tasks.some((t) => String(t.source_record_id) === String(a.id))).slice(0, 6);
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Priorité 7 · Tâches & alertes</p>
          <h3 className="font-black text-[#2f2415]">Transformer les alertes en actions terrain</h3>
          <p className="text-sm text-[#8a7456] mt-1">Les alertes importantes peuvent devenir des tâches assignées, suivies et clôturées.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm"><Mini icon={ListChecks} label="Tâches" value={tasks.length} /><Mini icon={CalendarClock} label="En retard" value={late.length} /><Mini icon={AlertTriangle} label="Alertes libres" value={openAlerts.length} /></div>
      </div>
      {openAlerts.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{openAlerts.map((alert) => <div key={alert.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="font-bold text-[#2f2415]">{alert.title || alert.message || alert.id}</p><p className="text-xs text-[#8a7456] mt-1">{alert.module_source || alert.module || 'alerte'} · {alert.severity || 'info'}</p><button type="button" className="mt-3 text-sm font-bold text-emerald-700" onClick={() => createTaskFromAlert(alert, props)}><CheckCircle2 size={14} className="inline" /> Créer tâche</button></div>)}</div> : <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><CheckCircle2 size={14} className="inline" /> Aucune alerte sans tâche.</div>}
      {late.length ? <div className="rounded-xl border border-red-200 bg-red-50/50 p-3"><p className="text-sm font-bold text-red-600 mb-2">Tâches en retard</p>{late.map((task) => <button key={task.id} type="button" onClick={() => finishTask(task, props)} className="mr-2 mb-2 rounded-lg border border-red-200 bg-white px-3 py-1 text-xs text-red-600">Terminer {task.title || task.id}</button>)}</div> : null}
    </div>
  );
}
function Mini({ icon: Icon, label, value }) { return <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2 min-w-[100px]"><Icon size={14} className="text-[#9a6b12]" /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>; }

export default function TachesV2(props) { return <div className="space-y-6"><TasksBridge {...props} /><Taches {...props} /></div>; }
