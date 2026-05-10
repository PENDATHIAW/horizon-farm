import StocksV3 from './StocksV3.jsx';
import StockEvolution from './StockEvolution.jsx';
import StockFeedingCostPlanner from './StockFeedingCostPlanner.jsx';
import StockLossFinanceBridge from './StockLossFinanceBridge.jsx';

export default function StocksV4(props) {
  return (
    <div className="space-y-6">
      <StocksV3 {...props} />
      <StockLossFinanceBridge
        rows={props.rows || []}
        onUpdate={props.onUpdate}
        onRefresh={props.onRefresh}
        onCreateFinanceTransaction={props.onCreateFinanceTransaction}
        onRefreshFinances={props.onRefreshFinances}
        onCreateBusinessEvent={props.onCreateBusinessEvent}
        onRefreshBusinessEvents={props.onRefreshBusinessEvents}
      />
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
