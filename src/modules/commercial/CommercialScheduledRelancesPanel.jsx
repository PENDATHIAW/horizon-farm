import { useState } from 'react';
import toast from 'react-hot-toast';
import QuickInputModal from '../../components/QuickInputModal.jsx';
import { fmtCurrency } from '../../utils/format';
import CommercialRelancesPanel from './CommercialRelancesPanel.jsx';
import { buildScheduledRelanceTask } from '../../utils/commercialScheduledRelances.js';
import { enrichRelanceRowsWithSchedules, RELANCE_LEVELS } from '../../utils/commercialRelanceSchedules.js';

const today = () => new Date().toISOString().slice(0, 10);

export default function CommercialScheduledRelancesPanel({
  rows = [],
  clients = [],
  onCreateTask,
  onRefreshTasks,
  onOpenClient,
  onPrepareWhatsApp,
}) {
  const scheduledPlans = enrichRelanceRowsWithSchedules(rows, clients);
  const [scheduleTarget, setScheduleTarget] = useState(null);
  const [scheduleDate, setScheduleDate] = useState(today());
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const openScheduleModal = (row) => {
    setScheduleTarget(row);
    setScheduleDate(row.scheduledDate || row.dueDate || today());
  };

  const closeScheduleModal = () => {
    if (scheduleSaving) return;
    setScheduleTarget(null);
  };

  const submitSchedule = async () => {
    if (!scheduleTarget || !scheduleDate) return;
    try {
      setScheduleSaving(true);
      const task = buildScheduledRelanceTask({ relance: { ...scheduleTarget, dueDate: scheduleDate } });
      await onCreateTask?.(task);
      await onRefreshTasks?.();
      toast.success(`Relance planifiée · ${scheduleDate}`);
      closeScheduleModal();
    } catch (error) {
      toast.error(error?.message || 'Planification impossible');
    } finally {
      setScheduleSaving(false);
    }
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
      <section className="rounded-2xl border border-line bg-white p-4">
        <p className="text-xs uppercase tracking-normal text-slate font-semibold">Relances planifiées</p>
        <p className="mt-1 text-sm text-slate">
          Niveaux {RELANCE_LEVELS.map((l) => l.label).join(', ')} — messages WhatsApp, SMS et Email générés automatiquement.
        </p>
        {rows.length ? (
          <div className="mt-3 space-y-2">
            {rows.slice(0, 3).map((row) => {
              const plans = scheduledPlans.filter((p) => p.clientId === row.clientId && p.orderId === row.orderId).slice(0, 3);
              return (
                <div key={`plan-block-${row.id}`} className="rounded-xl border border-line bg-card p-3">
                  <p className="font-semibold text-sm text-earth">{row.clientName} · {fmtCurrency(row.amount)}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {plans.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => prepareChannel(plan)}
                        className="rounded-lg border border-earth px-2 py-1 text-meta font-semibold text-earth"
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
          <p className="mt-2 text-sm text-slate">Aucune créance à relancer pour générer un plan de relance.</p>
        )}
      </section>

      <CommercialRelancesPanel rows={rows} onOpenClient={onOpenClient} onPrepareWhatsApp={onPrepareWhatsApp} />

      {rows.length ? (
        <section className="rounded-2xl border border-line bg-card p-4">
          <p className="text-sm font-semibold text-earth mb-2">Planifier une relance (tâche)</p>
          <div className="space-y-2">
            {rows.slice(0, 4).map((row) => (
              <div key={`plan-${row.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm">
                <span className="font-semibold text-earth">{row.clientName} · {fmtCurrency(row.amount)}</span>
                <button type="button" onClick={() => openScheduleModal(row)} className="rounded-lg border border-earth px-2 py-1 text-meta font-semibold text-earth">
                  {row.scheduled ? `Planifiée ${row.scheduledDate}` : 'Planifier'}
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <QuickInputModal
        open={Boolean(scheduleTarget)}
        title="Planifier une relance"
        description={scheduleTarget ? `${scheduleTarget.clientName} · ${fmtCurrency(scheduleTarget.amount)}` : ''}
        label="Date de relance"
        type="date"
        value={scheduleDate}
        onChange={setScheduleDate}
        submitLabel="Créer la tâche"
        onClose={closeScheduleModal}
        onSubmit={submitSchedule}
        busy={scheduleSaving}
      />
    </div>
  );
}
