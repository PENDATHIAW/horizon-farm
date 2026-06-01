import useCrudModule from '../hooks/useCrudModule';
import AccountingAutoEntriesPreview from './AccountingAutoEntriesPreview.jsx';
import AutomaticAccountingPanel from './AutomaticAccountingPanel.jsx';
import BusinessChargeSyncPanel from './BusinessChargeSyncPanel.jsx';
import FinanceAccountingHealth from './FinanceAccountingHealth.jsx';
import ComptabiliteV6 from './ComptabiliteV6.jsx';

export default function ComptabiliteV7(props) {
  const documentsCrud = useCrudModule('documents');
  const documents = props.documents || documentsCrud.rows || [];
  const transactions = props.transactions || props.finances || [];
  return <div className="space-y-6">
    <BusinessChargeSyncPanel {...props} transactions={transactions} onCreateFinanceTransaction={props.onCreateFinanceTransaction} onRefreshFinances={props.onRefreshFinances} />
    <AutomaticAccountingPanel
      transactions={transactions}
      documents={documents}
      onNavigate={props.onNavigate}
    />
    <AccountingAutoEntriesPreview
      transactions={transactions}
      salesOrders={props.salesOrders || []}
      payments={props.payments || []}
    />
    <FinanceAccountingHealth
      transactions={transactions}
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
