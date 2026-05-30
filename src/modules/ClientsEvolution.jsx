import ChartsGrid from '../components/charts/ChartsGrid.jsx';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import SmartPieChart from '../components/charts/SmartPieChart.jsx';
import { toNumber } from '../utils/format';

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
  return Math.max(paidOf(order), linked.reduce((sum, payment) => sum + paymentAmount(payment), 0));
}

function buildRows({ salesOrders = [], payments = [] }) {
  return lastMonths(6).map((month) => {
    const orders = arr(salesOrders).filter((order) => !isCancelled(order) && monthKey(order.date || order.created_at) === month);
    const ca = orders.reduce((sum, order) => sum + amountOf(order), 0);
    const encaisse = orders.reduce((sum, order) => sum + Math.min(amountOf(order), orderPaid(order, payments)), 0);
    return { month, ca, encaisse, creances: Math.max(0, ca - encaisse), commandes: orders.length };
  });
}

export default function ClientsEvolution({ salesOrders = [], payments = [] }) {
  const data = buildRows({ salesOrders, payments });
  const ca = data.reduce((sum, row) => sum + row.ca, 0);
  const encaisse = data.reduce((sum, row) => sum + row.encaisse, 0);
  const creances = data.reduce((sum, row) => sum + row.creances, 0);

  return (
    <ChartsGrid>
      <SmartEvolutionChart moduleName="Clients" compact title="CA vs encaissé" subtitle="Histogramme — ventes clients" months={data.map((row) => row.month)} leftUnit="FCFA" rightUnit="" series={[
        { name: 'CA clients', type: 'bar', unit: 'FCFA', data: data.map((row) => row.ca) },
        { name: 'Encaissé', type: 'bar', unit: 'FCFA', data: data.map((row) => row.encaisse) },
      ]} />
      <SmartEvolutionChart moduleName="Clients" compact title="Créances vs commandes" subtitle="Barres + courbe — créances et volume" months={data.map((row) => row.month)} leftUnit="FCFA" rightUnit="cmd" series={[
        { name: 'Créances', type: 'bar', unit: 'FCFA', data: data.map((row) => row.creances) },
        { name: 'Commandes', type: 'line', axis: 'right', unit: 'cmd', data: data.map((row) => row.commandes) },
      ]} />
      <SmartPieChart moduleName="Clients" compact title="Encaissé vs créances" subtitle="Camembert — solde clients global" unit="FCFA" items={[
        { name: 'Encaissé', value: encaisse },
        { name: 'Créances', value: creances },
      ]} />
    </ChartsGrid>
  );
}
