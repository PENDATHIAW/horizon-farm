import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifySyncIssue,
  getGuidedRepairActions,
  GUIDED_REPAIR_SCENARIOS,
} from '../../src/utils/syncGuidedRepairActions.js';

const baseProps = {
  dataMap: {
    finances: [{ id: 'TRX-1', type: 'sortie', libelle: 'Achat aliment', montant: 5000, categorie: 'stock' }],
    stock: [{ id: 'STK-1', produit: 'Aliment', quantite: 10 }],
    payments: [{ id: 'PAY-1', order_id: 'VEN-1', montant: 10000 }],
    sales_orders: [{ id: 'VEN-1', montant_total: 10000 }],
    documents: [{ id: 'DOC-1' }],
    alimentation_logs: [{ id: 'ALIM-1', stock_id: 'STK-1', quantite: 2 }],
    alertes_center: [{ id: 'ALT-1' }],
    taches: [{ id: 'TSK-1', status: 'termine' }],
    business_events: [{ id: 'EVT-1', event_type: 'sortie_stock', entity_id: 'STK-1' }],
  },
  onCreateFinanceTransaction: () => {},
  onUpdateFinanceTransaction: () => {},
  onUpdatePayment: () => {},
  onUpdateDocument: () => {},
  onCreateStock: () => {},
  onUpdateStock: () => {},
  onUpdateAlimentation: () => {},
  onUpdateAlert: () => {},
  onUpdateTask: () => {},
};

test('classifySyncIssue détecte les 5 scénarios principaux', () => {
  assert.equal(classifySyncIssue({ scenario: 'paid_sale_no_finance' }), GUIDED_REPAIR_SCENARIOS.PAID_SALE_NO_FINANCE);
  assert.equal(classifySyncIssue({ module: 'finances', message: 'Une dépense stockable n’a pas encore d’entrée stock associée.' }), GUIDED_REPAIR_SCENARIOS.STOCKABLE_EXPENSE_NO_STOCK);
  assert.equal(classifySyncIssue({ module: 'payments', message: 'Un encaissement de vente n’apparaît pas encore dans les finances.' }), GUIDED_REPAIR_SCENARIOS.PAID_SALE_NO_FINANCE);
  assert.equal(classifySyncIssue({ module: 'documents', message: 'Un document n’est lié à aucune dépense, vente ou paiement.' }), GUIDED_REPAIR_SCENARIOS.ORPHAN_DOCUMENT);
  assert.equal(classifySyncIssue({ module: 'alimentation_logs', message: 'Une alimentation n’a pas encore de sortie stock enregistrée.' }), GUIDED_REPAIR_SCENARIOS.FEEDING_NO_STOCK_EXIT);
  assert.equal(classifySyncIssue({ module: 'alertes_center', message: 'Une alerte reste ouverte alors que la tâche associée est terminée.' }), GUIDED_REPAIR_SCENARIOS.ALERT_COMPLETED_TASK);
});

test('getGuidedRepairActions retourne au maximum 3 actions disponibles', () => {
  const paymentIssue = { module: 'payments', row_id: 'PAY-1', linked_id: 'VEN-1', message: 'Un encaissement de vente n’apparaît pas encore dans les finances.' };
  const actions = getGuidedRepairActions(paymentIssue, baseProps);
  assert.ok(actions.length > 0);
  assert.ok(actions.length <= 3);
  assert.ok(actions.every((action) => action.label && action.id));
});

test('getGuidedRepairActions retourne une liste vide sans scénario reconnu', () => {
  assert.deepEqual(getGuidedRepairActions({ module: 'unknown', message: 'Autre problème' }, baseProps), []);
});
