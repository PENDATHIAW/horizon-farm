import AssistantERP from './AssistantERP.jsx';
import AssistantERPInsights from './AssistantERPInsights.jsx';
import AuditCoverageMatrixPanel from './AuditCoverageMatrixPanel.jsx';
import AuditPackageLauncherPanel from './AuditPackageLauncherPanel.jsx';
import AuditRunAndCorrectionPanel from './AuditRunAndCorrectionPanel.jsx';
import CorrectionDeploymentStatusPanel from './CorrectionDeploymentStatusPanel.jsx';
import ErpAgentConnectorPanel from './ErpAgentConnectorPanel.jsx';
import ErpAuditPanel from './ErpAuditPanel.jsx';
import HumanUiAuditPanel from './HumanUiAuditPanel.jsx';
import ModuleAuditChecklistPanel from './ModuleAuditChecklistPanel.jsx';

export default function AssistantERPV2(props) {
  return (
    <div className="space-y-6">
      <AssistantERPInsights {...props} />
      <CorrectionDeploymentStatusPanel />
      <ErpAgentConnectorPanel />
      <AuditPackageLauncherPanel />
      <AuditRunAndCorrectionPanel />
      <AuditCoverageMatrixPanel dataMap={props?.dataMap || {}} />
      <HumanUiAuditPanel />
      <ModuleAuditChecklistPanel />
      <ErpAuditPanel />
      <AssistantERP {...props} />
    </div>
  );
}
