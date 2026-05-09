import Stock from './Stocks.jsx';
import StockFlowPanel from './StockFlowPanel.jsx';

export default function StocksV2(props) {
  return (
    <div className="space-y-6">
      <StockFlowPanel {...props} />
      <Stock {...props} />
    </div>
  );
}
