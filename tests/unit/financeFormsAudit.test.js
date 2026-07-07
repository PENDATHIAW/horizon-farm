import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('FinanceTransactionsOnly — client_id et fournisseur_id en select', () => {
  const source = readFileSync(path.join(root, 'src/modules/FinanceTransactionsOnly.jsx'), 'utf8');
  assert.match(source, /governFormFields\('finances'/);
  assert.match(source, /field\.key === 'client_id'/);
  assert.match(source, /field\.key === 'fournisseur_id'/);
  assert.match(source, /type: 'select'/);
});

test('FinancesV12 — catégorie Hey Horizon en select', () => {
  const source = readFileSync(path.join(root, 'src/modules/FinancesV12.jsx'), 'utf8');
  assert.match(source, /MODULE_FORM_FIELDS\.finances/);
  assert.match(source, /<select value=\{category\}/);
});

test('InvestissementsV9 — catégorie ligne investissement en select', () => {
  const source = readFileSync(path.join(root, 'src/modules/InvestissementsV9.jsx'), 'utf8');
  assert.match(source, /key: 'categorie'[\s\S]*type: 'select'/);
  assert.match(source, /value: 'cheptel'/);
});
