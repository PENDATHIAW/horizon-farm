import ActionTraceHealth from './ActionTraceHealth.jsx';
import AlertesCenterTechnical from './AlertesCenterTechnical.jsx';

export default function AlertesCenterV2(props) {
  return <div className="space-y-6">
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
