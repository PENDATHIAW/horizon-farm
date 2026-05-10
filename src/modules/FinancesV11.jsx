import FinancesV10 from './FinancesV10.jsx';
import FinanceEvolution from './FinanceEvolution.jsx';

export default function FinancesV11(props) {
  return (
    <div className="space-y-6">
      <FinancesV10 {...props} />
      <FinanceEvolution
        rows={props.rows || []}
        salesOrders={props.salesOrders || []}
        payments={props.payments || []}
        onNavigate={props.onNavigate}
      />
    </div>
  );
}
