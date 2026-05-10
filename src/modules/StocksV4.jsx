import StocksV3 from './StocksV3.jsx';
import StockEvolution from './StockEvolution.jsx';
import StockFeedingCostPlanner from './StockFeedingCostPlanner.jsx';

export default function StocksV4(props) {
  return (
    <div className="space-y-6">
      <StocksV3 {...props} />
      <StockFeedingCostPlanner
        rows={props.rows || []}
        animaux={props.animaux || []}
        lots={props.lots || []}
      />
      <StockEvolution
        rows={props.rows || []}
        alimentationLogs={props.alimentationLogs || []}
        onNavigate={props.onNavigate}
      />
    </div>
  );
}
