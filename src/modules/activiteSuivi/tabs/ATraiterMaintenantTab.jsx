import TachesV3 from '../../TachesV3.jsx';
import ActiviteWorkflowBridge from '../ActiviteWorkflowBridge.jsx';

export default function ATraiterMaintenantTab({
  shared,
  workflowBridgeProps,
  onRefresh,
}) {
  return (
    <div className="space-y-5">
      <ActiviteWorkflowBridge
        {...workflowBridgeProps}
        onLinked={onRefresh}
      />
      <TachesV3 {...shared} />
    </div>
  );
}
