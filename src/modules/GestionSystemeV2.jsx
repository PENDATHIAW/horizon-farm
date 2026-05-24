import InternalResourcesHealth from './InternalResourcesHealth.jsx';
import GestionSysteme from './GestionSysteme.jsx';

export default function GestionSystemeV2(props) {
  return <div className="space-y-6">
    <InternalResourcesHealth
      equipements={props.equipements || []}
      transactions={props.transactions || []}
      documents={props.documents || []}
      tasks={props.tasks || []}
      onNavigate={props.onNavigate}
    />
    <GestionSysteme {...props} />
  </div>;
}
