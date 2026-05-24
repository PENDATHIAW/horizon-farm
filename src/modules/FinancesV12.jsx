import useCrudModule from '../hooks/useCrudModule';
import FinanceAccountingHealth from './FinanceAccountingHealth.jsx';
import FinancesV11 from './FinancesV11.jsx';

export default function FinancesV12(props) {
  const documentsCrud = useCrudModule('documents');
  return <div className="space-y-6">
    <FinanceAccountingHealth
      transactions={props.rows || props.transactions || []}
      salesOrders={props.salesOrders || []}
      payments={props.payments || []}
      documents={props.documents || documentsCrud.rows || []}
      clients={props.clients || []}
      fournisseurs={props.fournisseurs || []}
      onNavigate={props.onNavigate}
    />
    <FinancesV11 {...props} />
  </div>;
}
