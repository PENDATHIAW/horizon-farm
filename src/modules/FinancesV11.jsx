import FinancesV10 from './FinancesV10.jsx';
import FinanceEvolution from './FinanceEvolution.jsx';
import FinanceConsolidationPanel from './FinanceConsolidationPanel.jsx';

export default function FinancesV11(props) {
  return (
    <div className="space-y-6">
      <FinanceConsolidationPanel
        rows={props.rows || []}
        salesOrders={props.salesOrders || []}
        payments={props.payments || []}
        fournisseurs={props.fournisseurs || []}
        stocks={props.stocks || []}
        onNavigate={props.onNavigate}
      />
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
