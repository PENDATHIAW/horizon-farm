import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCommercialStartupJourney } from '../../src/utils/commercialStartup.js';
import { COMMERCIAL_HEY_HORIZON_QUESTIONS } from '../../src/utils/commercialHeyHorizon.js';
import {
  COMMERCIAL_TABS,
  isCommercialReconciliationAlias,
  resolveCommercialTab,
} from '../../src/utils/commercialNavigation.js';

test('parcours démarrage — encaissement pointe Finance Réconciliation', () => {
  const journey = buildCommercialStartupJourney({ clients: [{ id: 'C1', nom: 'Test' }] });
  const payment = journey.steps.find((s) => s.key === 'payment');
  assert.equal(payment.module, 'finance_pilotage');
  assert.equal(payment.tab, 'Réconciliation');
});

test('parcours démarrage — relance pointe Clients & créances', () => {
  const journey = buildCommercialStartupJourney({});
  const relance = journey.steps.find((s) => s.key === 'whatsapp');
  assert.equal(relance.tab, 'Clients & créances');
});

test('Hey Horizon créances pointe Clients & créances', () => {
  const item = COMMERCIAL_HEY_HORIZON_QUESTIONS.find((q) => q.id === 'receivables');
  assert.equal(item.tab, 'Clients & créances');
});

test('navigation commercial — 6 onglets canoniques', () => {
  const required = ['Ventes', 'Opportunités', 'Clients & créances', 'Livraisons', 'Abonnements', 'Pilotage'];
  assert.equal(COMMERCIAL_TABS.length, 6);
  required.forEach((tab) => assert.ok(COMMERCIAL_TABS.includes(tab), `onglet ${tab}`));
});

test('alias reconciliation détecté — redirect Finance géré par App', () => {
  assert.equal(isCommercialReconciliationAlias('reconciliation'), true);
  assert.equal(resolveCommercialTab('Pilotage'), 'Tableau de bord commercial');
  assert.equal(resolveCommercialTab('Clients & créances'), 'Créances & relances commercial');
});
