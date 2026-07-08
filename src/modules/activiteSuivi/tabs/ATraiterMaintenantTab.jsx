import AlertTaskBridgePanel from '../../AlertTaskBridgePanel.jsx';
import AlertesCenterV3 from '../../AlertesCenterV3.jsx';
import TachesV3 from '../../TachesV3.jsx';
import ActiviteWorkflowBridge from '../ActiviteWorkflowBridge.jsx';

export default function ATraiterMaintenantTab({
  shared,
  bridgeProps,
  workflowBridgeProps,
  onRefresh,
}) {
  return (
    <div className="space-y-5">
      <AlertTaskBridgePanel {...bridgeProps} />
      <ActiviteWorkflowBridge
        {...workflowBridgeProps}
        onLinked={onRefresh}
      />
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
      <TachesV3 {...shared} />
    </div>
  );
}
