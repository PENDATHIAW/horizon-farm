import { AlertTriangle, CalendarCheck, CheckCircle2, ClipboardList, Drumstick, Egg, HeartPulse, ShieldCheck, ShoppingCart, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import { makeId } from '../utils/ids';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };
const lower = (value = '') => String(value || '').toLowerCase();
const isOpen = (row = {}) => !['termine', 'terminé', 'done', 'closed', 'annule', 'annulé'].includes(lower(row.status || row.statut));
const hasRoutine = (tasks = [], key) => arr(tasks).some((task) => isOpen(task) && (task.routine_key === key || lower(`${task.title || ''} ${task.notes || ''}`).includes(lower(key))));

const ROUTINES = [
  { key: 'biosécurité entrée ferme', icon: ShieldCheck, module: 'sante', priority: 'critique', title: 'Contrôle biosécurité entrée ferme', notes: 'Vérifier pédiluve, lavage mains, visiteurs, tenues et accès zones sensibles.', due: today },
  { key: 'alimentation matin', icon: Drumstick, module: 'stock', priority: 'haute', title: 'Contrôler alimentation du matin', notes: 'Vérifier distribution, consommation, stock aliment et anomalies par lot/animal.', due: today },
  { key: 'ramassage oeufs', icon: Egg, module: 'avicole', priority: 'haute', title: 'Ramassage et comptage des œufs', notes: 'Ramasser, compter, noter œufs cassés, tablettes disponibles et écarts de ponte.', due: today },
  { key: 'tour santé animaux', icon: HeartPulse, module: 'sante', priority: 'haute', title: 'Tour santé animaux et volailles', notes: 'Observer mortalité, toux, boiteries, baisse appétit, stress thermique et isoler les cas suspects.', due: today },
  { key: 'ventes relances credits', icon: ShoppingCart, module: 'ventes', priority: 'haute', title: 'Relancer ventes à crédit', notes: 'Appeler les clients avec reste à payer et noter promesse de paiement.', due: today },
  { key: 'livraisons a faire', icon: CalendarCheck, module: 'ventes', priority: 'haute', title: 'Préparer les livraisons du jour', notes: 'Vérifier commandes, quantité, adresse, facture/reçu et confirmation client.', due: today },
  { key: 'maintenance equipements', icon: Wrench, module: 'equipements', priority: 'moyenne', title: 'Vérifier équipements critiques', notes: 'Contrôler abreuvoirs, mangeoires, batteries, pompes, capteurs, caméras et matériel de secours.', due: tomorrow },
];

function RoutineCard({ routine, exists, onCreate }) {
  const Icon = routine.icon;
  return <article className={`rounded-2xl border p-4 ${exists ? 'border-emerald-200 bg-emerald-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
    <div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 font-black text-[#2f2415]"><Icon size={17} className="text-[#9a6b12]" /> {routine.title}</p><p className="mt-1 text-sm text-[#8a7456] leading-relaxed">{routine.notes}</p></div>{exists ? <CheckCircle2 size={18} className="text-emerald-700" /> : <AlertTriangle size={18} className="text-amber-700" />}</div>
    <div className="mt-3 flex items-center justify-between gap-2"><span className="rounded-full border border-[#eadcc2] bg-white px-3 py-1 text-xs font-black text-[#8a7456]">{routine.module} · {routine.priority}</span><button type="button" disabled={exists} onClick={() => onCreate(routine)} className="min-h-[40px] rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-black text-white disabled:bg-emerald-600">{exists ? 'Déjà planifiée' : 'Créer tâche'}</button></div>
  </article>;
}

export default function FarmRoutineTasksPanel({ tasks = [], onCreateTask, onRefreshTasks, onNavigate }) {
  const openTasks = arr(tasks).filter(isOpen);
  const missing = ROUTINES.filter((routine) => !hasRoutine(openTasks, routine.key));
  const createRoutine = async (routine) => {
    try {
      await onCreateTask?.({ id: makeId('TSK'), title: routine.title, module_lie: routine.module, source_module: 'routines_ferme', routine_key: routine.key, due_date: routine.due(), priority: routine.priority, status: 'a_faire', notes: routine.notes, created_from: 'routines_ferme' });
      await onRefreshTasks?.();
      toast.success('Tâche routine créée');
    } catch (error) {
      toast.error(error.message || 'Création de tâche impossible');
    }
  };

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><ClipboardList size={15} /> Routines ferme</p><h3 className="text-xl font-black text-[#2f2415] mt-1">Bonne tenue quotidienne de l’exploitation</h3><p className="text-sm text-[#8a7456] mt-1">Santé, biosécurité, alimentation, ramassage œufs, ventes, livraisons et maintenance.</p></div><div className={`rounded-2xl border p-3 text-sm ${missing.length ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{missing.length ? `${missing.length} routine(s) à planifier` : 'Routines essentielles planifiées'}</div></div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{ROUTINES.map((routine) => <RoutineCard key={routine.key} routine={routine} exists={hasRoutine(openTasks, routine.key)} onCreate={createRoutine} />)}</div>
    <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => onNavigate?.('sante')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Santé</button><button type="button" onClick={() => onNavigate?.('stock')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Stock</button><button type="button" onClick={() => onNavigate?.('ventes')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Ventes</button><button type="button" onClick={() => onNavigate?.('equipements')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Équipements</button></div>
  </section>;
}
