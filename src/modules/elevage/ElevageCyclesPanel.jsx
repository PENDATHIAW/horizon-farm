import AnimalCycleHealthPanel from '../AnimalCycleHealthPanel.jsx';
import AvicoleCycleHealthPanel from '../AvicoleCycleHealthPanel.jsx';
import VisionCyclesTab from '../vision/VisionCyclesTab.jsx';

export default function ElevageCyclesPanel({ dataMap, lots, animaux, productionLogs, alimentationLogs, feedLogs, animalProps, avicoleProps, onNavigate }) {
  return (
    <div className="space-y-5">
      <AnimalCycleHealthPanel
        rows={animalProps.rows || animaux || []}
        alimentationLogs={alimentationLogs || feedLogs || []}
        vaccins={animalProps.vaccins || []}
        salesOrders={animalProps.salesOrders || []}
        onNavigate={onNavigate}
      />
      <AvicoleCycleHealthPanel
        rows={avicoleProps.rows || lots || []}
        productionLogs={productionLogs || []}
        alimentationLogs={alimentationLogs || feedLogs || []}
        onNavigate={onNavigate}
      />
      <VisionCyclesTab
        dataMap={dataMap}
        lots={lots}
        animaux={animaux}
        productionLogs={productionLogs}
        onNavigate={onNavigate}
      />
    </div>
  );
}
