import InternalResourcesHealth from './InternalResourcesHealth.jsx';
import RH from './RH.jsx';

export default function RHV2(props) {
  return <div className="space-y-6">
    <InternalResourcesHealth
      equipements={props.equipements || []}
      transactions={props.transactions || []}
      documents={props.documents || []}
      tasks={props.tasks || []}
      onNavigate={props.onNavigate}
    />
    <RH {...props} />
  </div>;
}
