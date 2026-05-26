import { CheckCircle2, ClipboardList, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { makeId } from '../utils/ids';
import { normalizeTaskChecklist } from '../utils/taskWorkflows';
import ActionTraceHealth from './ActionTraceHealth.jsx';
import FarmRoutineTasksPanel from './FarmRoutineTasksPanel.jsx';
import TachesTechnical from './TachesTechnical.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const priorityFrom = (value = '') => ['critique', 'urgent', 'haute'].includes(String(value || '').toLowerCase()) ? 'critique' : value || 'normale';

function HeyHorizonTaskCard({ draft, onCreateTask, onCreateBusinessEvent, onRefreshTasks, onRefreshBusinessEvents, onClose }) {
  const fields = draft?.draft_fields || {};
  const [title, setTitle] = useState(fields.title || draft?.raw_input || '');
  const [dueDate, setDueDate] = useState(fields.due_date || fields.date || today());
  const [priority, setPriority] = useState(priorityFrom(fields.priority));
  const [moduleLie, setModuleLie] = useState(fields.module_lie || fields.module || 'ferme');
  const [checklist, setChecklist] = useState(fields.checklist || '');
  const [note, setNote] = useState(fields.notes || '');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!title.trim()) return toast.error('Titre de tâche obligatoire');
    try {
      setSaving(true);
      const id = makeId('TSK');
      await onCreateTask?.({ id, title: title.trim(), description: note, due_date: dueDate, date_echeance: dueDate, priority, status: 'a_faire', statut: 'a_faire', module_lie: moduleLie, checklist: normalizeTaskChecklist(checklist, title.trim()), source_module: 'hey_horizon', created_from: 'hey_horizon' });
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'tache_hey_horizon', module_source: 'taches', entity_type: 'tache', entity_id: id, title: `Tâche créée · ${title.trim()}`, description: note || draft?.raw_input || '', event_date: today(), severity: priority === 'critique' ? 'warning' : 'info', saisies_evitees: 2 });
      await Promise.allSettled([onRefreshTasks?.(), onRefreshBusinessEvents?.()]);
      toast.success('Tâche créée depuis Hey Horizon');
      onClose?.();
    } catch (error) { toast.error(error.message || 'Création tâche impossible'); } finally { setSaving(false); }
  };
  return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm space-y-4">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-emerald-700 font-black flex items-center gap-2"><ClipboardList size={15} /> Fiche préparée par Hey Horizon</p><h3 className="mt-1 text-xl font-black text-[#2f2415]">Tâche à créer</h3><p className="mt-1 text-sm text-emerald-800">Complète si besoin, puis valide. La tâche et l’événement métier seront créés.</p></div><button type="button" onClick={onClose} className="rounded-full border border-emerald-200 bg-white p-2 text-emerald-700"><X size={16} /></button></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><label className="space-y-1 md:col-span-2"><span className="text-xs font-bold text-emerald-800">Titre</span><input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Échéance</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Priorité</span><select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option value="normale">Normale</option><option value="haute">Haute</option><option value="critique">Critique</option></select></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Module lié</span><input value={moduleLie} onChange={(e) => setModuleLie(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Checklist</span><input value={checklist} onChange={(e) => setChecklist(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1 md:col-span-3"><span className="text-xs font-bold text-emerald-800">Note</span><input value={note} onChange={(e) => setNote(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label></div>
    <div className="rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-800"><CheckCircle2 size={14} className="inline" /> À la validation : tâche créée, historique alimenté, module Tâches rafraîchi.</div>
    <div className="flex justify-end"><button type="button" onClick={submit} disabled={saving} className="rounded-xl bg-[#2f2415] px-5 py-2 text-sm font-black text-white disabled:opacity-60">{saving ? 'Création...' : 'Créer la tâche'}</button></div>
  </section>;
}

export default function TachesV3(props) {
  const [horizonDraft, setHorizonDraft] = useState(null);
  useEffect(() => {
    const handler = (event) => {
      const draft = event.detail?.draft;
      if (event.detail?.module === 'taches' && draft?.form_type === 'task_creation') {
        setHorizonDraft(draft);
        window.setTimeout(() => document.getElementById('hey-horizon-task-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      }
    };
    window.addEventListener('horizon-open-form', handler);
    return () => window.removeEventListener('horizon-open-form', handler);
  }, []);
  return <div className="space-y-6">
    {horizonDraft ? <div id="hey-horizon-task-card"><HeyHorizonTaskCard draft={horizonDraft} onCreateTask={props.onCreate} onCreateBusinessEvent={props.onCreateBusinessEvent} onRefreshTasks={props.onRefresh} onRefreshBusinessEvents={props.onRefreshBusinessEvents} onClose={() => setHorizonDraft(null)} /></div> : null}
    <FarmRoutineTasksPanel tasks={props.rows || []} onCreateTask={props.onCreate} onRefreshTasks={props.onRefresh} onNavigate={props.onNavigate} />
    <ActionTraceHealth tasks={props.rows || []} alertes={props.alertes || []} events={props.businessEvents || []} online={props.online ?? true} onNavigate={props.onNavigate} />
    <TachesTechnical {...props} />
  </div>;
}
