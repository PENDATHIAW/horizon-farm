import DecisionSalesOpportunitiesPanel from '../DecisionSalesOpportunitiesPanel.jsx';
import ProductionCycleDecisionPanel from '../ProductionCycleDecisionPanel.jsx';
import VisionOpportunitiesTab from '../vision/VisionOpportunitiesTab.jsx';

export default function CentreOpportunitesTab({
  data,
  dataMap = {},
  lots = [],
  animaux = [],
  productionLogs = [],
  cultures = [],
  onNavigate,
}) {
  return (
    <div className="space-y-6">
      <DecisionSalesOpportunitiesPanel
        lots={lots}
        animaux={animaux}
        productionLogs={productionLogs}
        cultures={cultures}
        onNavigate={onNavigate}
      />
      <ProductionCycleDecisionPanel
        dataMap={dataMap}
        lots={lots}
        animaux={animaux}
        productionLogs={productionLogs}
        onNavigate={onNavigate}
      />
      <VisionOpportunitiesTab data={data} onNavigate={onNavigate} />
    </div>
  );
}
