import useCrudModule from '../hooks/useCrudModule';
import FinanceAccountingHealth from './FinanceAccountingHealth.jsx';
import ComptabiliteV6 from './ComptabiliteV6.jsx';

export default function ComptabiliteV7(props) {
  const documentsCrud = useCrudModule('documents');
  return <div className="space-y-6">
    <FinanceAccountingHealth
      transactions={props.transactions || props.finances || []}
      salesOrders={props.salesOrders || []}
      payments={props.payments || []}
      documents={props.documents || documentsCrud.rows || []}
      clients={props.clients || []}
      fournisseurs={props.fournisseurs || []}
      onNavigate={props.onNavigate}
    />
    <ComptabiliteV6 {...props} />
  </div>;
}
