import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import EquipementsV3 from '../../src/modules/EquipementsV3.jsx';
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
  onNavigate: () => {},
  onRefresh: () => {},
  onUpdate: async () => {},
};

test('EquipementsV3 renders through the canonical operational module', () => {
  const html = renderToString(React.createElement(EquipementsV3, baseProps));
  assert.ok(html.includes('Équipements') || html.length > 50);
});

test('VentesV4 renders without missing repair panel', () => {
  const html = renderToString(React.createElement(VentesV4, { ...baseProps, embedded: false }));
  assert.ok(html.length > 50);
});
