import test from 'node:test';
import assert from 'node:assert/strict';

import { parseWhatsAppCommand, detectWhatsAppScenario } from '../../src/services/whatsappHorizon/whatsappCommandParser.js';
import { WHATSAPP_DEMO_MESSAGES } from '../../src/services/whatsappHorizon/whatsappDemoMessages.js';
import {
  analyzeWhatsAppMessage,
  validateWhatsAppDraft,
} from '../../src/services/whatsappHorizon/whatsappDraftService.js';
import { AI_DRAFT_SOURCES, TARGET_WORKFLOWS } from '../../src/services/aiGateway/aiActionDrafts.js';
import { validateDraftForExecution } from '../../src/services/aiGateway/aiSafetyGuard.js';

const lots = [
  { id: 'LOT-CHAIR-1', nom: 'lot chair', type: 'poulets_de_chair' },
];

const clients = [
  { id: 'CLI-A', nom: 'Client A', name: 'Client A' },
];

const salesOrders = [
  { id: 'CMD-001', client_id: 'CLI-A', client_nom: 'Client A', montant_total: 90000, montant_paye: 45000 },
];

const payments = [
  { id: 'PAY-1', order_id: 'CMD-001', montant: 45000, montant_paye: 45000 },
];

const dataMap = {
  lots,
  avicole: lots,
  clients,
  sales_orders: salesOrders,
  salesOrders,
  payments,
  paymentsAll: payments,
  stock: [{ id: 'STK-ALI', produit: 'aliment', quantite: 50 }],
};

test('detectWhatsAppScenario distingue encaissement, livraison, mortalité', () => {
  assert.equal(detectWhatsAppScenario("J'ai encaissé 45 000 FCFA du client A."), 'payment_collection');
  assert.equal(detectWhatsAppScenario("J'ai livré 10 poulets à la supérette du coin."), 'delivery');
  assert.equal(detectWhatsAppScenario('5 poulets sont morts aujourd\'hui dans le lot chair.'), 'mortality');
});

test('vente œufs Orange Money → brouillon gateway commercial', () => {
  const msg = WHATSAPP_DEMO_MESSAGES.find((m) => m.id === 'demo-sale-eggs').text;
  const result = parseWhatsAppCommand(msg, dataMap);
  assert.equal(result.scenario, 'sale');
  assert.ok(result.drafts.length >= 1);
  const primary = result.drafts[0];
  assert.equal(primary.intent, 'sale_record');
  assert.equal(primary.source, AI_DRAFT_SOURCES.WHATSAPP);
  assert.equal(primary.target_workflow, TARGET_WORKFLOWS.SALE);
  assert.equal(primary.draft.fields?.payment_method, 'orange_money');
});

test('achat aliment → workflow achat stock', () => {
  const msg = WHATSAPP_DEMO_MESSAGES.find((m) => m.id === 'demo-purchase-feed').text;
  const result = parseWhatsAppCommand(msg, dataMap);
  const primary = result.drafts[0];
  assert.equal(primary.intent, 'purchase_stock');
  assert.equal(primary.source, AI_DRAFT_SOURCES.WHATSAPP);
  assert.ok([TARGET_WORKFLOWS.PURCHASE, TARGET_WORKFLOWS.STOCK_PURCHASE].includes(primary.target_workflow));
});

test('mortalité lot chair → santé / élevage', () => {
  const msg = WHATSAPP_DEMO_MESSAGES.find((m) => m.id === 'demo-mortality').text;
  const result = parseWhatsAppCommand(msg, dataMap);
  assert.equal(result.scenario, 'mortality');
  const primary = result.drafts[0];
  assert.equal(primary.intent, 'mortality_event');
  assert.equal(primary.target_workflow, TARGET_WORKFLOWS.HEALTH);
});

test('encaissement client A → recordSalePayment quand vente ouverte', () => {
  const msg = WHATSAPP_DEMO_MESSAGES.find((m) => m.id === 'demo-payment').text;
  const result = parseWhatsAppCommand(msg, dataMap);
  assert.equal(result.scenario, 'payment_collection');
  const primary = result.drafts[0];
  assert.equal(primary.intent, 'sale_payment');
  assert.equal(primary.target_workflow, TARGET_WORKFLOWS.SALE_PAYMENT);
  assert.equal(primary.draft.fields?.order_id, 'CMD-001');
});

test('livraison → formulaire commercial (open_form)', () => {
  const msg = WHATSAPP_DEMO_MESSAGES.find((m) => m.id === 'demo-delivery').text;
  const result = parseWhatsAppCommand(msg, dataMap);
  assert.equal(result.scenario, 'delivery');
  const primary = result.drafts[0];
  assert.equal(primary.intent, 'sale_delivery');
  assert.equal(primary.target_workflow, TARGET_WORKFLOWS.OPEN_FORM);
});

test('analyzeWhatsAppMessage ne journalise whatsapp_logs que via handler', async () => {
  let logged = null;
  const result = await analyzeWhatsAppMessage({
    message: WHATSAPP_DEMO_MESSAGES[0].text,
    dataMap,
    handlers: {
      onCreateWhatsappLog: async (row) => {
        logged = row;
        return row;
      },
    },
  });
  assert.ok(result.primaryDraft);
  assert.ok(logged);
  assert.equal(logged.provider, 'simulation');
  assert.equal(logged.channel, 'whatsapp_demo');
});

test('validation utilisateur requise avant exécution', () => {
  const msg = WHATSAPP_DEMO_MESSAGES.find((m) => m.id === 'demo-sale-eggs').text;
  const parsed = parseWhatsAppCommand(msg, dataMap);
  const draft = parsed.drafts[0];
  assert.equal(validateDraftForExecution(draft).ok, false);
  const validated = validateWhatsAppDraft(draft);
  assert.equal(validated.user_validated, true);
  assert.equal(validateDraftForExecution(validated).ok, true);
});

test('aucune écriture directe : brouillon seul sans user_validated', () => {
  const parsed = parseWhatsAppCommand(WHATSAPP_DEMO_MESSAGES[0].text, dataMap);
  assert.notEqual(parsed.drafts[0].user_validated, true);
  assert.equal(parsed.drafts[0].required_validation, true);
});
