import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCommercialStartupJourney } from '../../src/utils/commercialStartup.js';
import { COMMERCIAL_HEY_HORIZON_QUESTIONS } from '../../src/utils/commercialHeyHorizon.js';
import { COMMERCIAL_TABS } from '../../src/utils/commercialNavigation.js';

test('parcours démarrage — encaissement pointe Finance Réconciliation', () => {
  const journey = buildCommercialStartupJourney({ clients: [{ id: 'C1', nom: 'Test' }] });
  const payment = journey.steps.find((s) => s.key === 'payment');
  assert.equal(payment.module, 'finance_pilotage');
  assert.equal(payment.tab, 'Réconciliation');
});

test('parcours démarrage — relance pointe onglet Relances', () => {
  const journey = buildCommercialStartupJourney({});
  const relance = journey.steps.find((s) => s.key === 'whatsapp');
  assert.equal(relance.tab, 'Relances');
});

test('Hey Horizon créances pointe Relances (pas doublon Clients)', () => {
  const item = COMMERCIAL_HEY_HORIZON_QUESTIONS.find((q) => q.id === 'receivables');
  assert.equal(item.tab, 'Relances');
});

test('navigation commercial — un onglet principal par domaine métier', () => {
  const required = ['Résumé', 'Ventes', 'Clients', 'Livraisons', 'Relances', 'Opportunités', 'Pilotage', 'Graphiques'];
  required.forEach((tab) => assert.ok(COMMERCIAL_TABS.includes(tab), `onglet ${tab}`));
});
