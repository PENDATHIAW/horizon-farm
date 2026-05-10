import Dashboard from './Dashboard.jsx';
import DashboardEvolution from './DashboardEvolution.jsx';

export default function DashboardV2(props) {
  return (
    <div className="space-y-6">
      <Dashboard {...props} />
      <DashboardEvolution
        salesOrders={props.salesOrders || []}
        payments={props.payments || []}
        transactions={props.transactions || []}
        productionLogs={props.productionLogs || []}
        stocks={props.stocks || []}
        taches={props.taches || []}
        alertes={props.alertes || []}
        onNavigate={props.onNavigate}
      />
    </div>
  );
}
