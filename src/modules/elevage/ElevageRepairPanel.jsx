import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { buildElevageGapRows } from '../../utils/elevageIntegrity.js';
import { buildMortalityAlert, buildVaccineReminderTask, buildElevageIssueKey, ELEVAGE_DOMAINS } from '../../utils/elevageWorkflow.js';
import { financeIds } from '../../utils/sideEffectIds.js';
import { avicoleDeadCount, avicoleInitialCount } from '../../utils/avicoleMetrics.js';
import { makeId } from '../../utils/ids.js';

const arr = (v) => (Array.isArray(v) ? v : []);

export default function ElevageRepairPanel({
  alimentationLogs = [],
  sante = [],
  lots = [],
  animaux = [],
  stocks = [],
  productionLogs = [],
  transactions = [],
  tasks = [],
  alertes = [],
  businessEvents = [],
  salesOrders = [],
  onCreateAlert,
  onCreateTask,
  onCreateFinanceTransaction,
  onCreateBusinessEvent,
  onRefresh,
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);

  const gaps = useMemo(() => buildElevageGapRows({
    alimentationLogs,
    sante,
    lots,
    animaux,
    stocks,
    productionLogs,
    transactions,
    tasks,
    alertes,
    businessEvents,
    salesOrders,
  }), [alimentationLogs, sante, lots, animaux, stocks, productionLogs, transactions, tasks, alertes, businessEvents, salesOrders]);

  const repair = async (gap) => {
    setBusy(gap.issue_key);
    try {
      if (gap.repair === 'mortality_alert') {
        const lot = lots.find((l) => l.id === gap.record_id);
        const rate = avicoleInitialCount(lot) > 0 ? (avicoleDeadCount(lot) / avicoleInitialCount(lot)) * 100 : 0;
        const alert = buildMortalityAlert({ lot, rate });
        if (alert) await onCreateAlert?.(alert);
      } else if (gap.repair === 'health_reminder_task') {
        const row = sante.find((h) => h.id === gap.record_id);
        const task = buildVaccineReminderTask({ health: row });
        if (task) await onCreateTask?.(task);
      } else if (gap.repair === 'feeding_finance' || gap.repair === 'health_finance') {
        const log = alimentationLogs.find((r) => r.id === gap.record_id) || sante.find((r) => r.id === gap.record_id);
        const isHealth = gap.repair === 'health_finance';
        const amount = Number(log?.montant_total || log?.cout || 0);
        const id = isHealth ? financeIds.health(gap.record_id) : financeIds.feeding(gap.record_id);
        await onCreateFinanceTransaction?.({
          id,
          type: 'sortie',
          libelle: isHealth ? `Soin ${log?.nom || gap.record_id}` : `Alimentation ${gap.record_id}`,
          montant: amount,
          amount,
          date: log?.date || new Date().toISOString().slice(0, 10),
          categorie: isHealth ? 'Sante' : 'Alimentation',
          source_module: 'elevage',
          source_record_id: gap.record_id,
          issue_key: gap.issue_key,
          side_effects_managed: true,
        });
      } else if (gap.repair === 'mortality_event') {
        const lot = lots.find((l) => l.id === gap.record_id);
        await onCreateBusinessEvent?.({
          id: makeId('EVT'),
          event_type: 'mortalite',
          module_source: 'elevage',
          entity_type: 'lot_avicole',
          entity_id: gap.record_id,
          title: `Mortalité lot ${lot?.name || gap.record_id}`,
          description: 'Événement reconstitué par réparation',
          event_date: new Date().toISOString().slice(0, 10),
          issue_key: buildElevageIssueKey(ELEVAGE_DOMAINS.MORTALITY, gap.record_id, 'repair'),
          side_effects_managed: true,
        });
      } else {
        toast('Réparation manuelle requise dans le module source.');
        return;
      }
      toast.success('Réparation appliquée');
      await onRefresh?.();
    } catch (e) {
      toast.error(e.message || 'Échec réparation');
    } finally {
      setBusy(null);
    }
  };

  if (!gaps.length) return null;

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50/80 p-4">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-black text-amber-900">Contrôle qualité élevage ({gaps.length} écart{gaps.length > 1 ? 's' : ''})</span>
        <span className="text-xs font-bold text-amber-800">{open ? 'Replier' : 'Déplier'}</span>
      </button>
      {open ? (
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {gaps.map((gap) => (
            <li key={gap.issue_key} className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <b className="text-sm text-[#2f2415]">{gap.title}</b>
                <p className="text-xs text-[#8a7456]">{gap.detail}</p>
              </div>
              <button
                type="button"
                disabled={busy === gap.issue_key}
                onClick={() => repair(gap)}
                className="shrink-0 rounded-lg bg-[#22c55e] px-3 py-1.5 text-xs font-black text-[#052e16] disabled:opacity-50"
              >
                {busy === gap.issue_key ? '…' : 'Réparer'}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
