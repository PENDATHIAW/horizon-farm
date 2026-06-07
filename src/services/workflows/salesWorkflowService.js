export { syncSaleReadyOpportunity, buildSaleReadyOpportunityPayload, findExistingOpportunityForSource, isSaleReadyConfirmed } from './poultryWorkflowService.js';

/** Vente → stock → paiement → finance → facture → document → client. */
export function validateSalesWorkflowLinks({ order = {}, payments = [], finances = [], invoice = null, document = null, stockMovement = null } = {}) {
  const checks = [];
  if (!order?.id) checks.push({ ok: false, code: 'missing_order', message: 'Commande absente' });
  if (order && !stockMovement && order.requires_stock !== false) {
    checks.push({ ok: false, code: 'missing_stock', message: 'Sortie stock non liée' });
  }
  if (order && payments.length === 0 && n(order.montant_paye) > 0) {
    checks.push({ ok: false, code: 'paid_without_payment', message: 'Paiement non tracé dans payments' });
  }
  if (payments.length && !finances.length) {
    checks.push({ ok: false, code: 'payment_without_finance', message: 'Encaissement sans écriture finance' });
  }
  if (invoice && !document) {
    checks.push({ ok: false, code: 'invoice_without_document', message: 'Facture sans document fichier' });
  }
  return { ok: checks.every((c) => c.ok !== false), checks };
}

const n = (v = 0) => Number(v || 0);
