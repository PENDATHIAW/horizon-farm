import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import useCrudModule from '../../hooks/useCrudModule';

import {
  buildProblemFiches,
  completeActiviteTask,
  createLinkedTaskFromAlert,
  resolveActiviteAlert,
} from '../../utils/activiteSuiviWorkflow.js';
import ActiviteGapRepairPanel from './ActiviteGapRepairPanel.jsx';
import ActiviteProblemFichePanel from './ActiviteProblemFichePanel.jsx';

const arr = (value) => (Array.isArray(value) ? value : []);

export default function ActiviteWorkflowBridge({
  props = {},
  alertes = [],
  tasks = [],
  recommendations = [],
  businessEvents = [],
  documents = [],
  transactions = [],
  showGaps = true,
  showFiches = true,
}) {
  const [selectedKey, setSelectedKey] = useState('');
  const [busyId, setBusyId] = useState(null);
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');
  const eventsCrud = useCrudModule('business_events');

  const context = useMemo(() => ({
    alertes,
    tasks,
    recommendations,
    businessEvents,
    documents,
    transactions,
  }), [alertes, tasks, recommendations, businessEvents, documents, transactions]);

  const fiches = useMemo(() => buildProblemFiches(context), [context]);

  const handlers = useMemo(() => ({
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onUpdateTask: props.onUpdateTask || tasksCrud.update,
    onUpdateAlert: props.onUpdateAlert || alertsCrud.update,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
  }), [props, tasksCrud, alertsCrud, eventsCrud]);

  const refreshAll = async () => {
    await Promise.allSettled([
      props.onRefreshTasks?.(),
      props.onRefreshAlertes?.(),
      props.onRefreshBusinessEvents?.(),
      tasksCrud.refresh?.(),
      alertsCrud.refresh?.(),
      eventsCrud.refresh?.(),
    ]);
  };

  const createTaskForAlert = async (alertId) => {
    const alert = arr(alertes).find((row) => String(row.id) === String(alertId));
    if (!alert) throw new Error('Alerte introuvable');
    setBusyId(alertId);
    try {
      await createLinkedTaskFromAlert({ alert, context, handlers });
      await refreshAll();
      toast.success('Tâche liée créée');
    } finally {
      setBusyId(null);
    }
  };

  const resolveAlertById = async (alertId) => {
    const alert = arr(alertes).find((row) => String(row.id) === String(alertId));
    if (!alert) throw new Error('Alerte introuvable');
    setBusyId(alertId);
    try {
      await resolveActiviteAlert({ alert, handlers });
      await refreshAll();
      toast.success('Alerte résolue');
    } finally {
      setBusyId(null);
    }
  };



  const repairGap = async (gap) => {
    setBusyId(gap.record_id);
    try {
      if (gap.repair === 'create_task') await createTaskForAlert(gap.record_id);
      else if (gap.repair === 'resolve_alert') await resolveAlertById(gap.record_id);
      else toast('Écart signalé — action manuelle requise');
    } catch (error) {
      toast.error(error.message || 'Correction impossible');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {showFiches ? (
        <ActiviteProblemFichePanel
          fiches={fiches}
          selectedKey={selectedKey || fiches[0]?.issue_key}
          onSelect={setSelectedKey}
        />
      ) : null}
      {showGaps ? (
        <ActiviteGapRepairPanel
          alertes={alertes}
          tasks={tasks}
          recommendations={recommendations}
          onRepair={repairGap}
          busyId={busyId}
        />
      ) : null}
    </div>
  );
}

export { completeActiviteTask, createLinkedTaskFromAlert, resolveActiviteAlert };
