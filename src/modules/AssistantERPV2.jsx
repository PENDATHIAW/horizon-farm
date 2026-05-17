import AssistantERP from './AssistantERP.jsx';
import AssistantERPInsights from './AssistantERPInsights.jsx';
import ErpAuditPanel from './ErpAuditPanel.jsx';

export default function AssistantERPV2(props) {
  return (
    <div className="space-y-6">
      <AssistantERPInsights {...props} />
      <ErpAuditPanel />
      <AssistantERP {...props} />
    </div>
  );
}
