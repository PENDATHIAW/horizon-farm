import { useMemo, useState } from 'react';
import { AlertTriangle, ListChecks } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';
import { buildActionQueue } from './visionPriorityQueue.js';
import {
  navigateFromPriorityItem,
  runPriorityAlertAction,
  runPriorityFindingAction,
  runPriorityTaskAction,
  runPriorityTreatedAction,
} from './visionPriorityActions.js';
import {
  Btn,
  DataRow,
  DataTable,
  Empty,
  PRIORITY_TABLE_COLS,
  Section,
  TabIntro,
  VisionKpi,
} from './visionUtils';

const DESTINATION_HINTS = {
  Recommandations: '→ Recommandations',
  Cycles: '→ Cycles',
  Risques: '→ Risques',
};

export default function VisionPrioritiesTab({
  data,
  moduleId = 'centre_ia',
  setTab,
  onNavigate,
  onCreateTask,
  onCreateAlert,
  onUpdateAlert,
  onCreateBusinessEvent,
  onRefreshTasks,
  onRefreshAlertes,
  existingTasks = [],
  existingAlerts = [],
}) {
  const [busyId, setBusyId] = useState(null);
  const { today, maintenance } = useMemo(
    () => buildActionQueue(data.priorities || []),
    [data.priorities],
  );
  const openOpps = data.openOpportunities?.length ?? 0;
  const relatedTabs = useMemo(
    () => [...new Set(today.map((item) => item.targetTab).filter(Boolean))],
    [today],
  );

  const actionHandlers = {
    onNavigate,
    onCreateTask,
    onCreateAlert,
    onUpdateAlert,
    onCreateBusinessEvent,
    onRefreshTasks,
    onRefreshAlertes,
    existingTasks,
    existingAlerts,
    setTab,
    moduleId,
  };

  const withBusy = async (item, fn) => {
    setBusyId(item.id);
    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  };

  const renderActions = (item) => {
    if (item.isEngine && item.finding) {
      return (
        <>
          <button
            type="button"
            disabled={busyId === item.id}
            onClick={(event) => {
              event.stopPropagation();
              void withBusy(item, () => runPriorityFindingAction(item, actionHandlers));
            }}
            className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50"
          >
            {busyId === item.id ? '…' : item.finding?.auto_action === 'create_task' ? 'Créer tâche' : item.finding?.auto_action === 'create_alert' ? 'Créer alerte' : 'Appliquer'}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              navigateFromPriorityItem(item, actionHandlers);
            }}
            className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black"
          >
            Ouvrir
          </button>
        </>
      );
    }

    return (
      <>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            navigateFromPriorityItem(item, actionHandlers);
          }}
          className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black"
        >
          Ouvrir
        </button>
        {onCreateTask ? (
          <button
            type="button"
            disabled={busyId === item.id}
            onClick={(event) => {
              event.stopPropagation();
              void withBusy(item, () => runPriorityTaskAction(item, actionHandlers));
            }}
            className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-black text-emerald-700 disabled:opacity-50"
          >
            {item.kind === 'tache' ? 'Voir tâche' : 'Tâche'}
          </button>
        ) : null}
        {onCreateAlert ? (
          <button
            type="button"
            disabled={busyId === item.id}
            onClick={(event) => {
              event.stopPropagation();
              void withBusy(item, () => runPriorityAlertAction(item, actionHandlers));
            }}
            className="rounded-lg border border-amber-300 px-2 py-1 text-xs font-black text-amber-700 disabled:opacity-50"
          >
            {item.kind === 'alerte' ? 'Voir alerte' : 'Alerte'}
          </button>
        ) : null}
        {onCreateBusinessEvent ? (
          <button
            type="button"
            disabled={busyId === item.id}
            onClick={(event) => {
              event.stopPropagation();
              void withBusy(item, () => runPriorityTreatedAction(item, actionHandlers));
            }}
            className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black disabled:opacity-50"
          >
            Traité
          </button>
        ) : null}
      </>
    );
  };

  const renderRow = (item, statusOverride) => (
    <DataRow
      key={item.id}
      title={item.title}
      subtitle={item.sourceLabel}
      detail={item.whatToDo || item.detail}
      status={statusOverride || item.priorityLabel}
      statusHint={item.targetTab ? DESTINATION_HINTS[item.targetTab] : null}
      tone={item.tone}
      onClick={() => navigateFromPriorityItem(item, actionHandlers)}
      actions={renderActions(item)}
    />
  );

  return (
    <div className="space-y-5">
      <TabIntro
        title="À traiter aujourd'hui"
        detail="Une seule file : alertes ouvertes, tâches urgentes et signaux IA — sans doublon. Colonne « Que faire » = action concrète. Les recos commerciales détaillées sont dans Recommandations."
        action={onNavigate ? <Btn onClick={() => setTab?.('Recommandations')}>Recommandations</Btn> : null}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <VisionKpi label="Santé ERP" value={`${data.healthScore ?? data.globalScore}/100`} tone={(data.healthScore ?? data.globalScore) >= 75 ? 'good' : 'warn'} onClick={() => setTab?.('Risques')} />
        <VisionKpi label="Résultat trésorerie" value={fmtCurrency(data.treasuryResult ?? data.balance)} tone={(data.treasuryResult ?? data.balance) >= 0 ? 'good' : 'bad'} detail={data.periodFiltered ? 'Période active' : 'Cumul'} onClick={() => onNavigate?.('finance_pilotage', { tab: 'Trésorerie' })} />
        <VisionKpi label="File du jour" value={today.length} tone={today.length ? 'warn' : 'good'} detail={`${today.filter((r) => r.kind === 'alerte').length} alerte(s) · ${today.filter((r) => r.kind === 'tache').length} tâche(s)`} />
        <VisionKpi label="Créances" value={fmtCurrency(data.receivable)} tone={data.receivable ? 'warn' : 'good'} onClick={() => onNavigate?.('commercial', { tab: 'Clients' })} />
        <VisionKpi label="Opportunités ouvertes" value={openOpps} tone={openOpps ? 'good' : 'neutral'} onClick={() => setTab?.('Recommandations')} />
      </div>

      <Section icon={ListChecks} title="File du jour — actions concrètes">
        {today.length ? (
          <DataTable columns={PRIORITY_TABLE_COLS}>
            {today.map((item) => renderRow(item))}
          </DataTable>
        ) : (
          <Empty>
            Rien d&apos;urgent aujourd&apos;hui. Consultez l&apos;onglet <b>Recommandations</b> pour la demande clients, ou <b>Cycles / Risques</b> pour le timing production.
          </Empty>
        )}
      </Section>

      {maintenance.length ? (
        <details className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <summary className="cursor-pointer text-sm font-black text-[#8a7456]">
            Maintenance ERP ({maintenance.length}) — doublons navigation, structure modules
          </summary>
          <div className="mt-4">
            <DataTable columns={PRIORITY_TABLE_COLS}>
              {maintenance.map((item) => renderRow(item, 'Technique'))}
            </DataTable>
          </div>
        </details>
      ) : null}

      {relatedTabs.length ? (
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-xs text-[#7d6a4a] flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1"><AlertTriangle size={14} /> Recos liées détectées dans la file :</span>
          {relatedTabs.includes('Recommandations') ? (
            <button type="button" onClick={() => setTab?.('Recommandations')} className="font-black text-[#9a6b12] underline">Recommandations (marge & demande)</button>
          ) : null}
          {relatedTabs.includes('Cycles') ? (
            <button type="button" onClick={() => setTab?.('Cycles')} className="font-black text-[#9a6b12] underline">Cycles (QUAND LANCER)</button>
          ) : null}
          {relatedTabs.includes('Risques') ? (
            <button type="button" onClick={() => setTab?.('Risques')} className="font-black text-[#9a6b12] underline">Risques (QUAND VENDRE)</button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
