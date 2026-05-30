import ClientSalesHealthPanel from './ClientSalesHealthPanel.jsx';
import Clients from './Clients.jsx';
import TradeDocumentsHealth from './TradeDocumentsHealth.jsx';
import { normalizeClientFromSales } from '../utils/clientWorkflows';

export default function ClientsV2(props) {
  const embedded = Boolean(props.embedded);
  const salesOrders = props.salesOrders || [];
  const payments = props.payments || [];
  const rows = (props.rows || []).map((client) => normalizeClientFromSales(client, salesOrders, payments));
  const guardedUpdate = async (id, payload = {}) => {
    const current = rows.find((client) => String(client.id) === String(id));
    const safePayload = current && current.creance_reelle <= 0 ? { ...payload, statut: 'a_jour', status: 'a_jour', relance_requise: false, reste_a_payer: 0, dette: 0 } : payload;
    return props.onUpdate?.(id, safePayload);
  };
  return (
    <div className={`clients-readable-order ${embedded ? 'space-y-4' : 'space-y-6'}`}>
      <ClientSalesHealthPanel compact={embedded} rows={rows} salesOrders={salesOrders} payments={payments} onNavigate={props.onNavigate} />
      {!embedded ? <TradeDocumentsHealth mode="clients" rows={rows} salesOrders={salesOrders} payments={payments} finances={props.transactions || []} onNavigate={props.onNavigate} /> : null}
      <Clients {...props} rows={rows} onUpdate={guardedUpdate} hideEvolution />
    </div>
  );
}
