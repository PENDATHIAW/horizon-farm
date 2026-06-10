import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import Equipements from '../../src/modules/Equipements.jsx';
import VentesV4 from '../../src/modules/VentesV4.jsx';

const baseProps = {
  rows: [],
  stocks: [],
  clients: [],
  salesOrders: [],
  payments: [],
  transactions: [],
  tasks: [],
  alertes: [],
  sensors: [],
  cameras: [],
  onNavigate: () => {},
  onRefresh: () => {},
  onUpdate: async () => {},
};

test('Equipements renders without missing SmartFarm bridge', () => {
  const html = renderToString(React.createElement(Equipements, baseProps));
  assert.ok(html.includes('Parc matériel') || html.length > 50);
});

test('VentesV4 renders without missing repair panel', () => {
  const html = renderToString(React.createElement(VentesV4, { ...baseProps, embedded: false }));
  assert.ok(html.length > 50);
});
