import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBusinessEventAutomationPlan,
  buildBusinessEventCoverageAudit,
  commitBusinessEventAutomationPlan,
  computeBusinessEventDerivedMetrics,
  validateBusinessEventPayload,
} from '../../src/services/businessEvents/businessEventAutomationService.js';

const requiredBiosecurityPayload = {
  date: '2026-07-10',
  building_id: 'BOX-A',
  cleaning_type: 'fin_de_bande',
  responsible_person: 'Equipe ferme',
  bags_collected: 18,
  estimated_weight_per_bag: 25,
  organic_material_type: 'litiere_usee',
  sanitary_status: 'normal',
  destination: 'compostage',
  next_step: 'retournement compost',
};

test('événements métier — couverture complète des workflows', () => {
  const audit = buildBusinessEventCoverageAudit();
  assert.equal(audit.ok, true);
  assert.equal(audit.total >= 25, true);
  assert.equal(audit.ids.includes('biosecurity_cleaning'), true);
  assert.equal(audit.ids.includes('monthly_financier_report'), true);
  assert.equal(audit.ids.includes('smartfarm_signal'), true);
});

test('validation — refuse un événement incomplet', () => {
  const validation = validateBusinessEventPayload('biosecurity_cleaning', {
    date: '2026-07-10',
    building_id: 'BOX-A',
  });
  assert.equal(validation.ok, false);
  assert.equal(validation.missingFields.includes('bags_collected'), true);
  assert.equal(validation.missingFields.includes('next_step'), true);
});

test('biosécurité — calcule les sacs collectés et crée les impacts automatiques', () => {
  const plan = buildBusinessEventAutomationPlan('biosecurity_cleaning', requiredBiosecurityPayload);
  assert.equal(plan.ok, true);
  assert.equal(plan.derived.bags_collected, 18);
  assert.equal(plan.derived.total_organic_kg, 450);
  assert.equal(plan.operations.some((op) => op.type === 'business_event.create'), true);
  assert.equal(plan.operations.some((op) => op.type === 'stock.create' && op.payload.categorie === 'matiere_organique'), true);
  assert.equal(plan.operations.some((op) => op.type === 'task.create'), true);
});

test('biosécurité — bloque une matière suspecte envoyée vers culture', () => {
  const plan = buildBusinessEventAutomationPlan('biosecurity_cleaning', {
    ...requiredBiosecurityPayload,
    sanitary_status: 'suspect',
    destination: 'parcelle tomate',
    next_step: 'controle sanitaire',
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.derived.crop_destination_blocked, true);
  assert.equal(plan.operations.some((op) => op.type === 'alert.create'), true);
});

test('distribution aliment — détecte le stock insuffisant et prépare la sortie stock', () => {
  const payload = {
    date: '2026-07-10',
    target_type: 'lot_avicole',
    target_id: 'LOT-B',
    quantity: 120,
    feed_stock_id: 'STK-ALIMENT',
  };
  const dataMap = { stock: [{ id: 'STK-ALIMENT', quantite: 80 }] };
  const derived = computeBusinessEventDerivedMetrics('feed_distribution', payload, dataMap);
  assert.equal(derived.stock_available_before, 80);
  assert.equal(derived.stock_after_distribution, -40);
  assert.equal(derived.stock_insufficient, true);

  const plan = buildBusinessEventAutomationPlan('feed_distribution', payload, dataMap);
  assert.equal(plan.operations.some((op) => op.type === 'stock_movement.create'), true);
  assert.equal(plan.operations.some((op) => op.type === 'alert.create'), true);
});

test('vente œufs — crée vente, ligne, sortie stock, paiement et finance', () => {
  const plan = buildBusinessEventAutomationPlan('egg_sale', {
    date: '2026-07-10',
    client_id: 'CLI-001',
    quantity_trays: 42,
    unit_price: 2500,
    stock_id: 'STK-OEUFS',
    payment_status: 'paye',
    payment_method: 'cash',
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.derived.amount, 105000);
  assert.equal(plan.operations.some((op) => op.type === 'sales_order.create'), true);
  assert.equal(plan.operations.some((op) => op.type === 'sales_order_item.create'), true);
  assert.equal(plan.operations.some((op) => op.type === 'stock_movement.create'), true);
  assert.equal(plan.operations.some((op) => op.type === 'payment.create'), true);
  assert.equal(plan.operations.some((op) => op.type === 'finance.create'), true);
});

test('ponte du jour — prépare une entrée stock œufs', () => {
  const plan = buildBusinessEventAutomationPlan('egg_production', {
    date: '2026-07-10',
    building_id: 'PONDEUSES-1',
    trays_count: 38,
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.operations.some((op) => op.type === 'stock_movement.create' && op.payload.movement_type === 'entree_ponte_jour'), true);
});

test('récolte et vente maraîchère — connecte culture, stock et commercial', () => {
  const harvest = buildBusinessEventAutomationPlan('crop_harvest', {
    date: '2026-07-10',
    parcel_id: 'PARCELLE-TOMATE',
    crop_type: 'Tomate',
    quantity_kg: 180,
  });
  assert.equal(harvest.ok, true);
  assert.equal(harvest.operations.some((op) => op.type === 'stock.create' && op.payload.categorie === 'produit_fini_culture'), true);

  const sale = buildBusinessEventAutomationPlan('crop_sale', {
    date: '2026-07-10',
    client_id: 'CLI-002',
    parcel_or_stock_id: 'STK-TOMATE',
    quantity_kg: 50,
    unit_price: 800,
    payment_status: 'partiel',
    paid_amount: 20000,
  });
  assert.equal(sale.ok, true);
  assert.equal(sale.derived.amount, 40000);
  assert.equal(sale.derived.remaining_amount, 20000);
  assert.equal(sale.operations.some((op) => op.type === 'sales_order.create'), true);
});

test('rapport financeur — crée un brouillon de rapport relié aux opérations', () => {
  const plan = buildBusinessEventAutomationPlan('monthly_financier_report', {
    period: '2026-07',
    generated_by: 'Penda',
    data_cutoff_date: '2026-07-31',
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.operations.some((op) => op.type === 'report.create'), true);
});

test('commit — exécute les handlers disponibles et laisse les autres opérations traçables', async () => {
  const plan = buildBusinessEventAutomationPlan('biosecurity_cleaning', requiredBiosecurityPayload);
  const created = { events: 0, stocks: 0, tasks: 0 };
  const results = await commitBusinessEventAutomationPlan(plan, {
    onCreateBusinessEvent: async (row) => { created.events += 1; return row; },
    onCreateStock: async (row) => { created.stocks += 1; return row; },
    onCreateTask: async (row) => { created.tasks += 1; return row; },
  });
  assert.equal(created.events, 1);
  assert.equal(created.stocks, 1);
  assert.equal(created.tasks, 1);
  assert.equal(results.length >= 3, true);
});
