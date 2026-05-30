import ProductionQuestionsPanel from '../../components/ProductionQuestionsPanel.jsx';
import ProductionCycleDecisionPanel from '../ProductionCycleDecisionPanel.jsx';

export default function VisionCyclesTab({
  dataMap = {},
  lots = [],
  animaux = [],
  productionLogs = [],
  onNavigate,
}) {
  return (
    <div className="space-y-5">
      <ProductionQuestionsPanel dataMap={dataMap} onNavigate={onNavigate} />
      <ProductionCycleDecisionPanel
        dataMap={dataMap}
        lots={lots}
        animaux={animaux}
        productionLogs={productionLogs}
        onNavigate={onNavigate}
      />
    </div>
  );
}
