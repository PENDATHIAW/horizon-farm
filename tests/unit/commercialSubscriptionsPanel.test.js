import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import CommercialSubscriptionsPanel from '../../src/modules/commercial/CommercialSubscriptionsPanel.jsx';
import {
  buildSubscriptionRecord,
  readAllCommercialSubscriptions,
  upsertClientSubscription,
} from '../../src/utils/commercialSubscriptions.js';

const client = { id: 'CLI-ABO-1', nom: 'Grossiste Dakar Œufs' };
const seededClient = {
  ...client,
  ...upsertClientSubscription(client, buildSubscriptionRecord({
    client,
    productName: 'Œufs tablettes',
    quantity: 5,
    unit: 'tablette',
    frequency: 'weekly',
    plannedDay: 'vendredi',
    unitPrice: 3000,
  })),
};

test('Abonnements — aucune création implicite au rendu', () => {
  let updateCount = 0;
  const html = renderToString(
    React.createElement(CommercialSubscriptionsPanel, {
      clients: [seededClient],
      onUpdateClient: async () => { updateCount += 1; },
      onNewSale: () => {},
      activeFarm: null,
    }),
  );

  assert.match(html, /Nouvel abonnement/);
  assert.doesNotMatch(html, /ERREUR MODULE|is not defined/i);
  assert.equal(updateCount, 0);
  assert.equal(readAllCommercialSubscriptions([seededClient]).length, 1);
});

test('Abonnements — sauvegarde explicite ajoute une seule ligne', async () => {
  const clientsState = [{ ...client }];
  const panelProps = {
    clients: clientsState,
    onUpdateClient: async (id, patch) => {
      const idx = clientsState.findIndex((row) => row.id === id);
      if (idx >= 0) clientsState[idx] = { ...clientsState[idx], ...patch };
    },
    onNewSale: () => {},
    activeFarm: null,
  };

  renderToString(React.createElement(CommercialSubscriptionsPanel, panelProps));
  assert.equal(readAllCommercialSubscriptions(clientsState).length, 0);

  const record = buildSubscriptionRecord({
    client,
    productName: 'Poulets chair',
    quantity: 20,
    unit: 'tête',
    frequency: 'weekly',
    plannedDay: 'lundi',
    unitPrice: 4500,
  });
  await panelProps.onUpdateClient(client.id, upsertClientSubscription(client, record));
  assert.equal(readAllCommercialSubscriptions(clientsState).length, 1);
});
