const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.montant_total);

export function evaluateSalesRules(orders = [], payments = []) {
  const findings = [];
  arr(orders).forEach((order) => {
    const status = low(order.statut_paiement || order.payment_status || order.statut);
    const total = amount(order);
    const paid = n(order.montant_paye) || arr(payments).filter((p) => String(p.order_id || p.sale_id) === String(order.id)).reduce((s, p) => s + amount(p), 0);
    if (total > paid && !['paye', 'payé'].includes(status)) {
      findings.push({
        id: `sale-unpaid-${order.id}`,
        module: 'commercial',
        severity: paid > 0 ? 'moyenne' : 'haute',
        title: `Vente non soldée : ${order.client_nom || order.id}`,
        description: `Reste ${total - paid} FCFA à encaisser`,
        recommended_action: 'Encaisser ou relancer le client',
        confidence_score: 0.9,
        source_records: [{ type: 'sales_order', id: order.id }],
      });
    }
    if (!order.invoice_id && !['facture', 'facturé'].includes(low(order.invoice_status || ''))) {
      findings.push({
        id: `sale-no-invoice-${order.id}`,
        module: 'commercial',
        severity: 'moyenne',
        title: `Facture absente : ${order.id}`,
        description: 'Vente sans facture émise',
        recommended_action: 'Émettre la facture',
        confidence_score: 0.85,
        source_records: [{ type: 'sales_order', id: order.id }],
      });
    }
  });
  return findings;
}
