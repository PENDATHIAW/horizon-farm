import AnimalCycleHealthPanel from '../AnimalCycleHealthPanel.jsx';
import AvicoleCycleHealthPanel from '../AvicoleCycleHealthPanel.jsx';
import VisionCyclesTab from '../vision/VisionCyclesTab.jsx';

export default function ElevageCyclesPanel({ dataMap, lots, animaux, productionLogs, feedLogs, onNavigate, animalProps, avicoleProps }) {
  return (
    <div className="space-y-5">
      <AnimalCycleHealthPanel
        rows={animaux}
        alimentationLogs={feedLogs}
        vaccins={animalProps.vaccins || []}
        salesOrders={animalProps.salesOrders || []}
        onNavigate={onNavigate}
      />
      <AvicoleCycleHealthPanel
        rows={lots}
        productionLogs={productionLogs}
        alimentationLogs={feedLogs}
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
