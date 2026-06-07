import { useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, BrainCircuit } from 'lucide-react';
import { applyOneClickRecommendation } from '../../services/heyHorizonRecommendationActions.js';
import { buildObjectiveActionTask } from '../../utils/objectivesWorkflows';
import { fmtCurrency } from '../../utils/format';
import { openVisionPriority } from './visionMetrics.js';
import { navigateVisionFinding, navigateVisionPriority as navFromItem } from './visionNavigation.js';
import VisionDecisionEnginePanels from './VisionDecisionEnginePanels.jsx';
import { Btn, DataRow, DataTable, Empty, Section, TabIntro, VISION_TABLE_COLS, VisionKpi } from './visionUtils';

export default function VisionPrioritiesTab({
  data,
  dataMap = {},
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
  const engineRows = data.priorities.filter((p) => p.isEngine);
  const manualRows = data.priorities.filter((p) => !p.isEngine);
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
    if (onCreateBusinessEvent) {
      await onCreateBusinessEvent({
        event_type: 'priorite_traitee',
        module_source: moduleId,
        entity_id: item.id,
        title: `Priorité traitée : ${item.title}`,
        event_date: new Date().toISOString().slice(0, 10),
        severity: 'info',
      });
      toast.success('Priorité marquée comme traitée');
    }
  };

  const createTask = async (item) => {
    if (!onCreateTask) return;
    const built = buildObjectiveActionTask({ label: item.title, activity: item.sourceModule || 'global' });
    await onCreateTask({ ...built.task, title: `Traiter : ${item.title}`, notes: item.detail });
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

  return (
    <div className="space-y-5">
      <TabIntro
        title="Priorités actionnables"
        detail={data.periodLabel ? `Lecture financière sur ${data.periodLabel} — créances sur l'historique complet.` : 'Signaux IA et alertes terrain à traiter en priorité.'}
        action={onNavigate ? <Btn onClick={() => onNavigate('activite_suivi', { tab: 'Tâches' })}>Activité & Suivi</Btn> : null}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <VisionKpi label="Santé ERP" value={`${data.healthScore ?? data.globalScore}/100`} tone={(data.healthScore ?? data.globalScore) >= 75 ? 'good' : 'warn'} onClick={() => setTab?.('Risques')} />
        <VisionKpi label="Résultat trésorerie" value={fmtCurrency(data.treasuryResult ?? data.balance)} tone={(data.treasuryResult ?? data.balance) >= 0 ? 'good' : 'bad'} detail={data.periodFiltered ? 'Période active' : 'Cumul'} onClick={() => onNavigate?.('finance_pilotage', { tab: 'Trésorerie' })} />
        <VisionKpi label="À traiter" value={data.priorities.length} tone={data.priorities.length ? 'warn' : 'good'} detail={`${engineRows.length} IA · ${manualRows.length} terrain`} />
        <VisionKpi label="Créances" value={fmtCurrency(data.receivable)} tone={data.receivable ? 'warn' : 'good'} onClick={() => onNavigate?.('commercial', { tab: 'Clients' })} />
        <VisionKpi label="Opportunités ouvertes" value={openOpps} tone={openOpps ? 'good' : 'neutral'} onClick={() => setTab?.('Opportunités')} />
      </div>
      <Section icon={BrainCircuit} title="Recommandations IA — actions directes">
        {engineRows.length ? (
          <DataTable columns={VISION_TABLE_COLS}>
            {engineRows.slice(0, 12).map((r) => (
              <DataRow
                key={r.id}
                title={r.title}
                detail={r.detail}
                status="IA"
                tone={r.tone}
                onClick={() => navigateVisionFinding(onNavigate, r.finding)}
                actions={<>
                  <button type="button" disabled={busyId === r.id} onClick={() => applyFinding(r)} className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50">
                    {busyId === r.id ? '…' : r.finding?.auto_action === 'create_task' ? 'Créer tâche' : r.finding?.auto_action === 'create_alert' ? 'Créer alerte' : 'Appliquer'}
                  </button>
                  <button type="button" onClick={() => navigateVisionFinding(onNavigate, r.finding)} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">Voir source</button>
                </>}
              />
            ))}
          </DataTable>
        ) : <Empty>Aucune recommandation IA active. Le moteur analyse ventes, stock, trésorerie et santé en continu.</Empty>}
      </Section>
      <Section icon={AlertTriangle} title="Ce qu'il faut traiter maintenant">
        {manualRows.length ? (
          <DataTable columns={VISION_TABLE_COLS}>
            {manualRows.slice(0, 12).map((r) => (
              <DataRow
                key={r.id}
                title={r.title}
                detail={r.detail}
                status={r.value}
                tone={r.tone}
                onClick={() => openVisionPriority(r, moduleId, { setTab, onNavigate })}
                actions={<>
                  <button type="button" onClick={() => navFromItem(onNavigate, r)} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">Voir source</button>
                  {onCreateTask ? <button type="button" onClick={() => createTask(r)} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-black text-emerald-700">Tâche</button> : null}
                  {onCreateAlert ? <button type="button" onClick={() => createAlert(r)} className="rounded-lg border border-amber-300 px-2 py-1 text-xs font-black text-amber-700">Alerte</button> : null}
                  <button type="button" onClick={() => markTreated(r)} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">Traité</button>
                </>}
              />
            ))}
          </DataTable>
        ) : !engineRows.length ? <Empty>Aucune priorité en attente. Continuez à saisir ventes, stock et santé pour enrichir le pilotage.</Empty> : null}
      </Section>
      {moduleId === 'centre_ia' ? (
        <VisionDecisionEnginePanels dataMap={dataMap} onNavigate={onNavigate} onCreateTask={onCreateTask} onRefreshTasks={onRefreshTasks} onCreateBusinessEvent={onCreateBusinessEvent} />
      ) : null}
    </div>
  );
}
