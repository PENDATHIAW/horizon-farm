import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import JournalEvenements from '../../src/components/shared/JournalEvenements.jsx';
import ListeTaches from '../../src/components/shared/ListeTaches.jsx';
import ListeAlertes from '../../src/components/shared/ListeAlertes.jsx';
import CarteKPI from '../../src/components/shared/CarteKPI.jsx';

test('JournalEvenements rend une seule occurrence par event_key', () => {
  const html = renderToString(React.createElement(JournalEvenements, {
    events: [
      { id: 'e1', event_key: 'same', title: 'Ponte enregistrée', event_date: '2026-07-12' },
      { id: 'e2', event_key: 'same', title: 'Rejeu invisible', event_date: '2026-07-12' },
    ],
  }));
  assert.match(html, /Ponte enregistrée/);
  assert.doesNotMatch(html, /Rejeu invisible/);
});

test('ListeTaches rend les tâches filtrées', () => {
  const html = renderToString(React.createElement(ListeTaches, {
    tasks: [{ id: 't1', assigned_to: 'u1', title: 'Contrôler le lot', status: 'a_faire' }],
    assignedTo: 'u1',
    statuses: ['a_faire'],
  }));
  assert.match(html, /Contrôler le lot/);
});

test('ListeAlertes rend les alertes filtrées', () => {
  const html = renderToString(React.createElement(ListeAlertes, {
    alerts: [{ id: 'a1', title: 'Stock critique', severity: 'critique', status: 'nouvelle' }],
    severities: ['critique'],
  }));
  assert.match(html, /Stock critique/);
});

test('CarteKPI rend valeur, période et source reçues', () => {
  const html = renderToString(React.createElement(CarteKPI, {
    code: 'ca',
    kpi: { code: 'ca', label: 'Chiffre affaires', value: 125000, unit: 'FCFA', period: 'Juillet', source: 'Commercial' },
  }));
  assert.match(html, /125/);
  assert.match(html, /Juillet/);
  assert.match(html, /Commercial/);
});
