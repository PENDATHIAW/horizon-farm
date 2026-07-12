import { CalendarDays, ExternalLink, ListTodo, Plus } from 'lucide-react';
import { t } from '../../i18n/fr/index.js';
import { normalizeValue, rowDateValue, rowModule, selectListeTaches, TASK_DATE_KEYS, taskPriorityOf, taskStatusOf } from './dataFilters.js';

const STATUS_KEYS = Object.freeze({
  a_faire: 'todo',
  todo: 'todo',
  pending: 'todo',
  en_cours: 'doing',
  in_progress: 'doing',
  termine: 'done',
  done: 'done',
  closed: 'done',
  annule: 'cancelled',
  cancelled: 'cancelled',
});

function statusLabel(value) {
  const key = STATUS_KEYS[normalizeValue(value)] || 'todo';
  return t(`shared.statuses.${key}`);
}

export default function ListeTaches({
  title = t('shared.tasks.titre'),
  tasks = [],
  rows,
  farmId,
  assignedTo,
  module,
  alertId,
  decisionId,
  statuses,
  priorities,
  period,
  limit = 100,
  onNavigate,
  onSelect,
  onCreate,
  compact = false,
  className = '',
}) {
  const selected = selectListeTaches({ tasks, rows, farmId, assignedTo, module, alertId, decisionId, statuses, priorities, period, limit });
  return (
    <section className={`min-w-0 ${className}`} aria-label={title}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-black text-[#2f2415]"><ListTodo size={17} />{title}</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#8a7456]">{selected.length}</span>
          {onCreate ? <button type="button" onClick={onCreate} className="grid h-8 w-8 place-items-center rounded-lg bg-[#2f2415] text-white" title={t('commun.actions.creerTache')} aria-label={t('commun.actions.creerTache')}><Plus size={16} /></button> : null}
        </div>
      </div>
      {selected.length ? (
        <ul className="divide-y divide-[#eadcc2] border-y border-[#eadcc2]">
          {selected.map((task) => {
            const source = rowModule(task);
            const dueDate = rowDateValue(task, TASK_DATE_KEYS);
            return (
              <li key={task.task_dedupe_key || task.action_key || task.event_key || task.id} className={compact ? 'py-2' : 'py-3'}>
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <button type="button" onClick={() => onSelect?.(task)} className="min-w-0 flex-1 text-left disabled:cursor-default" disabled={!onSelect}>
                    <p className="break-words text-sm font-black text-[#2f2415]">{task.title || task.titre || task.description || t('shared.tasks.tache')}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#8a7456]"><span className="inline-flex items-center gap-1"><CalendarDays size={13} />{dueDate || t('shared.tasks.sansEcheance')}</span><span>{taskPriorityOf(task)}</span><span>{statusLabel(taskStatusOf(task))}</span></p>
                  </button>
                  {source && onNavigate ? <button type="button" onClick={() => onNavigate(source, { taskId: task.id })} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#d6c3a0] text-[#6f6048]" title={t('shared.actions.ouvrirSource')} aria-label={t('shared.actions.ouvrirSource')}><ExternalLink size={15} /></button> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p className="border-y border-[#eadcc2] py-6 text-center text-sm text-[#8a7456]">{t('commun.etats.vide')}</p>}
    </section>
  );
}
