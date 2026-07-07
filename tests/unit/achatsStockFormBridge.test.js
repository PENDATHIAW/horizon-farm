import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STOCK_PENDING_FORM_KEY,
  stashStockPendingForm,
  readStockPendingForm,
  clearStockPendingForm,
} from '../../src/utils/achatsStockFormBridge.js';
import { navigationOptionsForFinding } from '../../src/utils/commercialNavigation.js';

test('stashStockPendingForm — file d’attente réception', () => {
  assert.equal(STOCK_PENDING_FORM_KEY, 'horizon_stock_pending_form');
  if (typeof window === 'undefined' || typeof window.sessionStorage?.getItem !== 'function') return;
  clearStockPendingForm();
  stashStockPendingForm('Réception test', { produit: 'Maïs', date: '2026-06-09' });
  const pending = readStockPendingForm();
  assert.equal(pending.form_type, 'stock_purchase');
  assert.equal(pending.intent_label, 'Réception test');
  assert.equal(pending.draft_fields.produit, 'Maïs');
  clearStockPendingForm();
  assert.equal(readStockPendingForm(), null);
});

test('navigationOptionsForFinding — alias Mouvements conservé', () => {
  const nav = navigationOptionsForFinding({ module: 'achats_stock', tab: 'Mouvements' });
  assert.equal(nav.module, 'achats_stock');
  assert.equal(nav.tab, 'Mouvements');
});
