/**
 * Règles métier Commercial centralisées — point d'entrée unique.
 * Ne duplique pas salesRules / salesIntegrityService : les agrège.
 */
import { evaluateSalesRules } from './erpRules/salesRules.js';
import { analyzeSalesIntegrity } from './salesIntegrityService.js';
import { invoiceRequired, isInvoiced, isSaleClosed, linkedPaymentsForOrders } from '../modules/commercial/commercialMetrics.js';
import { remainingForOrder } from '../utils/salesStatuses.js';

const arr = (v) => (Array.isArray(v) ? v : []);

export { evaluateSalesRules, analyzeSalesIntegrity, invoiceRequired, isInvoiced, isSaleClosed, linkedPaymentsForOrders, remainingForOrder };

/** Audit commercial complet : règles + intégrité vente→paiement→finance→facture. */
export function evaluateCommercialRules(data = {}) {
  const orders = arr(data.sales_orders || data.salesOrders);
  const payments = arr(data.payments);
  const transactions = arr(data.finances || data.transactions);
  const invoices = arr(data.invoices);

  const ruleFindings = evaluateSalesRules(orders, payments);
  const integrity = analyzeSalesIntegrity({ orders, payments, transactions, invoices });

  const integrityFindings = [];
  integrity.forEach(({ order, duplicatePayments, missingFinance, overpaid, invoiceCount }) => {
    if (duplicatePayments?.length) {
      integrityFindings.push({
        id: `comm-dup-pay-${order.id}`,
        module: 'commercial',
        severity: 'critique',
        category: 'commercial',
        title: `Paiement en doublon : ${order.client_nom || order.id}`,
        description: `${duplicatePayments.length} paiement(s) identique(s) sur la même vente`,
        recommended_action: 'Fusionner ou annuler le doublon',
        confidence_score: 0.95,
        source_records: duplicatePayments.map((p) => ({ type: 'payment', id: p.id })),
      });
    }
    if (missingFinance?.length) {
      integrityFindings.push({
        id: `comm-pay-no-finance-${order.id}`,
        module: 'commercial',
        severity: 'haute',
        category: 'commercial',
        title: `Paiement sans trace finance : ${order.id}`,
        description: `${missingFinance.length} encaissement(s) non relié(s) à la trésorerie`,
        recommended_action: 'Créer ou lier la transaction finance',
        confidence_score: 0.9,
      });
    }
    if (overpaid) {
      integrityFindings.push({
        id: `comm-overpaid-${order.id}`,
        module: 'commercial',
        severity: 'haute',
        category: 'commercial',
        title: `Surpaiement : ${order.client_nom || order.id}`,
        description: 'Montant encaissé supérieur au total vente',
        recommended_action: 'Corriger paiement ou vente',
        confidence_score: 0.92,
      });
    }
    if (invoiceRequired(order) && invoiceCount > 1) {
      integrityFindings.push({
        id: `comm-dup-invoice-${order.id}`,
        module: 'commercial',
        severity: 'moyenne',
        category: 'commercial',
        title: `Plusieurs factures pour une vente : ${order.id}`,
        description: `${invoiceCount} facture(s) liée(s)`,
        recommended_action: 'Conserver une seule facture active',
        confidence_score: 0.88,
      });
    }
  });

  return [...ruleFindings, ...integrityFindings];
}

export default evaluateCommercialRules;
