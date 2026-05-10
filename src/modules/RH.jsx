import RHEquipe from './RHEquipe.jsx';
import RHTeamManagementBridge from './RHTeamManagementBridge.jsx';

export default function RH(props) {
  return (
    <div className="space-y-6">
      <RHEquipe {...props} />
      <RHTeamManagementBridge />
    </div>
  );
}
