import AssistantERP from './AssistantERP.jsx';
import AssistantERPInsights from './AssistantERPInsights.jsx';
import AuditPackageLauncherPanel from './AuditPackageLauncherPanel.jsx';
import AuditRunAndCorrectionPanel from './AuditRunAndCorrectionPanel.jsx';
import ErpAgentConnectorPanel from './ErpAgentConnectorPanel.jsx';
import ErpAuditPanel from './ErpAuditPanel.jsx';
import ModuleAuditChecklistPanel from './ModuleAuditChecklistPanel.jsx';

export default function AssistantERPV2(props) {
  return (
    <div className="space-y-6">
      <AssistantERPInsights {...props} />
      <ErpAgentConnectorPanel />
      <AuditPackageLauncherPanel />
      <AuditRunAndCorrectionPanel />
      <ModuleAuditChecklistPanel />
      <ErpAuditPanel />
      <AssistantERP {...props} />
    </div>
  );
}
