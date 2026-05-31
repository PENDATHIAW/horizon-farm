import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCommercialRules, evaluateDeliveryRules } from '../../src/services/commercialRules.js';
import { invoiceRequired } from '../../src/modules/commercial/commercialMetrics.js';

test('vente comptoir sans facture obligatoire', () => {
  const order = { id: 'CMD-CPT', client_type: 'passage', fulfillment_mode: 'comptoir', montant_total: 5000 };
  assert.equal(invoiceRequired(order), false);
});

test('détecte paiement en doublon via commercialRules', () => {
  const orders = [{ id: 'CMD-1', client_nom: 'Client A', montant_total: 100000 }];
  const payments = [
    { id: 'PAY-1', order_id: 'CMD-1', montant: 40000, date_paiement: '2026-05-26', moyen_paiement: 'especes' },
    { id: 'PAY-2', order_id: 'CMD-1', montant: 40000, date_paiement: '2026-05-26', moyen_paiement: 'especes' },
  ];
  const findings = evaluateCommercialRules({ salesOrders: orders, payments });
  assert.ok(findings.some((f) => f.id === 'comm-dup-pay-CMD-1'));
});

test('détecte livraison partielle mal étiquetée', () => {
  const orders = [{
    id: 'CMD-LIV',
    quantite: 10,
    quantite_livree: 4,
    statut_livraison: 'livree',
    delivery_status: 'livree',
  }];
  const findings = evaluateDeliveryRules(orders);
  assert.ok(findings.some((f) => f.id === 'comm-delivery-partial-CMD-LIV'));
});

test('détecte statut à préparer alors que des unités sont livrées', () => {
  const orders = [{
    id: 'CMD-PREP',
    quantite: 5,
    quantite_livree: 2,
    statut_livraison: 'a_preparer',
  }];
  const findings = evaluateDeliveryRules(orders);
  assert.ok(findings.some((f) => f.id === 'comm-delivery-status-CMD-PREP'));
});
