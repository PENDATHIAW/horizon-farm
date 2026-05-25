import FinanceAccountingHealth from './FinanceAccountingHealth.jsx';
import FinancingFinancialStatementGuide from './FinancingFinancialStatementGuide.jsx';
import Rapports from './Rapports.jsx';

export default function RapportsV2(props) {
  const data = props.data || {};
  return <div className="space-y-6">
    <FinanceAccountingHealth
      transactions={data.transactions || data.finances || []}
      salesOrders={data.salesOrders || data.sales_orders || []}
      payments={data.payments || []}
      documents={data.documents || []}
      clients={data.clients || []}
      fournisseurs={data.fournisseurs || []}
      onNavigate={props.onNavigate}
    />
    <FinancingFinancialStatementGuide data={data} onNavigate={props.onNavigate} />
    <Rapports {...props} />
  </div>;
}
