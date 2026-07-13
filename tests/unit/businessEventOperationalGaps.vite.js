import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCommercialSaleRecords, resolveCommercialBusinessEventType } from '../../src/utils/commercialSaleWorkflow.js';
import { runEquipmentMaintenanceSideEffects } from '../../src/utils/equipmentSideEffects.js';
import { syncSmartFarmCriticalSignals } from '../../src/services/smartFarmAlertSync.js';
import { runSupplierPaymentSideEffects } from '../../src/utils/supplierSideEffects.js';

test('supplier_payment lie une dette, conserve le solde partiel et exige une preuve', async () => {
  const debt = { id: 'TRX-DEBT-1', montant: 100000, reste_a_payer: 100000, stock_id: 'STK-ALIM-1', statut: 'a_payer', cash_effect: false };
  const state = { finances: [], documents: [], events: [], supplierPatch: null, debtPatch: null };

  const workflow = await runSupplierPaymentSideEffects({
    supplier: { id: 'FOU-1', nom: 'Aliments Dakar', dettes: 100000 },
    debtAmount: 100000,
    paymentAmount: 40000,
    date: '2026-07-12',
    sourceTransactionId: debt.id,
    paymentMethod: 'mobile_money',
    proofUrl: 'https://example.test/preuve-paiement.jpg',
    paymentRef: '2026-07-12-TRX-DEBT-1',
    openDebtTransactions: [debt],
    handlers: {
      onCreateFinanceTransaction: async (row) => state.finances.push(row),
      onCreateDocument: async (row) => state.documents.push(row),
      onUpdateSupplier: async (_id, patch) => { state.supplierPatch = patch; },
      onUpdateFinanceTransaction: async (_id, patch) => { state.debtPatch = patch; },
      onCreateBusinessEvent: async (row) => state.events.push(row),
    },
  });

  assert.equal(workflow.event.event_type, 'supplier_payment');
  assert.equal(workflow.paymentTransaction.settled_transaction_id, debt.id);
  assert.equal(workflow.paymentTransaction.purchase_or_stock_id, 'STK-ALIM-1');
  assert.equal(state.finances[0].montant, 40000);
  assert.equal(state.documents[0].status, 'fourni');
  assert.equal(state.debtPatch.statut, 'partiel');
  assert.equal(state.debtPatch.reste_a_payer, 60000);
  assert.equal(state.supplierPatch.dettes, 60000);

  await assert.rejects(
    runSupplierPaymentSideEffects({
      supplier: { id: 'FOU-1' },
      debtAmount: 100000,
      paymentAmount: 40000,
      sourceTransactionId: debt.id,
      paymentMethod: 'mobile_money',
      openDebtTransactions: [debt],
    }),
    /Preuve du paiement fournisseur obligatoire/,
  );
});

test('equipment_maintenance produit tâche, finance, preuve, échéance et événement', async () => {
  const state = { equipmentPatch: null, tasks: [], finances: [], documents: [], events: [] };
  const workflow = await runEquipmentMaintenanceSideEffects({
    equipment: { id: 'EQP-1', name: 'Pompe irrigation', status: 'operationnel' },
    date: '2026-07-12',
    maintenanceType: 'preventive',
    responsible: 'EMP-1',
    cost: 25000,
    notes: 'Vidange et contrôle pression',
    nextMaintenanceDate: '2026-10-12',
    handlers: {
      onUpdateEquipment: async (_id, patch) => { state.equipmentPatch = patch; },
      onCreateTask: async (row) => state.tasks.push(row),
      onCreateFinanceTransaction: async (row) => state.finances.push(row),
      onCreateDocument: async (row) => state.documents.push(row),
      onCreateBusinessEvent: async (row) => state.events.push(row),
    },
  });

  assert.equal(workflow.event.event_type, 'equipment_maintenance');
  assert.equal(state.equipmentPatch.prochaine_maintenance, '2026-10-12');
  assert.equal(state.tasks[0].assigned_to, 'EMP-1');
  assert.equal(state.finances[0].montant, 25000);
  assert.equal(state.documents[0].verification_status, 'preuve_manquante');
  assert.equal(state.events[0].linked_task_id, state.tasks[0].id);
});

test('smartfarm_signal crée une seule alerte, tâche et trace pour un capteur critique', async () => {
  const state = { tasks: [], alerts: [], events: [] };
  const handlers = {
    onCreateTask: async (row) => state.tasks.push(row),
    onCreateAlert: async (row) => state.alerts.push(row),
    onCreateBusinessEvent: async (row) => state.events.push(row),
  };
  const sensors = [{ id: 'SENS-1', name: 'Débit eau', status: 'offline', zone: 'Parcelle A' }];

  const first = await syncSmartFarmCriticalSignals({ sensors, tasks: state.tasks, alertes: state.alerts, ...handlers });
  const second = await syncSmartFarmCriticalSignals({ sensors, tasks: state.tasks, alertes: state.alerts, ...handlers });

  assert.equal(first.created, 1);
  assert.equal(second.created, 0);
  assert.equal(state.tasks.length, 1);
  assert.equal(state.alerts.length, 1);
  assert.equal(state.events.length, 1);
  assert.equal(state.events[0].event_type, 'smartfarm_signal_critique');
});

test('les ventes spécialisées émettent leurs identifiants métier', () => {
  const cases = [
    [{ source_type: 'stock', sale_kind: 'oeufs_tablettes', product_name: 'Plateaux œufs', unit: 'tablette' }, 'egg_sale'],
    [{ source_type: 'lot_avicole', sale_kind: 'chair', product_name: 'Poulets' }, 'broiler_sale'],
    [{ source_type: 'animal', sale_kind: 'animal', product_name: 'Bovin' }, 'bovine_sale'],
    [{ source_type: 'culture', sale_kind: 'culture', product_name: 'Tomates' }, 'crop_sale'],
  ];

  cases.forEach(([line, expected]) => {
    assert.equal(resolveCommercialBusinessEventType(line), expected);
    const records = buildCommercialSaleRecords({
      form: {
        date: '2026-07-12',
        client_id: 'CLI-1',
        source_type: line.source_type,
        source_id: 'SRC-1',
        product_name: line.product_name,
        quantity: 1,
        unit: line.unit || 'unité',
        unit_price: 1000,
        sale_kind: line.sale_kind,
        payment_status: 'paye',
        payment_method: 'especes',
        fulfillment_mode: 'recupere',
      },
      orderId: `CMD-${expected}`,
      clientLabel: 'Client test',
    });
    assert.equal(records.businessEvent.event_type, expected);
  });
});
