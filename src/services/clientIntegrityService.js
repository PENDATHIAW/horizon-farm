import { toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const clientId = (row = {}) => clean(row.client_id || row.customer_id || row.related_id || row.source_record_id);
const paidAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount);
const orderTotal = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.total_amount);
const orderRemaining = (row = {}) => toNumber(row.reste_a_payer ?? Math.max(0, orderTotal(row) - toNumber(row.montant_paye)));
const hasPhone = (row = {}) => clean(row.telephone || row.phone || row.whatsapp || row.tel || row.contact);
const orderId = (row = {}) => clean(row.order_id || row.sale_id || row.source_record_id || row.related_id || row.commande_id);

export function analyzeClientIntegrity({ clients = [], salesOrders = [], payments = [], transactions = [] } = {}) {
  const issues = [];
  const clientIds = new Set(arr(clients).map((c) => clean(c.id)));
  arr(clients).forEach((client) => {
    const id = clean(client.id);
    const orders = arr(salesOrders).filter((order) => clientId(order) === id);
    const paymentsForClient = arr(payments).filter((payment) => clientId(payment) === id || orders.some((order) => clean(order.id) === orderId(payment)));
    const remaining = orders.reduce((sum, order) => sum + orderRemaining(order), 0);
    if (!hasPhone(client)) issues.push({ id, client, type: 'Contact client manquant' });
    if (remaining > 0 && !['a_relancer', 'relance', 'en_relance'].includes(lower(client.statut_relance || client.relance_status || client.status_relance))) issues.push({ id, client, type: 'Créance sans relance', amount: remaining });
    if (remaining <= 0 && ['a_relancer', 'relance', 'en_relance'].includes(lower(client.statut_relance || client.relance_status || client.status_relance))) issues.push({ id, client, type: 'Client soldé encore relancé' });
    if (paymentsForClient.length && !orders.length) issues.push({ id, client, type: 'Paiement client sans commande' });
  });
  arr(salesOrders).forEach((order) => {
    const id = clientId(order);
    if (!id) issues.push({ id: order.id, order, type: 'Vente sans client' });
    else if (!clientIds.has(id)) issues.push({ id: order.id, order, type: 'Vente client introuvable' });
  });
  arr(payments).forEach((payment) => {
    const cid = clientId(payment);
    const oid = orderId(payment);
    if (!cid && !oid) issues.push({ id: payment.id, payment, type: 'Paiement non lié' });
    if (oid && !arr(salesOrders).some((order) => clean(order.id) === oid)) issues.push({ id: payment.id, payment, type: 'Paiement lié à commande introuvable' });
  });
  return { issues, issueCount: issues.length };
}
