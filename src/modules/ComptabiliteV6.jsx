import ComptabiliteV5 from './ComptabiliteV5.jsx';
import ComptabiliteEvolution from './ComptabiliteEvolution.jsx';
import FinanceConsolidationPanel from './FinanceConsolidationPanel.jsx';

export default function ComptabiliteV6(props) {
  const rows = props.transactions || props.finances || [];
  return (
    <div className="space-y-6">
      <FinanceConsolidationPanel
        rows={rows}
        salesOrders={props.salesOrders || []}
        payments={props.payments || []}
        fournisseurs={props.fournisseurs || []}
        stocks={props.stocks || []}
        onNavigate={props.onNavigate}
      />
      <ComptabiliteV5 {...props} />
      <ComptabiliteEvolution
        transactions={props.transactions || []}
        finances={props.finances || []}
        salesOrders={props.salesOrders || []}
        payments={props.payments || []}
        onNavigate={props.onNavigate}
      />
    </div>
  );
}
