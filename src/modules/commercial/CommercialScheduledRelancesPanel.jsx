import toast from 'react-hot-toast';
import { fmtCurrency } from '../../utils/format';
import CommercialRelancesPanel from './CommercialRelancesPanel.jsx';
import { buildScheduledRelanceTask } from '../../utils/commercialScheduledRelances.js';
import { enrichRelanceRowsWithSchedules, RELANCE_LEVELS } from '../../utils/commercialRelanceSchedules.js';

export default function CommercialScheduledRelancesPanel({
  rows = [],
  clients = [],
  onCreateTask,
  onRefreshTasks,
  onOpenClient,
  onPrepareWhatsApp,
}) {
  const scheduledPlans = enrichRelanceRowsWithSchedules(rows, clients);

  const schedule = async (row) => {
    const date = window.prompt('Date de relance (AAAA-MM-JJ)', row.scheduledDate || row.dueDate || new Date().toISOString().slice(0, 10));
    if (!date) return;
    const task = buildScheduledRelanceTask({ relance: { ...row, dueDate: date } });
    await onCreateTask?.(task);
    await onRefreshTasks?.();
    toast.success(`Relance planifiée · ${date}`);
  };

  const prepareChannel = async (plan) => {
    await onPrepareWhatsApp?.({
      ...plan,
      clientId: plan.clientId,
      clientName: plan.clientName,
      message: plan.message,
      type: `relance_${plan.level}`,
      channel: plan.channel,
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Relances IA planifiées</p>
        <p className="mt-1 text-sm text-[#8a7456]">
          Niveaux {RELANCE_LEVELS.map((l) => l.label).join(', ')} — messages WhatsApp, SMS et Email générés automatiquement.
        </p>
        {rows.length ? (
          <div className="mt-3 space-y-2">
            {rows.slice(0, 3).map((row) => {
              const plans = scheduledPlans.filter((p) => p.clientId === row.clientId && p.orderId === row.orderId).slice(0, 3);
              return (
                <div key={`plan-block-${row.id}`} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
                  <p className="font-black text-sm text-[#2f2415]">{row.clientName} · {fmtCurrency(row.amount)}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {plans.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => prepareChannel(plan)}
                        className="rounded-lg border border-[#2f2415] px-2 py-1 text-[10px] font-black text-[#2f2415]"
                      >
                        {plan.levelLabel} · {plan.channel}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#8a7456]">Aucune créance à relancer pour générer un plan IA.</p>
        )}
      </section>

      <CommercialRelancesPanel rows={rows} onOpenClient={onOpenClient} onPrepareWhatsApp={onPrepareWhatsApp} />

      {rows.length ? (
        <section className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-sm font-black text-[#2f2415] mb-2">Planifier une relance (tâche)</p>
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
