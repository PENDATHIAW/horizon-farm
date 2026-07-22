import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getErpData,
  getErpDataSnapshot,
  getErpUser,
  setErpDataSnapshot,
} from '../../src/services/erpDataSnapshot.js';
import { openDailyQuickEntry } from '../../src/utils/dailyQuickEntry.js';
import {
  clearPendingFormModals,
  subscribeFormModal,
} from '../../src/services/formModalManager.js';

test('l’instantané ERP se publie et se lit sans secret ni mutation externe', () => {
  setErpDataSnapshot({ data: { clients: [{ id: 'CL-1' }] }, user: 'aissatou' });
  assert.deepEqual(getErpData(), { clients: [{ id: 'CL-1' }] });
  assert.equal(getErpUser(), 'aissatou');
  assert.equal(getErpDataSnapshot().user, 'aissatou');

  setErpDataSnapshot();
  assert.deepEqual(getErpData(), {});
  assert.equal(getErpUser(), '');
});

test('la saisie rapide sans données explicites retombe sur l’instantané publié', () => {
  clearPendingFormModals();
  // Un seul client connu : le contrat « dernier_client » doit préremplir.
  setErpDataSnapshot({
    data: {
      clients: [{ id: 'CL-UNIQUE', nom: 'Coopérative Thiès' }],
      salesOrders: [{ id: 'CMD-1', client_id: 'CL-UNIQUE', client_nom: 'Coopérative Thiès', date: '2026-07-10' }],
    },
    user: 'ousmane',
  });

  const received = [];
  const unsubscribe = subscribeFormModal((detail) => {
    received.push(detail);
    return true;
  }, { modules: ['commercial'], replayPending: false });

  const entry = { id: 'vente', module: 'commercial', onglet: 'Ventes & commandes', libelle: 'Vente' };
  // Aucun 3e argument : la source des données vient de l’instantané.
  assert.equal(openDailyQuickEntry(entry, () => {}), true);
  unsubscribe();

  assert.equal(received.length, 1);
  const fields = received[0].draft.draft_fields;
  // L’utilisateur connecté a été hérité de l’instantané, pas resaisi.
  assert.equal(fields.responsable, 'ousmane');
  // Une date du jour est posée automatiquement.
  assert.ok(fields.date, 'la date du jour est préremplie');

  setErpDataSnapshot();
});
