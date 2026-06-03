import test from 'node:test';
import assert from 'node:assert/strict';

import {
  commitDocumentLink,
  DOCUMENT_TARGET_TYPES,
  isDocumentOrphan,
  runDocumentsScenario,
} from '../../src/utils/documentsWorkflow.js';
import { buildDocumentsGapRows } from '../../src/utils/documentsIntegrity.js';
import { findOrphanDocuments } from '../../src/services/documentsOrphanSyncService.js';
import { buildFinanceurReportData } from '../../src/services/financeurReportService.js';

test('document orphelin lié à dépense finance', async () => {
  const state = {
    documents: [{ id: 'DOC-ORPH', title: 'Scan facture', file_url: 'https://example.com/f.pdf' }],
    transactions: [{ id: 'TRX-EXP', libelle: 'Intrants', montant: 45000, type: 'sortie' }],
    salesOrders: [],
    payments: [],
    invoices: [],
    stocks: [],
    healthRecords: [],
    equipment: [],
    cultures: [],
    people: [],
    events: [],
    tasks: [],
    alertes: [],
  };

  const handlers = {
    onUpdateDocument: async (id, patch) => {
      const i = state.documents.findIndex((d) => d.id === id);
      state.documents[i] = { ...state.documents[i], ...patch };
    },
    onUpdateFinanceTransaction: async (id, patch) => {
      const i = state.transactions.findIndex((t) => t.id === id);
      state.transactions[i] = { ...state.transactions[i], ...patch };
    },
    onCreateBusinessEvent: async (row) => { state.events.push(row); },
  };

  const result = await commitDocumentLink({
    form: { document_id: 'DOC-ORPH', target_type: DOCUMENT_TARGET_TYPES.FINANCE, target_id: 'TRX-EXP' },
    context: state,
    handlers,
  });

  assert.equal(result.ok, true);
  assert.equal(state.documents[0].source_module, 'finances');
  assert.equal(state.documents[0].source_record_id, 'TRX-EXP');
  assert.equal(state.documents[0].transaction_id, 'TRX-EXP');
  assert.ok(state.documents[0].issue_key.includes('TRX-EXP'));
  assert.equal(state.transactions[0].document_id, 'DOC-ORPH');
  assert.equal(state.events.length, 1);
  assert.equal(isDocumentOrphan(state.documents[0]), false);
});

test('facture vente liée à commande', async () => {
  const state = {
    documents: [{ id: 'DOC-FAC', title: 'Facture vente PDF', file_url: 'https://example.com/fac.pdf' }],
    transactions: [],
    salesOrders: [{ id: 'CMD-77', product_name: 'Tomates', montant_total: 90000 }],
    payments: [],
    invoices: [],
    stocks: [],
    healthRecords: [],
    equipment: [],
    cultures: [],
    people: [],
    events: [],
    tasks: [],
    alertes: [],
  };

  const handlers = {
    onUpdateDocument: async (id, patch) => {
      const i = state.documents.findIndex((d) => d.id === id);
      state.documents[i] = { ...state.documents[i], ...patch };
    },
    onUpdateOrder: async (id, patch) => {
      const i = state.salesOrders.findIndex((o) => o.id === id);
      state.salesOrders[i] = { ...state.salesOrders[i], ...patch };
    },
    onCreateBusinessEvent: async (row) => { state.events.push(row); },
  };

  await commitDocumentLink({
    form: { document_id: 'DOC-FAC', target_type: DOCUMENT_TARGET_TYPES.SALE, target_id: 'CMD-77' },
    context: state,
    handlers,
  });

  assert.equal(state.documents[0].source_module, 'ventes');
  assert.equal(state.documents[0].order_id, 'CMD-77');
  assert.equal(state.salesOrders[0].document_id, 'DOC-FAC');
});

test('preuve achat stock liée', async () => {
  const state = {
    documents: [{ id: 'DOC-STK', title: 'Bon livraison engrais', file_url: 'https://example.com/bl.pdf' }],
    transactions: [],
    salesOrders: [],
    payments: [],
    invoices: [],
    stocks: [{ id: 'STK-9', produit: 'Engrais NPK' }],
    healthRecords: [],
    equipment: [],
    cultures: [],
    people: [],
    events: [],
    tasks: [],
    alertes: [],
  };

  const handlers = {
    onUpdateDocument: async (id, patch) => {
      const i = state.documents.findIndex((d) => d.id === id);
      state.documents[i] = { ...state.documents[i], ...patch };
    },
    onUpdateStock: async (id, patch) => {
      const i = state.stocks.findIndex((s) => s.id === id);
      state.stocks[i] = { ...state.stocks[i], ...patch };
    },
    onCreateBusinessEvent: async (row) => { state.events.push(row); },
  };

  await commitDocumentLink({
    form: { document_id: 'DOC-STK', target_type: DOCUMENT_TARGET_TYPES.STOCK_PURCHASE, target_id: 'STK-9' },
    context: state,
    handlers,
  });

  assert.equal(state.documents[0].stock_id, 'STK-9');
  assert.equal(state.stocks[0].proof_document_id, 'DOC-STK');
});

test('preuve soin liée', async () => {
  const state = {
    documents: [{ id: 'DOC-SANTE', title: 'Certificat vaccin', file_url: 'https://example.com/vac.pdf' }],
    transactions: [],
    salesOrders: [],
    payments: [],
    invoices: [],
    stocks: [],
    healthRecords: [{ id: 'SANTE-2', libelle: 'Vaccination lot A' }],
    equipment: [],
    cultures: [],
    people: [],
    events: [],
    tasks: [],
    alertes: [],
  };

  const handlers = {
    onUpdateDocument: async (id, patch) => {
      const i = state.documents.findIndex((d) => d.id === id);
      state.documents[i] = { ...state.documents[i], ...patch };
    },
    onUpdateHealthRecord: async (id, patch) => {
      const i = state.healthRecords.findIndex((h) => h.id === id);
      state.healthRecords[i] = { ...state.healthRecords[i], ...patch };
    },
    onCreateBusinessEvent: async (row) => { state.events.push(row); },
  };

  await commitDocumentLink({
    form: { document_id: 'DOC-SANTE', target_type: DOCUMENT_TARGET_TYPES.HEALTH, target_id: 'SANTE-2' },
    context: state,
    handlers,
  });

  assert.equal(state.documents[0].health_id, 'SANTE-2');
  assert.equal(state.healthRecords[0].proof_document_id, 'DOC-SANTE');
});

test('rapport financeur reprend preuves liées', async () => {
  const { state } = await runDocumentsScenario();
  const report = buildFinanceurReportData({
    documents: state.documents,
    transactions: state.transactions,
    salesOrders: state.salesOrders,
    payments: state.payments,
  });

  assert.ok(report.proofs.linkedCount >= 2);
  assert.equal(findOrphanDocuments(state.documents).length, 0);
  assert.ok(report.kpis.linkedProofs >= 2);
  assert.ok(report.proofs.rows.some((row) => row.module === 'finances' || row.module === 'ventes'));
});

test('buildDocumentsGapRows détecte orphelin et transaction sans preuve', () => {
  const gaps = buildDocumentsGapRows({
    documents: [{ id: 'D1', title: 'Scan perdu' }],
    transactions: [{ id: 'T1', libelle: 'Carburant', montant: 12000, type: 'sortie' }],
    salesOrders: [],
    payments: [],
    invoices: [],
  });

  assert.ok(gaps.some((g) => g.title === 'Document orphelin'));
  assert.ok(gaps.some((g) => g.title === 'Transaction sans preuve'));
});
