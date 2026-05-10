import ConsolidatedFinanceStrip from './ConsolidatedFinanceStrip.jsx';
import Dashboard from './Dashboard.jsx';
import DashboardEvolution from './DashboardEvolution.jsx';

export default function DashboardV2(props) {
  return (
    <div className="space-y-6">
      <ConsolidatedFinanceStrip
        title="Dashboard — vérité financière"
        rows={props.transactions || []}
        salesOrders={props.salesOrders || []}
        payments={props.payments || []}
        fournisseurs={props.fournisseurs || []}
        stocks={props.stocks || []}
        compact
      />
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
