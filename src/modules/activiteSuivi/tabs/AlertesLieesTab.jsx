import toast from 'react-hot-toast';
import ListeAlertes from '../../../components/shared/ListeAlertes.jsx';
import {
  bridgeCloseTaskFromResolvedAlert,
  bridgeCreateTaskFromAlert,
} from '../../../services/alertTaskBridgeService.js';

const OPEN_STATUSES = ['nouvelle', 'ouverte', 'open', 'pending', 'a_traiter'];

export default function AlertesLieesTab({ shared, bridgeProps }) {
  const handlers = {
    tasks: bridgeProps.tasks,
    onCreateTask: bridgeProps.onCreateTask,
    onUpdateTask: bridgeProps.onUpdateTask,
    onUpdateAlert: bridgeProps.onUpdateAlert,
    onRefreshTasks: bridgeProps.onRefreshTasks,
    onRefreshAlertes: bridgeProps.onRefreshAlertes,
    onCreateBusinessEvent: bridgeProps.onCreateBusinessEvent,
  };

  const createTask = async (alert) => {
    try {
      await bridgeCreateTaskFromAlert(alert, handlers);
      toast.success('Tâche créée depuis l’alerte');
    } catch (error) {
      toast.error(error?.message || 'Création de tâche impossible');
    }
  };

  const resolveAlert = async (alert) => {
    try {
      await bridgeProps.onUpdateAlert?.(alert.id, { status: 'traitee', statut: 'traitee', treated_at: new Date().toISOString() });
      await bridgeCloseTaskFromResolvedAlert(alert, bridgeProps.tasks, handlers);
      await bridgeProps.onRefreshAlertes?.();
      toast.success('Alerte résolue');
    } catch (error) {
      toast.error(error?.message || 'Résolution impossible');
    }
  };

  return (
    <ListeAlertes
      alertes={shared.alertes}
      farmId={shared.activeFarm?.id || shared.farm?.id}
      statuses={OPEN_STATUSES}
      period={shared.periodScope}
      onNavigate={shared.onNavigate}
      onAction={bridgeProps.onCreateTask ? createTask : undefined}
      onResolve={bridgeProps.onUpdateAlert ? resolveAlert : undefined}
    />
  );
}
