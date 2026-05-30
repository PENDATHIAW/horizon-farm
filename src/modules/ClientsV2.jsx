import { useMemo, useState } from 'react';
import CommercialClientsHero from './commercial/CommercialClientsHero.jsx';
import { receivableFromOrders } from './commercial/commercialMetrics.js';
import Clients from './Clients.jsx';
import TradeDocumentsHealth from './TradeDocumentsHealth.jsx';
import ClientSalesHealthPanel from './ClientSalesHealthPanel.jsx';
import { normalizeClientFromSales } from '../utils/clientWorkflows';

export default function ClientsV2(props) {
  const embedded = Boolean(props.embedded);
  const salesOrders = props.salesOrders || [];
  const payments = props.payments || [];
  const rows = (props.rows || []).map((client) => normalizeClientFromSales(client, salesOrders, payments));
  const [debtFilter, setDebtFilter] = useState(false);

  const receivable = useMemo(() => receivableFromOrders(salesOrders, payments), [salesOrders, payments]);
  const debtCount = useMemo(() => rows.filter((client) => (client.reste_a_payer || client.creance_reelle || 0) > 0).length, [rows]);

  const guardedUpdate = async (id, payload = {}) => {
    const current = rows.find((client) => String(client.id) === String(id));
    const safePayload = current && current.creance_reelle <= 0 ? { ...payload, statut: 'a_jour', status: 'a_jour', relance_requise: false, reste_a_payer: 0, dette: 0 } : payload;
    return props.onUpdate?.(id, safePayload);
  };

  if (embedded) {
    return (
      <div className="space-y-4">
        <CommercialClientsHero
          receivable={receivable}
          debtCount={debtCount}
          clientCount={rows.length}
          onFilterDebt={() => setDebtFilter(true)}
        />
        <Clients
          {...props}
          rows={rows}
          onUpdate={guardedUpdate}
          hideEvolution
          embedded
          initialFilter={debtFilter ? 'a_relancer' : 'tous'}
          onFilterChange={setDebtFilter}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClientSalesHealthPanel rows={rows} salesOrders={salesOrders} payments={payments} onNavigate={props.onNavigate} />
      <TradeDocumentsHealth mode="clients" rows={rows} salesOrders={salesOrders} payments={payments} finances={props.transactions || []} onNavigate={props.onNavigate} />
      <Clients {...props} rows={rows} onUpdate={guardedUpdate} hideEvolution />
    </div>
  );
}
