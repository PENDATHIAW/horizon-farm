import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSaleTasksOnPayment } from '../../src/services/erpInterconnectionEngine.js';

test('un paiement complet ferme la relance mais conserve la livraison ouverte', async () => {
  const updates = [];
  const result = await resolveSaleTasksOnPayment({
    sale: { id: 'CMD-1', montant_total: 100000 },
    payments: [{ id: 'PAY-1', order_id: 'CMD-1', montant: 100000, status: 'confirmed' }],
    tasks: [
      { id: 'TSK-RELANCE', related_id: 'CMD-1', title: 'Relancer le client', status: 'a_faire' },
      { id: 'TSK-LIVRAISON', related_id: 'CMD-1', title: 'Livrer la commande', status: 'a_faire' },
    ],
    handlers: {
      onUpdateTask: async (id, patch) => updates.push({ id, patch }),
    },
  });

  assert.equal(result, 1);
  assert.deepEqual(updates.map((row) => row.id), ['TSK-RELANCE']);
  assert.equal(updates[0].patch.status, 'termine');
});

test('un paiement partiel ne ferme aucune relance', async () => {
  const updates = [];
  const result = await resolveSaleTasksOnPayment({
    sale: { id: 'CMD-2', montant_total: 100000 },
    payments: [{ id: 'PAY-2', order_id: 'CMD-2', montant: 40000, status: 'confirmed' }],
    tasks: [{ id: 'TSK-RELANCE', related_id: 'CMD-2', title: 'Relancer le client', status: 'a_faire' }],
    handlers: {
      onUpdateTask: async (id, patch) => updates.push({ id, patch }),
    },
  });

  assert.equal(result, null);
  assert.deepEqual(updates, []);
});
