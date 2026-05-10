import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const monthKey = (value) => String(value || new Date().toISOString()).slice(0, 7);
const lastMonths = (count = 6) => {
  const base = new Date();
  return Array.from({ length: count }).map((_, index) => {
    const date = new Date(base.getFullYear(), base.getMonth() - (count - 1 - index), 1);
    return date.toISOString().slice(0, 7);
  });
};
const amountOf = (row = {}) => toNumber(row.montant_total ?? row.total_amount ?? row.total ?? row.amount ?? 0);
const paidOf = (row = {}) => toNumber(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? 0);
const paymentAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount ?? 0);
const paymentOrderId = (row = {}) => row.order_id || row.sale_id || row.source_record_id || row.related_id;
const isCancelled = (row = {}) => ['annule', 'annulé', 'cancelled'].includes(String(row.statut || row.status || row.statut_commande || '').toLowerCase());
const validPayment = (payment = {}) => !['annule', 'annulé', 'cancelled', 'rejete', 'rejeté'].includes(String(payment.statut || payment.status || 'paye').toLowerCase());

function orderPaid(order = {}, payments = []) {
  const linked = arr(payments).filter(validPayment).filter((payment) => String(paymentOrderId(payment) || '') === String(order.id || ''));
  const paidLinked = linked.reduce((sum, payment) => sum + paymentAmount(payment), 0);
  return Math.max(paidOf(order), paidLinked);
}

function buildRows({ salesOrders = [], payments = [] }) {
  return lastMonths(6).map((month) => {
    const orders = arr(salesOrders).filter((order) => !isCancelled(order) && monthKey(order.date || order.created_at) === month);
    const ca = orders.reduce((sum, order) => sum + amountOf(order), 0);
    const encaisse = orders.reduce((sum, order) => sum + Math.min(amountOf(order), orderPaid(order, payments)), 0);
    const creances = Math.max(0, ca - encaisse);
    return { month, ca, encaisse, creances, commandes: orders.length };
  });
}

export default function ClientsEvolution({ rows = [], salesOrders = [], payments = [], onNavigate }) {
  const data = buildRows({ salesOrders, payments });
  const ca = data.reduce((sum, row) => sum + row.ca, 0);
  const encaisse = data.reduce((sum, row) => sum + row.encaisse, 0);
  const creances = data.reduce((sum, row) => sum + row.creances, 0);
  const commandes = data.reduce((sum, row) => sum + row.commandes, 0);
  const clientsAvecCreance = arr(rows).filter((client) => arr(salesOrders).some((order) => String(order.client_id || '') === String(client.id || '') && Math.max(0, amountOf(order) - orderPaid(order, payments)) > 0)).length;

  return (
    <div className="space-y-3">
      <SmartEvolutionChart
        moduleName="Clients"
        title="Évolution clients & créances"
        subtitle="CA clients, encaissements, créances et commandes sur les derniers mois"
        months={data.map((row) => row.month)}
        leftUnit="FCFA"
        rightUnit="cmd"
        series={[
          { name: 'CA clients', type: 'bar', unit: 'FCFA', data: data.map((row) => row.ca) },
          { name: 'Encaissé', type: 'bar', unit: 'FCFA', data: data.map((row) => row.encaisse) },
          { name: 'Créances', type: 'bar', unit: 'FCFA', data: data.map((row) => row.creances) },
          { name: 'Commandes', type: 'line', axis: 'right', unit: 'cmd', data: data.map((row) => row.commandes) },
        ]}
        reportPayload={{
          ca_clients: fmtCurrency(ca),
          encaissements: fmtCurrency(encaisse),
          creances: fmtCurrency(creances),
          commandes: fmtNumber(commandes),
          clients_a_relancer: fmtNumber(clientsAvecCreance),
        }}
      />
      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#7d6a4a]">
        <p><b>Interprétation :</b> {creances > 0 ? `${fmtCurrency(creances)} restent à relancer sur les clients.` : 'Les encaissements couvrent les ventes suivies sur la période.'}</p>
        <button type="button" onClick={() => onNavigate?.('clients')} className="mt-2 font-bold text-emerald-700">Action recommandée : ouvrir les clients à relancer</button>
      </div>
    </div>
  );
}
