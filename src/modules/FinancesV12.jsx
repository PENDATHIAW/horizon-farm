import useCrudModule from '../hooks/useCrudModule';
import BpKpiHealth from './BpKpiHealth.jsx';
import FinanceAccountingHealth from './FinanceAccountingHealth.jsx';
import FinanceCashPilotPanel from './FinanceCashPilotPanel.jsx';
import FinancesV11 from './FinancesV11.jsx';

export default function FinancesV12(props) {
  const documentsCrud = useCrudModule('documents');
  const transactions = props.rows || props.transactions || [];
  return <div className="space-y-6">
    <FinanceCashPilotPanel
      transactions={transactions}
      salesOrders={props.salesOrders || []}
      payments={props.payments || []}
      fournisseurs={props.fournisseurs || []}
      onNavigate={props.onNavigate}
    />
    <BpKpiHealth
      salesOrders={props.salesOrders || []}
      payments={props.payments || []}
      transactions={transactions}
      investments={props.investissements || []}
      onNavigate={props.onNavigate}
    />
    <FinanceAccountingHealth
      transactions={transactions}
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
