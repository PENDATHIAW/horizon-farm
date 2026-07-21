import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectProvider,
  parseMobileMoneyStatement,
  matchMobileMoneyTransaction,
  buildMobileMoneyReconciliation,
} from '../../src/services/mobileMoneyReconciliation.js';

test('détection opérateur', () => {
  assert.equal(detectProvider('Wave: vous avez reçu...'), 'wave');
  assert.equal(detectProvider('Orange Money confirmation'), 'orange_money');
  assert.equal(detectProvider('paiement mobile'), 'mobile_money');
});

test('parse relevé : montant, téléphone, référence, date, sens', () => {
  const txs = parseMobileMoneyStatement([
    'Wave: Vous avez recu 25000 FCFA de +221 77 123 45 67. Ref: TXN123 le 20/07/2026',
    'Orange Money: Vous avez envoye 5000 FCFA a 785551234. Transaction: OM999 le 21/07/2026',
    'ligne sans montant',
  ].join('\n'));
  assert.equal(txs.length, 2);
  assert.equal(txs[0].provider, 'wave');
  assert.equal(txs[0].amount, 25000);
  assert.equal(txs[0].phone, '221771234567');
  assert.equal(txs[0].reference, 'TXN123');
  assert.equal(txs[0].date, '2026-07-20');
  assert.equal(txs[0].direction, 'entree');
  assert.equal(txs[1].direction, 'sortie', 'envoi = sortie');
});

test('match : client par téléphone + montant exact = forte confiance', () => {
  const tx = { amount: 25000, phone: '221771234567', direction: 'entree', reference: 'T1' };
  const clients = [{ id: 'CLI1', nom: 'Awa', telephone: '77 123 45 67' }];
  const orders = [{ id: 'CMD1', client_id: 'CLI1', montant_total: 25000, reste_a_payer: 25000 }];
  const m = matchMobileMoneyTransaction(tx, { orders, clients, payments: [] });
  assert.equal(m.status, 'matched');
  assert.equal(m.order.id, 'CMD1');
  assert.ok(m.confidence >= 0.9);
});

test('match : montant exact sans client identifié = confiance moyenne', () => {
  const tx = { amount: 40000, phone: '', direction: 'entree' };
  const orders = [{ id: 'CMD2', client_id: 'CLI2', montant_total: 40000, reste_a_payer: 40000 }];
  const m = matchMobileMoneyTransaction(tx, { orders, clients: [], payments: [] });
  assert.equal(m.status, 'matched');
  assert.equal(m.confidence, 0.7);
});

test('match : plusieurs commandes au même montant = ambigu', () => {
  const tx = { amount: 10000, direction: 'entree' };
  const orders = [
    { id: 'A', client_id: 'X', montant_total: 10000, reste_a_payer: 10000 },
    { id: 'B', client_id: 'Y', montant_total: 10000, reste_a_payer: 10000 },
  ];
  const m = matchMobileMoneyTransaction(tx, { orders, clients: [], payments: [] });
  assert.equal(m.status, 'ambiguous');
  assert.equal(m.candidates.length, 2);
});

test('match : référence déjà encaissée = doublon', () => {
  const tx = { amount: 25000, direction: 'entree', reference: 'T1' };
  const m = matchMobileMoneyTransaction(tx, { orders: [], clients: [], payments: [{ mobile_money_ref: 'T1' }] });
  assert.equal(m.status, 'duplicate');
});

test('match : transaction sortante ignorée', () => {
  const m = matchMobileMoneyTransaction({ amount: 5000, direction: 'sortie' }, { orders: [], clients: [], payments: [] });
  assert.equal(m.status, 'ignored');
});

test('match : aucune commande correspondante', () => {
  const m = matchMobileMoneyTransaction({ amount: 99999, direction: 'entree' }, { orders: [{ id: 'Z', reste_a_payer: 100 }], clients: [], payments: [] });
  assert.equal(m.status, 'unmatched');
});

test('lot complet : rapprochées produisent un brouillon d\'encaissement à valider', () => {
  const statement = [
    'Wave: recu 25000 FCFA de 771234567 Ref TXN1 le 20/07/2026',
    'Wave: recu 99000 FCFA de 780000000 Ref TXN2 le 20/07/2026',
  ].join('\n');
  const clients = [{ id: 'CLI1', nom: 'Awa', telephone: '771234567' }];
  const orders = [{ id: 'CMD1', client_id: 'CLI1', montant_total: 25000, reste_a_payer: 25000 }];
  const { items, summary } = buildMobileMoneyReconciliation({ statement, orders, clients, payments: [] });
  assert.equal(summary.total, 2);
  assert.equal(summary.matched, 1);
  assert.equal(summary.unmatched, 1);
  const matched = items.find((i) => i.status === 'matched');
  assert.equal(matched.draft.form_type, 'payment_record');
  assert.equal(matched.draft.requestedAmount, 25000);
  assert.equal(matched.draft.paymentMethod, 'wave');
  assert.equal(matched.draft.mobile_money_ref, 'TXN1');
  assert.equal(matched.draft.requires_validation, true);
  assert.ok(summary.autoMatchRate >= 50);
});

test('lot : accepte des transactions déjà structurées (sans relevé texte)', () => {
  const transactions = [{ id: 't1', amount: 30000, phone: '221770000000', direction: 'entree', provider: 'orange_money', date: '2026-07-21', reference: 'R1' }];
  const orders = [{ id: 'O1', client_id: 'C1', reste_a_payer: 30000 }];
  const clients = [{ id: 'C1', telephone: '770000000' }];
  const { summary } = buildMobileMoneyReconciliation({ transactions, orders, clients, payments: [] });
  assert.equal(summary.matched, 1);
});
