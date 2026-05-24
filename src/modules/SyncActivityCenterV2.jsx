import ActionTraceHealth from './ActionTraceHealth.jsx';
import SyncActivityCenter from './SyncActivityCenter.jsx';

export default function SyncActivityCenterV2(props) {
  return <div className="space-y-6">
    <ActionTraceHealth
      tasks={props.tasks || []}
      alertes={props.alertes || []}
      events={props.businessEvents || []}
      auditLogs={props.auditLogs || []}
      online={props.online}
      onNavigate={props.onNavigate}
    />
    <SyncActivityCenter {...props} />
  </div>;
}
