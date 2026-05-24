import ActionTraceHealth from './ActionTraceHealth.jsx';
import AlertTaskBridgePanel from './AlertTaskBridgePanel.jsx';
import AlertesCenterTechnical from './AlertesCenterTechnical.jsx';

export default function AlertesCenterV2(props) {
  return <div className="space-y-6">
    <AlertTaskBridgePanel
      alertes={props.alertes || []}
      tasks={props.tasks || []}
      onCreateTask={props.onCreateTask}
      onRefreshTasks={props.onRefreshTasks}
      onUpdateAlert={props.onUpdate}
      onRefreshAlertes={props.onRefresh}
      onNavigate={props.onNavigate}
    />
    <ActionTraceHealth
      tasks={props.tasks || []}
      alertes={props.alertes || []}
      events={props.businessEvents || []}
      online={props.online ?? true}
      onNavigate={props.onNavigate}
    />
    <AlertesCenterTechnical {...props} />
  </div>;
}
