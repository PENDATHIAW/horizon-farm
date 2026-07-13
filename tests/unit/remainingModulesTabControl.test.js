import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AppProvider } from '../../src/context/AppContext.jsx';
import { AuthProvider } from '../../src/context/AuthContext.jsx';
import { horizonFarmSimulationSeed } from '../../src/utils/horizonFarmSimulationSeed.js';
import {
  resolveActiviteSuiviTab,
  resolveDocumentsTab,
  resolveRhTab,
} from '../../src/utils/commercialNavigation.js';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}

const sharedSeed = {
  user: { email: 'test@horizonfarm.app', user_metadata: { name: 'Test' } },
  alertes: horizonFarmSimulationSeed.alertes_center,
  taches: horizonFarmSimulationSeed.taches,
  tasks: horizonFarmSimulationSeed.taches,
  tracabilite: horizonFarmSimulationSeed.tracabilite || [],
  businessEvents: horizonFarmSimulationSeed.business_events,
  auditLogs: horizonFarmSimulationSeed.audit_logs || [],
  documents: horizonFarmSimulationSeed.documents,
  transactions: horizonFarmSimulationSeed.finances,
  onNavigate: () => {},
  onRefresh: () => {},
  accessibleFarms: [{ id: 'HF-FARM-001', name: 'Horizon Farm', status: 'active' }],
  farmScope: { mode: 'all' },
  activeFarm: null,
  periodLabel: 'Mois en cours',
  periodFiltered: false,
  online: true,
};

test('Activité & Suivi — onglet contrôlé Cockpit', async () => {
  const mod = await import('../../src/modules/ActiviteSuiviRecoveredModule.jsx');
  const html = renderToString(
    React.createElement(AuthProvider, null, React.createElement(AppProvider, null, React.createElement(mod.default, {
      ...sharedSeed,
      initialTab: 'Cockpit & décisions',
      onTabChange: () => {},
    }))),
  );
  assert.match(html, /Activité|Santé suivi|Cockpit/i);
  assert.doesNotMatch(html, /ERREUR MODULE|is not defined/i);
});

test('Documents & Rapports — onglet contrôlé Archives', async () => {
  const mod = await import('../../src/modules/DocumentsRapportsModule.jsx');
  const html = renderToString(
    React.createElement(AuthProvider, null, React.createElement(AppProvider, null, React.createElement(mod.default, {
      ...sharedSeed,
      initialTab: 'Centre de contrôle',
      onTabChange: () => {},
    }))),
  );
  assert.match(html, /Documents|Archives immuables/i);
  assert.doesNotMatch(html, /ERREUR MODULE|is not defined/i);
});

test('Équipe — onglet contrôlé Vue d’ensemble', async () => {
  const mod = await import('../../src/modules/EquipeV1Module.jsx');
  const html = renderToString(
    React.createElement(AuthProvider, null, React.createElement(AppProvider, null, React.createElement(mod.default, {
      ...sharedSeed,
      equipements: horizonFarmSimulationSeed.equipements || [],
      initialTab: 'Vue d’ensemble',
      onTabChange: () => {},
    }))),
  );
  assert.match(html, /Équipe|Organisation opérationnelle/i);
  assert.doesNotMatch(html, /ERREUR MODULE|is not defined/i);
});

test('alias legacy — Résumé vers onglets canoniques', () => {
  assert.equal(resolveActiviteSuiviTab('Résumé'), 'ActiviteAlertsView');
  assert.equal(resolveDocumentsTab('Résumé'), 'ReportsArchivesView');
  assert.equal(resolveRhTab('Résumé'), 'TeamOverviewView');
});
