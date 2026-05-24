import BpKpiHealth from './BpKpiHealth.jsx';
import FinanceAccountingHealth from './FinanceAccountingHealth.jsx';
import Rapports from './Rapports.jsx';

export default function RapportsV2(props) {
  const data = props.data || {};
  return <div className="space-y-6">
    <BpKpiHealth
      salesOrders={data.salesOrders || data.sales_orders || []}
      payments={data.payments || []}
      transactions={data.transactions || data.finances || []}
      investments={data.investissements || []}
      onNavigate={props.onNavigate}
    />
    <FinanceAccountingHealth
      transactions={data.transactions || data.finances || []}
      salesOrders={data.salesOrders || data.sales_orders || []}
      payments={data.payments || []}
      documents={data.documents || []}
      clients={data.clients || []}
      fournisseurs={data.fournisseurs || []}
      onNavigate={props.onNavigate}
    />
    <Rapports {...props} />
  </div>;
}
