import RHEquipe from './RHEquipe.jsx';
import RHPayrollPanel from './RHPayrollPanel.jsx';
import RHTeamManagementBridge from './RHTeamManagementBridge.jsx';

export default function RH(props) {
  return (
    <div className="space-y-6">
      <RHEquipe {...props} />
      <RHPayrollPanel />
      <RHTeamManagementBridge />
    </div>
  );
}
