import AssistantERP from './AssistantERP.jsx';
import AssistantERPInsights from './AssistantERPInsights.jsx';
import AssistantERPQuickAnswers from './AssistantERPQuickAnswers.jsx';

export default function AssistantERPV2(props) {
  return (
    <div className="space-y-6">
      <AssistantERPInsights {...props} />
      <AssistantERPQuickAnswers {...props} />
      <AssistantERP {...props} />
    </div>
  );
}
