import { CalendarDays } from 'lucide-react';

const rows = (value) => (Array.isArray(value) ? value : []);
const dateOf = (task = {}) => String(task.due_date || task.date_echeance || task.date || '').slice(0, 10);
const closed = (task = {}) => ['termine', 'terminé', 'done', 'closed', 'annule', 'annulé'].includes(String(task.status || task.statut || '').toLowerCase());

export default function CalendrierActiviteTab({ tasks = [] }) {
  const scheduled = rows(tasks)
    .filter((task) => !closed(task) && dateOf(task))
    .sort((a, b) => dateOf(a).localeCompare(dateOf(b)));

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <CalendarDays className="text-horizon-dark" size={20} />
        <div>
          <h2 className="font-semibold text-earth">Calendrier des tâches</h2>
          <p className="text-sm text-slate">Échéances ouvertes, classées par date.</p>
        </div>
      </div>
      {scheduled.length ? (
        <div className="divide-y divide-line">
          {scheduled.map((task) => (
            <div key={task.id} className="grid gap-1 py-3 sm:grid-cols-[130px_1fr_auto] sm:items-center sm:gap-3">
              <time className="text-sm font-semibold text-horizon-dark" dateTime={dateOf(task)}>{dateOf(task)}</time>
              <div>
                <p className="font-semibold text-earth">{task.title || task.titre || task.id}</p>
                <p className="text-xs text-slate">{task.module_lie || task.source_module || 'Exploitation'}</p>
              </div>
              <span className="text-xs font-semibold text-slate">{task.assigned_to || task.responsable || 'Sans ressource'}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-line bg-card p-4 text-sm text-slate">Aucune échéance ouverte.</p>
      )}
    </section>
  );
}
