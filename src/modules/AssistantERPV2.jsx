import AssistantERP from './AssistantERP.jsx';
import AssistantERPInsights from './AssistantERPInsights.jsx';
import AuditCoverageMatrixPanel from './AuditCoverageMatrixPanel.jsx';
import ErpAuditPanel from './ErpAuditPanel.jsx';
import GitHubAuditRoadmapPanel from './GitHubAuditRoadmapPanel.jsx';
import HumanUiAuditPanel from './HumanUiAuditPanel.jsx';
import ModuleAuditChecklistPanel from './ModuleAuditChecklistPanel.jsx';

export default function AssistantERPV2(props) {
  return (
    <div className="space-y-6">
      <AssistantERPInsights {...props} />
      <GitHubAuditRoadmapPanel />
      <ErpAuditPanel />
      <AuditCoverageMatrixPanel dataMap={props?.dataMap || {}} />
      <HumanUiAuditPanel />
      <ModuleAuditChecklistPanel />
      <AssistantERP {...props} />
    </div>
  );
}
