import ComptabiliteV5 from './ComptabiliteV5.jsx';
import ComptabiliteEvolution from './ComptabiliteEvolution.jsx';

export default function ComptabiliteV6(props) {
  return (
    <div className="space-y-6">
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
