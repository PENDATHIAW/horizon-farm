import ClientsBase from './Clients.jsx';
import ClientQualityControl from './ClientQualityControl.jsx';

export default function Clients(props) {
  return <div className="space-y-6">
    <ClientsBase {...props} />
    <ClientQualityControl
      rows={props.rows || []}
      salesOrders={props.salesOrders || []}
      payments={props.payments || props.paymentsList || []}
      transactions={props.transactions || []}
    />
  </div>;
}
