import toast from 'react-hot-toast';
import { fmtCurrency } from '../../utils/format';
import CommercialRelancesPanel from './CommercialRelancesPanel.jsx';
import { buildScheduledRelanceTask } from '../../utils/commercialScheduledRelances.js';

export default function CommercialScheduledRelancesPanel({
  rows = [],
  onCreateTask,
  onRefreshTasks,
  onOpenClient,
  onPrepareWhatsApp,
}) {
  const schedule = async (row) => {
    const date = window.prompt('Date de relance (AAAA-MM-JJ)', row.dueDate || new Date().toISOString().slice(0, 10));
    if (!date) return;
    const task = buildScheduledRelanceTask({ relance: { ...row, dueDate: date } });
    await onCreateTask?.(task);
    await onRefreshTasks?.();
    toast.success(`Relance planifiée · ${date}`);
  };

  return (
    <div className="space-y-4">
      <CommercialRelancesPanel rows={rows} onOpenClient={onOpenClient} onPrepareWhatsApp={onPrepareWhatsApp} />
      {rows.length ? (
        <section className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-sm font-black text-[#2f2415] mb-2">Planifier une relance</p>
          <div className="space-y-2">
            {rows.slice(0, 4).map((row) => (
              <div key={`plan-${row.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#eadcc2] bg-white px-3 py-2 text-sm">
                <span className="font-bold text-[#2f2415]">{row.clientName} · {fmtCurrency(row.amount)}</span>
                <button type="button" onClick={() => schedule(row)} className="rounded-lg border border-[#2f2415] px-2 py-1 text-[11px] font-black text-[#2f2415]">
                  {row.scheduled ? `Planifiée ${row.scheduledDate}` : 'Planifier'}
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
