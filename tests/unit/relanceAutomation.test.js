import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../../src/utils/horizonFarmSimulationSeed.js';
import {
  relanceLevelForOverdue,
  draftRelanceMessageDeterministic,
  draftRelanceMessage,
  buildDailyRelanceBatch,
  buildDailyRelanceBatchSync,
} from '../../src/services/relanceAutomation.js';

test('niveau de relance selon le retard (trop tôt < 2 j)', () => {
  assert.equal(relanceLevelForOverdue(0), null);
  assert.equal(relanceLevelForOverdue(1), null);
  assert.equal(relanceLevelForOverdue(3).key, 'j2');
  assert.equal(relanceLevelForOverdue(8).key, 'j7');
  assert.equal(relanceLevelForOverdue(30).key, 'j15');
});

test('rédaction déterministe : personnalisée selon le segment', () => {
  const warm = draftRelanceMessageDeterministic({ level: 'j2', clientName: 'Restaurant Teranga', amount: 50000, segment: 'Fidèle' });
  assert.match(warm, /fidélité/i);
  assert.match(warm, /Restaurant Teranga/);
  const sensitive = draftRelanceMessageDeterministic({ level: 'j15', clientName: 'Client X', amount: 90000, segment: 'Dormant', overdueDays: 20 });
  assert.match(sensitive, /échéancier/i);
});

test('amorce IA : utilisée si fournie, repli déterministe si elle échoue', async () => {
  const ctx = { level: 'j7', clientName: 'Client Y', amount: 100000, overdueDays: 8 };
  const ai = await draftRelanceMessage(ctx, async (c) => `Message sur mesure pour ${c.clientName}`);
  assert.equal(ai.source, 'ai');
  assert.match(ai.message, /Message sur mesure pour Client Y/);

  const broken = await draftRelanceMessage(ctx, async () => { throw new Error('réseau indisponible'); });
  assert.equal(broken.source, 'deterministic');
  assert.match(broken.message, /Client Y/);

  const empty = await draftRelanceMessage(ctx, async () => '');
  assert.equal(empty.source, 'deterministic');
});

test('lot du jour : créances du seed détectées, prêtes à envoyer (manuel)', async () => {
  const batch = await buildDailyRelanceBatch({ clients: seed.clients, orders: seed.sales_orders, payments: seed.payments });
  assert.ok(batch.items.length >= 1, 'au moins une relance détectée');
  assert.ok(batch.summary.totalAmount > 0);
  assert.equal(batch.summary.count, batch.items.length);

  for (const item of batch.items) {
    assert.ok(item.amount > 0, 'montant dû positif');
    assert.ok(['j2', 'j7', 'j15'].includes(item.level));
    assert.match(item.message, new RegExp(item.clientName.slice(0, 6)), 'message nominatif');
    assert.ok(item.whatsappUrl.startsWith('https://wa.me/'), 'lien WhatsApp prêt');
    assert.equal(item.requiresManualSend, true, 'envoi manuel : pas d\'envoi automatique');
    assert.equal(item.messageSource, 'deterministic');
  }
  // Trié par ancienneté décroissante.
  for (let i = 1; i < batch.items.length; i += 1) {
    assert.ok(batch.items[i - 1].overdueDays >= batch.items[i].overdueDays);
  }
});

test('variante synchrone (rendu UI) : même résultat déterministe que la version async', async () => {
  const params = { clients: seed.clients, orders: seed.sales_orders, payments: seed.payments };
  const sync = buildDailyRelanceBatchSync(params);
  const async = await buildDailyRelanceBatch(params);
  assert.equal(sync.items.length, async.items.length);
  assert.equal(sync.summary.totalAmount, async.summary.totalAmount);
  assert.ok(sync.items.every((i) => i.messageSource === 'deterministic' && i.whatsappUrl.startsWith('https://wa.me/')));
});

test('lot du jour : le compteur IA reflète l\'usage de l\'amorce', async () => {
  const batch = await buildDailyRelanceBatch({
    clients: seed.clients,
    orders: seed.sales_orders,
    payments: seed.payments,
    aiDrafter: async (ctx) => `Bonjour ${ctx.clientName}, solde ${ctx.amount} FCFA à régler.`,
  });
  assert.equal(batch.summary.aiDrafted, batch.items.length);
  assert.ok(batch.items.every((i) => i.messageSource === 'ai'));
});
