/**
 * Dry-run démo financeur — 5 parcours métier critiques (logique unitaire, sans navigateur).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prepareCommercialSaleCommit } from '../../src/utils/commercialSaleWorkflow.js';
import {
  buildDeliveryProofPatch,
  buildDeliveryTerrainRow,
  hasDeliveryProof,
  resolveDeliveryStatus,
  DELIVERY_STATUSES,
} from '../../src/utils/commercialDeliveries.js';
import { recordSalePayment } from '../../src/utils/recordSalePayment.js';
import { auditTraceabilityChain } from '../../src/utils/erpTransversalAudit.js';
import { financeIds } from '../../src/utils/sideEffectIds.js';
import { buildSupplierReceptionWorkflow } from '../../src/utils/supplierWorkflows.js';
import {
  navigateFromPilotageItem,
  resolvePilotageNavigation,
} from '../../src/utils/centreDecisionWorkflow.js';
import {
  navigateInvestisseursTab,
  resolveInvestisseursTab,
} from '../../src/utils/commercialNavigation.js';
import { composeDecisionDataMap } from '../../src/services/moduleDataComposer.js';
import { buildInvestorForumProfile } from '../../src/services/investorForums/investorProfileService.js';
import {
  buildForumPack,
  renderForumPackPdfBlob,
} from '../../src/services/investorForums/forumPackBuilder.js';
import {
  classifySyncIssue,
  getGuidedRepairActions,
  GUIDED_REPAIR_SCENARIOS,
} from '../../src/utils/syncGuidedRepairActions.js';
import {
  buildSyncRepairTask,
  routeForSyncIssue,
} from '../../src/utils/syncAuditWorkflows.js';

const today = () => '2026-06-18';

test('parcours 1 — opportunité → vente → livraison (preuve) → paiement → finance', async () => {
  const opportunityId = 'OPP-DEMO-001';
  const { records } = prepareCommercialSaleCommit({
    form: {
      date: today(),
      client_id: 'CLI-DEMO',
      client_label: 'Marché Tilène',
      opportunity_id: opportunityId,
      source_type: 'stock',
      product_name: 'Tomates',
      quantity: 40,
      unit_price: 900,
      delivery_required: true,
      adresse_livraison: 'Marché central',
    },
    farmId: 'farm-demo',
  });
  const order = records.order;
  assert.equal(order.opportunity_id, opportunityId);
  assert.ok(order.montant_total > 0);

  const delivery = {
    id: 'LIV-DEMO-001',
    order_id: order.id,
    statut: 'livree',
    date_reelle: today(),
  };
  assert.equal(resolveDeliveryStatus(delivery, order), DELIVERY_STATUSES.DELIVERED);

  const proofPatch = buildDeliveryProofPatch({
    note: 'Signé par responsable marché',
    clientConfirmed: true,
  });
  const delivered = { ...delivery, ...proofPatch };
  assert.ok(hasDeliveryProof(delivered, []));

  const row = buildDeliveryTerrainRow(delivered, { order, client: { id: 'CLI-DEMO', nom: 'Marché Tilène' } });
  assert.equal(row.hasProof, true);
  assert.equal(row.proofMissing, false);

  const payments = [];
  const transactions = [];
  const sale = { ...order, montant_total: order.montant_total, montant_paye: 0 };
  const pay = await recordSalePayment({
    sale,
    requestedAmount: order.montant_total,
    payments,
    transactions,
    handlers: {
      onCreatePayment: async (p) => { payments.push(p); return p; },
      onCreateFinanceTransaction: async (t) => { transactions.push(t); return t; },
      onUpdateOrder: async (_id, patch) => Object.assign(sale, patch),
    },
    paymentDate: today(),
  });
  assert.equal(pay.skipped, false);
  assert.equal(payments.length, 1);
  assert.equal(transactions.length, 1);
  assert.equal(sale.reste_a_payer, 0);

  const chain = auditTraceabilityChain({
    order: { ...sale, invoice_id: 'INV-DEMO', source_impact_applied: true },
    payments,
    transactions: [
      { id: financeIds.receivable(sale.id), order_id: sale.id, statut: 'paye', type: 'entree', montant: sale.montant_total },
    ],
    deliveries: [delivered],
    invoices: [{ order_id: sale.id }],
  });
  assert.equal(chain.complete, true);
  assert.equal(chain.steps.vente, true);
  assert.equal(chain.steps.livraison, true);
  assert.equal(chain.steps.facture, true);
});

test('parcours 2 — réception achat crée dette fournisseur (finance auto)', () => {
  const supplier = { id: 'FOU-DEMO', nom: 'Aliments Diop', dettes: 0 };
  const stock = { id: 'STK-DEMO', produit: 'Aliment pondeuses', quantite: 10, prix_unitaire: 12500 };
  const workflow = buildSupplierReceptionWorkflow({
    supplier,
    stock,
    qty: 20,
    unitPrice: 12500,
    date: today(),
  });
  assert.equal(workflow.stockPatch.quantite, 30);
  assert.equal(workflow.debtTransaction.montant, 250000);
  assert.equal(workflow.debtTransaction.type, 'sortie');
  assert.equal(workflow.debtTransaction.is_supplier_accrual, true);
  assert.equal(workflow.debtTransaction.cash_effect, false);
  assert.equal(workflow.supplierPatch.dettes, 250000);
  assert.equal(workflow.missingInvoiceDocument.status, 'manquant');
});

test('parcours 3 — centre décisionnel deep-link vers module cible', () => {
  const nav = resolvePilotageNavigation({
    domain: 'Commercial',
    opportunity_id: 'OPP-CENTRE-001',
  });
  assert.equal(nav.module, 'commercial');
  assert.equal(nav.tab, 'Opportunités');

  const calls = [];
  navigateFromPilotageItem(
    (module, opts) => calls.push({ module, tab: opts?.tab }),
    { domain: 'Stock', title: 'Rupture aliment', module: 'achats_stock' },
  );
  assert.deepEqual(calls[0], { module: 'achats_stock', tab: 'Stock' });
});

test('parcours 4 — investisseurs Préparation → export PDF', () => {
  assert.equal(resolveInvestisseursTab('Préparation'), 'preparation');

  const calls = [];
  const tab = navigateInvestisseursTab(
    (module, opts) => calls.push({ module, tab: opts?.tab }),
    'Préparation',
  );
  assert.equal(tab, 'preparation');
  assert.deepEqual(calls[0], { module: 'investisseurs_forums', tab: 'Préparation' });

  const crud = {
    sales_orders: { rows: [{ id: 'V1', montant_total: 500000 }] },
    documents: { rows: [{ id: 'D1' }, { id: 'D2' }] },
    business_plans: { rows: [{ id: 'BP1', nom: 'Horizon Farm' }] },
  };
  const profile = buildInvestorForumProfile({
    crud,
    dataMap: composeDecisionDataMap({ crud, dataMap: {} }),
  });
  const pack = buildForumPack(profile, { audienceKey: 'investisseur_prive', packType: 'rapport_financier' });
  const { blob, filename } = renderForumPackPdfBlob(pack);
  assert.ok(blob);
  assert.ok(filename.endsWith('.pdf'));
  assert.ok(pack.sections.length >= 8);
});

test('parcours 5 — sync ERP détecte écart et propose réparation guidée', () => {
  const issue = {
    module: 'payments',
    row_id: 'PAY-SYNC-1',
    linked_id: 'VEN-SYNC-1',
    message: 'Un encaissement de vente n’apparaît pas encore dans les finances.',
    flow: 'sales_finance',
  };
  assert.equal(classifySyncIssue(issue), GUIDED_REPAIR_SCENARIOS.PAID_SALE_NO_FINANCE);
  assert.equal(routeForSyncIssue(issue), 'ventes');

  const actions = getGuidedRepairActions(issue, {
    dataMap: {
      payments: [{ id: 'PAY-SYNC-1', order_id: 'VEN-SYNC-1', montant: 75000 }],
      sales_orders: [{ id: 'VEN-SYNC-1', montant_total: 75000 }],
      finances: [],
    },
    onCreateFinanceTransaction: () => {},
    onUpdatePayment: () => {},
    onUpdateFinanceTransaction: () => {},
    onUpdateDocument: () => {},
    onCreateStock: () => {},
    onUpdateStock: () => {},
    onUpdateAlimentation: () => {},
    onUpdateAlert: () => {},
    onUpdateTask: () => {},
    onUpdateSmartfarmEvent: () => {},
    onRefreshSmartfarmEvents: () => {},
    onCreateSensor: () => {},
    onRefreshSensors: () => {},
  });
  assert.ok(actions.length > 0);
  assert.ok(actions.length <= 3);

  const task = buildSyncRepairTask(issue);
  assert.ok(task.title);
  assert.equal(task.module_lie, 'ventes');
  assert.equal(task.source_module, 'sync_activity');
});
