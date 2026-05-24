import useCrudModule from '../hooks/useCrudModule';
import AutomaticAccountingPanel from './AutomaticAccountingPanel.jsx';
import FinanceAccountingHealth from './FinanceAccountingHealth.jsx';
import ComptabiliteV6 from './ComptabiliteV6.jsx';

export default function ComptabiliteV7(props) {
  const documentsCrud = useCrudModule('documents');
  const documents = props.documents || documentsCrud.rows || [];
  return <div className="space-y-6">
    <AutomaticAccountingPanel
      transactions={props.transactions || props.finances || []}
      documents={documents}
      onNavigate={props.onNavigate}
    />
    <FinanceAccountingHealth
      transactions={props.transactions || props.finances || []}
      salesOrders={props.salesOrders || []}
      payments={props.payments || []}
      documents={documents}
      clients={props.clients || []}
      fournisseurs={props.fournisseurs || []}
      onNavigate={props.onNavigate}
    />
    <ComptabiliteV6 {...props} />
  </div>;
}
