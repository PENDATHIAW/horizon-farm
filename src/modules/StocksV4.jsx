import StocksV3 from './StocksV3.jsx';
import StockEvolution from './StockEvolution.jsx';

export default function StocksV4(props) {
  return (
    <div className="space-y-6">
      <StocksV3 {...props} />
      <StockEvolution rows={props.rows || []} alimentationLogs={props.alimentationLogs || []} />
    </div>
  );
}
