import Stock from './Stocks.jsx';
import StockFlowPanel from './StockFlowPanel.jsx';
import StockStatusPanel from './StockStatusPanel.jsx';

export default function StocksV2(props) {
  return (
    <div className="space-y-6">
      <StockStatusPanel {...props} />
      <StockFlowPanel {...props} />
      <Stock {...props} />
    </div>
  );
}
