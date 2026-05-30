import { runErpHealthEngine } from '../../services/erpHealthEngine.js';
import { fmtCurrency } from '../../utils/format.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const amount = (r = {}) => n(r.montant_total ?? r.total ?? r.amount ?? r.montant);
const paidOf = (order, payments) => n(order.montant_paye) + arr(payments).filter((p) => String(p.order_id || p.sale_id) === String(order.id)).reduce((s, p) => s + n(p.montant ?? p.amount), 0);
const isDelivered = (r = {}) => ['livre', 'livré', 'delivered', 'termine', 'terminé'].includes(low(r.delivery_status || r.statut_livraison || r.status));
const isInvoiced = (r = {}) => r.invoice_id || r.facture_id || ['facture', 'facturé', 'invoiced'].includes(low(r.invoice_status || r.facture_status));

export function buildCommercialHealthSnapshot({ salesOrders = [], payments = [], clients = [], opportunities = [] }) {
  const data = { sales_orders: salesOrders, salesOrders, payments, clients, sales_opportunities: opportunities };
  const health = runErpHealthEngine(data);
  return {
    score: health.score,
    findings: health.findings.filter((f) => f.module === 'commercial'),
    predictions: health.predictions.filter((p) => p.module === 'commercial'),
    risks: health.risks.filter((r) => r.domain === 'client' || r.module === 'commercial'),
  };
}

export function buildCommercialCoherenceRows(orders = [], payments = []) {
  const rows = [];
  orders.forEach((order) => {
    const total = amount(order);
    const paid = paidOf(order, payments);
    const rest = Math.max(0, total - paid);
    const name = order.client_nom || order.customer_name || order.client_id || 'Client';
    if (total > 0 && rest > 0) {
      rows.push({ id: `unpaid-${order.id}`, orderId: order.id, type: 'impaye', title: `${name} — impayé`, detail: `Reste ${fmtCurrency(rest)}`, value: rest, finding: { id: `coh-sale-unpaid-${order.id}`, module: 'commercial', severity: 'haute', auto_action: 'create_task', title: `Vente sans paiement complet : ${name}`, description: `Reste ${rest} FCFA`, recommended_action: 'Encaisser ou créer tâche de relance', confidence_score: 0.92 } });
    }
    if (!isInvoiced(order) && total > 0) {
      rows.push({ id: `noinv-${order.id}`, orderId: order.id, type: 'facture', title: `Vente ${order.id} sans facture`, detail: name, finding: { id: `coh-sale-no-invoice-${order.id}`, module: 'commercial', severity: 'moyenne', auto_action: 'create_alert', title: `Vente sans facture : ${order.id}`, description: 'Facture non émise', recommended_action: 'Créer facture manquante', confidence_score: 0.88 } });
    }
    if (!isDelivered(order) && total > 0) {
      rows.push({ id: `nodel-${order.id}`, orderId: order.id, type: 'livraison', title: `Vente ${order.id} sans livraison`, detail: name, finding: { id: `coh-sale-no-delivery-${order.id}`, module: 'commercial', severity: 'moyenne', auto_action: 'create_task', title: `Vente sans livraison : ${order.id}`, description: 'Livraison non confirmée', recommended_action: 'Mettre à jour le statut livraison', confidence_score: 0.85 } });
    }
  });
  return rows;
}

export function aggregateClientReceivables(orders = [], payments = []) {
  const map = {};
  orders.forEach((order) => {
    const rest = Math.max(0, amount(order) - paidOf(order, payments));
    if (rest <= 0) return;
    const name = order.client_nom || order.customer_name || String(order.client_id || 'Client');
    if (!map[name]) map[name] = { name, total: 0, orders: [] };
    map[name].total += rest;
    map[name].orders.push(order.id);
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
}
