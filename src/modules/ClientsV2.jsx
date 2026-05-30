import ClientSalesHealthPanel from './ClientSalesHealthPanel.jsx';
import Clients from './Clients.jsx';
import ClientsEvolution from './ClientsEvolution.jsx';
import TradeDocumentsHealth from './TradeDocumentsHealth.jsx';
import { normalizeClientFromSales } from '../utils/clientWorkflows';

export default function ClientsV2(props) {
  const salesOrders = props.salesOrders || [];
  const payments = props.payments || [];
  const rows = (props.rows || []).map((client) => normalizeClientFromSales(client, salesOrders, payments));
  const guardedUpdate = async (id, payload = {}) => {
    const current = rows.find((client) => String(client.id) === String(id));
    const safePayload = current && current.creance_reelle <= 0 ? { ...payload, statut: 'a_jour', status: 'a_jour', relance_requise: false, reste_a_payer: 0, dette: 0 } : payload;
    return props.onUpdate?.(id, safePayload);
  };
  return (
    <div className="clients-readable-order space-y-6">
      <ClientSalesHealthPanel rows={rows} salesOrders={salesOrders} payments={payments} onNavigate={props.onNavigate} />
      <TradeDocumentsHealth mode="clients" rows={rows} salesOrders={salesOrders} payments={payments} finances={props.transactions || []} onNavigate={props.onNavigate} />
      <Clients {...props} rows={rows} onUpdate={guardedUpdate} hideEvolution />
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
        <div>
          <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]">Évolution clients</p>
          <p className="mt-1 text-sm text-[#8a7456]">Les statuts sont recalculés depuis les ventes et paiements réels.</p>
        </div>
        <ClientsEvolution rows={rows} salesOrders={salesOrders} payments={payments} onNavigate={props.onNavigate} />
      </section>
    </div>
  );
}
