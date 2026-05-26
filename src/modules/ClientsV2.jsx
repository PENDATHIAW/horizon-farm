import ClientSalesHealthPanel from './ClientSalesHealthPanel.jsx';
import Clients from './Clients.jsx';
import ClientsEvolution from './ClientsEvolution.jsx';
import TradeDocumentsHealth from './TradeDocumentsHealth.jsx';

const n = (value = 0) => Number(value || 0) || 0;
const clientKeys = (client = {}) => [client.id, client.name, client.nom, client.client_label, client.phone, client.telephone].map((v) => String(v || '').trim().toLowerCase()).filter(Boolean);
const saleClientKeys = (sale = {}) => [sale.client_id, sale.clientId, sale.client_label, sale.client_name, sale.customer_name, sale.telephone, sale.phone].map((v) => String(v || '').trim().toLowerCase()).filter(Boolean);
const totalOf = (sale = {}) => n(sale.montant_total || sale.total || sale.total_amount || sale.amount || (n(sale.quantity || sale.quantite) * n(sale.unit_price || sale.prix_unitaire)));
const paidFromSale = (sale = {}) => n(sale.montant_paye || sale.paid_amount);
const paidFromPayments = (sale = {}, payments = []) => payments.filter((p) => String(p.order_id || p.sale_id || p.source_record_id || p.related_id || '') === String(sale.id)).reduce((sum, p) => sum + n(p.montant || p.amount || p.montant_paye), 0);
const paidOf = (sale = {}, payments = []) => paidFromSale(sale) || paidFromPayments(sale, payments);
const remainingOf = (sale = {}, payments = []) => Math.max(0, totalOf(sale) - paidOf(sale, payments));
const belongsToClient = (sale = {}, client = {}) => {
  const cKeys = clientKeys(client);
  const sKeys = saleClientKeys(sale);
  return cKeys.some((key) => sKeys.includes(key));
};

function normalizeClient(client = {}, salesOrders = [], payments = []) {
  const clientSales = salesOrders.filter((sale) => belongsToClient(sale, client));
  const totalSales = clientSales.reduce((sum, sale) => sum + totalOf(sale), 0);
  const totalPaid = clientSales.reduce((sum, sale) => sum + paidOf(sale, payments), 0);
  const debt = clientSales.reduce((sum, sale) => sum + remainingOf(sale, payments), 0);
  const hasDebt = debt > 0;
  return {
    ...client,
    total_ventes: totalSales,
    total_paye: totalPaid,
    creance_reelle: debt,
    reste_a_payer: debt,
    dette: debt,
    statut: hasDebt ? 'a_relancer' : 'a_jour',
    status: hasDebt ? 'a_relancer' : 'a_jour',
    relance_requise: hasDebt,
    relance_reason: hasDebt ? `Créance réelle: ${debt}` : '',
  };
}

export default function ClientsV2(props) {
  const salesOrders = props.salesOrders || [];
  const payments = props.payments || [];
  const rows = (props.rows || []).map((client) => normalizeClient(client, salesOrders, payments));
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
