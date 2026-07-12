import AlertTaskBridgePanel from '../../AlertTaskBridgePanel.jsx';
import AlertesCenterV3 from '../../AlertesCenterV3.jsx';

export default function AlertesLieesTab({ shared, bridgeProps }) {
  return (
    <div className="space-y-5">
      <AlertTaskBridgePanel {...bridgeProps} />
      <AlertesCenterV3
        {...shared}
        rows={shared.alertes}
        onCreate={shared.onCreateAlert}
        onUpdate={shared.onUpdateAlert}
        onRefresh={shared.onRefreshAlertes}
        onCreateTask={shared.onCreateTask}
        onUpdateTask={shared.onUpdateTask}
        onRefreshTasks={shared.onRefreshTasks}
        tasks={shared.tasks}
      />
    </div>
  );
}
