import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, ListChecks } from 'lucide-react';
import { applyOneClickRecommendation } from '../../services/heyHorizonRecommendationActions.js';
import { buildObjectiveActionTask } from '../../utils/objectivesWorkflows';
import { fmtCurrency } from '../../utils/format';
import { openVisionPriority } from './visionMetrics.js';
import { navigateVisionFinding, navigateVisionPriority as navFromItem } from './visionNavigation.js';
import { buildActionQueue } from './visionPriorityQueue.js';
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

  const actionHandlers = {
    onNavigate,
    onCreateTask,
    onCreateAlert,
    onUpdateAlert,
    onCreateBusinessEvent,
    existingTasks,
    existingAlerts,
  };

  const openItem = (item) => {
    if (item.targetTab && setTab) {
      setTab(item.targetTab);
      return;
    }
    if (item.isEngine && item.finding) {
      navigateVisionFinding(onNavigate, item.finding);
      return;
    }
    openVisionPriority(item, moduleId, { setTab, onNavigate });
  };

  const applyFinding = async (item) => {
    if (!item.finding) return;
    setBusyId(item.id);
    try {
      const result = await applyOneClickRecommendation(item.finding, actionHandlers);
      if (result.createdTasks || result.createdAlerts) {
        toast.success(`${result.createdTasks || 0} tâche(s), ${result.createdAlerts || 0} alerte(s)`);
        await onRefreshTasks?.();
        await onRefreshAlertes?.();
      } else {
        toast.success('Module ouvert');
      }
    } catch (e) {
      toast.error(e.message || 'Action impossible');
    } finally {
      setBusyId(null);
    }
  };

  const markTreated = async (item) => {
    if (!onCreateBusinessEvent) return;
    await onCreateBusinessEvent({
      event_type: 'priorite_traitee',
      module_source: moduleId,
      entity_id: item.id,
      title: `Priorité traitée : ${item.title}`,
      event_date: new Date().toISOString().slice(0, 10),
      severity: 'info',
    });
    toast.success('Priorité marquée comme traitée');
  };

  const createTask = async (item) => {
    if (!onCreateTask) return;
    const built = buildObjectiveActionTask({ label: item.title, activity: item.sourceModule || 'global' });
    await onCreateTask({
      ...built.task,
      title: `Traiter : ${item.title}`,
      notes: item.detail,
    });
    await onRefreshTasks?.();
    toast.success('Tâche créée');
  };

  const createAlert = async (item) => {
    if (!onCreateAlert) return;
    await onCreateAlert({
      title: item.title,
      message: item.detail,
      module_source: moduleId,
      severity: item.tone === 'bad' ? 'critique' : 'warning',
      status: 'nouvelle',
      action_recommandee: item.detail || 'Voir Centre décisionnel',
    });
    await onRefreshAlertes?.();
    toast.success('Alerte créée');
  };

  const renderActions = (item) => {
    if (item.isEngine && item.finding) {
      return (
        <>
          <button
            type="button"
            disabled={busyId === item.id}
            onClick={() => applyFinding(item)}
            className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50"
          >
            {busyId === item.id ? '…' : item.finding?.auto_action === 'create_task' ? 'Créer tâche' : item.finding?.auto_action === 'create_alert' ? 'Créer alerte' : 'Appliquer'}
          </button>
          <button type="button" onClick={() => navigateVisionFinding(onNavigate, item.finding)} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">
            Voir source
          </button>
        </>
      );
    }

    return (
      <>
        <button type="button" onClick={() => navFromItem(onNavigate, item)} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">
          Ouvrir
        </button>
        {onCreateTask ? (
          <button type="button" onClick={() => createTask(item)} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-black text-emerald-700">
            Tâche
          </button>
        ) : null}
        {onCreateAlert && item.kind !== 'alerte' ? (
          <button type="button" onClick={() => createAlert(item)} className="rounded-lg border border-amber-300 px-2 py-1 text-xs font-black text-amber-700">
            Alerte
          </button>
        ) : null}
        <button type="button" onClick={() => markTreated(item)} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">
          Traité
        </button>
      </>
    );
  };

  return (
    <div className="space-y-5">
      <TabIntro
        title="À traiter aujourd'hui"
        detail="Une seule file : alertes ouvertes, tâches urgentes et signaux IA complémentaires — sans doublon. Les recommandations commerciales et investissement sont dans l'onglet Recommandations."
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
            {today.map((item) => (
              <DataRow
                key={item.id}
                title={item.title}
                subtitle={item.sourceLabel}
                detail={item.detail}
                status={item.priorityLabel}
                tone={item.tone}
                onClick={() => openItem(item)}
                actions={renderActions(item)}
              />
            ))}
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
              {maintenance.map((item) => (
                <DataRow
                  key={item.id}
                  title={item.title}
                  subtitle={item.sourceLabel}
                  detail={item.detail}
                  status="Technique"
                  tone="neutral"
                  onClick={() => openItem(item)}
                  actions={renderActions(item)}
                />
              ))}
            </DataTable>
          </div>
        </details>
      ) : null}

      {today.some((item) => item.targetTab === 'Cycles' || item.targetTab === 'Risques') ? (
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-xs text-[#7d6a4a] flex flex-wrap gap-3">
          <span className="flex items-center gap-1"><AlertTriangle size={14} /> Timing production ou vente détecté :</span>
          <button type="button" onClick={() => setTab?.('Cycles')} className="font-black text-[#9a6b12] underline">Voir Cycles (QUAND LANCER)</button>
          <button type="button" onClick={() => setTab?.('Risques')} className="font-black text-[#9a6b12] underline">Voir Risques (QUAND VENDRE)</button>
        </div>
      ) : null}
    </div>
  );
}
