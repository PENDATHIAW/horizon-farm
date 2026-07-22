import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import seed from '../../src/utils/horizonFarmSimulationSeed.js';
import CockpitIndicateursPanel from '../../src/modules/pilotage/CockpitIndicateursPanel.jsx';
import PredictiveAlertsPanel from '../../src/modules/pilotage/PredictiveAlertsPanel.jsx';
import FarmDigestPanel from '../../src/modules/pilotage/FarmDigestPanel.jsx';
import MobileMoneyReconciliationPanel from '../../src/modules/pilotage/MobileMoneyReconciliationPanel.jsx';

const data = {
  animaux: seed.animaux,
  avicole: seed.avicole,
  stock: seed.stock,
  sales_orders: seed.sales_orders,
  payments: seed.payments,
  finances: seed.finances,
  clients: seed.clients,
  production_oeufs_logs: seed.production_oeufs_logs || [],
};

test('CockpitIndicateursPanel : rend les activités et un statut', () => {
  const html = renderToStaticMarkup(React.createElement(CockpitIndicateursPanel, { data }));
  assert.match(html, /Cockpit indicateurs/);
  assert.match(html, /Poulets de chair|Pondeuses|Bovins|Stock|Commercial|Finance/);
});

test('PredictiveAlertsPanel : rend sans crash (peut être vide)', () => {
  const html = renderToStaticMarkup(React.createElement(PredictiveAlertsPanel, { data }));
  assert.equal(typeof html, 'string');
});

test('FarmDigestPanel : rend le rapport et le bouton copier', () => {
  const html = renderToStaticMarkup(React.createElement(FarmDigestPanel, { data }));
  assert.match(html, /Rapport de synthèse/);
  assert.match(html, /Copier/);
  assert.match(html, /Horizon Farm/);
});

test('MobileMoneyReconciliationPanel : rend la zone de saisie', () => {
  const html = renderToStaticMarkup(React.createElement(MobileMoneyReconciliationPanel, { data }));
  assert.match(html, /Rapprochement Mobile Money/);
  assert.match(html, /Wave|Orange Money/);
});

test('robustesse : données vides = pas de crash', () => {
  assert.doesNotThrow(() => renderToStaticMarkup(React.createElement(CockpitIndicateursPanel, { data: {} })));
  assert.doesNotThrow(() => renderToStaticMarkup(React.createElement(PredictiveAlertsPanel, { data: {} })));
  assert.doesNotThrow(() => renderToStaticMarkup(React.createElement(FarmDigestPanel, { data: {} })));
  assert.doesNotThrow(() => renderToStaticMarkup(React.createElement(MobileMoneyReconciliationPanel, { data: {} })));
});
