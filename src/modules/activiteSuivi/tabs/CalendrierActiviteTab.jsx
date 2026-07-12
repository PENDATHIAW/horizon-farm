import { CalendarDays } from 'lucide-react';

const rows = (value) => (Array.isArray(value) ? value : []);
const dateOf = (task = {}) => String(task.due_date || task.date_echeance || task.date || '').slice(0, 10);
const closed = (task = {}) => ['termine', 'terminé', 'done', 'closed', 'annule', 'annulé'].includes(String(task.status || task.statut || '').toLowerCase());

export default function CalendrierActiviteTab({ tasks = [] }) {
  const scheduled = rows(tasks)
    .filter((task) => !closed(task) && dateOf(task))
    .sort((a, b) => dateOf(a).localeCompare(dateOf(b)));

  return (
    <section className="rounded-2xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <CalendarDays className="text-[#9a6b12]" size={20} />
        <div>
          <h2 className="font-black text-[#2f2415]">Calendrier des tâches</h2>
          <p className="text-sm text-[#8a7456]">Échéances ouvertes, classées par date.</p>
        </div>
      </div>
      {scheduled.length ? (
        <div className="divide-y divide-[#eadcc2]">
          {scheduled.map((task) => (
            <div key={task.id} className="grid gap-1 py-3 sm:grid-cols-[130px_1fr_auto] sm:items-center sm:gap-3">
              <time className="text-sm font-black text-[#9a6b12]" dateTime={dateOf(task)}>{dateOf(task)}</time>
              <div>
                <p className="font-bold text-[#2f2415]">{task.title || task.titre || task.id}</p>
                <p className="text-xs text-[#8a7456]">{task.module_lie || task.source_module || 'Exploitation'}</p>
              </div>
              <span className="text-xs font-bold text-[#8a7456]">{task.assigned_to || task.responsable || 'Sans ressource'}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456]">Aucune échéance ouverte.</p>
      )}
    </section>
  );
}
