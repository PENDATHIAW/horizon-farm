import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  setupTestStorage,
  withSimulatedMode,
} from './helpers/moduleTabTestHarness.js';
import { COMMERCIAL_TABS } from '../../src/utils/commercialNavigation.js';
import { horizonFarmSimulationSeed } from '../../src/utils/horizonFarmSimulationSeed.js';
import { AppProvider } from '../../src/context/AppContext.jsx';
import { AuthProvider } from '../../src/context/AuthContext.jsx';

setupTestStorage();

const ERROR_PATTERN = /ERREUR MODULE|is not defined|useAppData must be used|cannot read properties of undefined|useApp must be used/i;

const ACTION_MARKERS = [
  /nouvelle vente/i,
  /client/i,
  /opportunit/i,
  /livraison/i,
  /relance/i,
];

async function loadSimulatedDataMap() {
  return withSimulatedMode(true, async () => {
    const {
      salesOrdersService,
      salesOrderItemsService,
      paymentsService,
      deliveriesService,
      invoicesService,
      salesOpportunitiesService,
    } = await import('../../src/services/salesService.js');
    const { clientsService } = await import('../../src/services/clientsService.js');
    const { financesService } = await import('../../src/services/financesService.js');
    const { stockService } = await import('../../src/services/stockService.js');
    const { animauxService } = await import('../../src/services/animauxService.js');
    const { avicoleService } = await import('../../src/services/avicoleService.js');
    const { culturesService } = await import('../../src/services/culturesService.js');
    const { documentsService } = await import('../../src/services/documentsService.js');
    const { tachesService } = await import('../../src/services/tachesService.js');
    const { alertesCenterService } = await import('../../src/services/alertesCenterService.js');
    const { businessEventsService } = await import('../../src/services/businessEventsService.js');
    const { whatsappLogsService } = await import('../../src/services/whatsappService.js');

    const [
      sales_orders,
      sales_order_items,
      clients,
      payments,
      deliveries,
      invoices,
      sales_opportunities,
      finances,
      stock,
      animaux,
      avicole,
      cultures,
      documents,
      taches,
      alertes_center,
      business_events,
      whatsapp_logs,
    ] = await Promise.all([
      salesOrdersService.getAll(),
      salesOrderItemsService.getAll(),
      clientsService.getAll(),
      paymentsService.getAll(),
      deliveriesService.getAll(),
      invoicesService.getAll(),
      salesOpportunitiesService.getAll(),
      financesService.getAll(),
      stockService.getAll(),
      animauxService.getAll(),
      avicoleService.getAll(),
      culturesService.getAll(),
      documentsService.getAll(),
      tachesService.getAll(),
      alertesCenterService.getAll(),
      businessEventsService.getAll(),
      whatsappLogsService.getAll(),
    ]);

    return {
      sales_orders,
      sales_order_items,
      clients,
      payments,
      deliveries,
      invoices,
      sales_opportunities,
      finances,
      stock,
      animaux,
      avicole,
      cultures,
      documents,
      taches,
      alertes_center,
      business_events,
      whatsapp_logs,
    };
  });
}

function buildPropsFromSeed(seed = horizonFarmSimulationSeed) {
  return {
    user: { email: 'test@horizonfarm.app', user_metadata: { name: 'Test' } },
    salesOrders: seed.sales_orders,
    salesOrdersAll: seed.sales_orders,
    orderItems: seed.sales_order_items,
    clients: seed.clients,
    payments: seed.payments,
    paymentsAll: seed.payments,
    deliveries: seed.deliveries,
    invoices: seed.invoices,
    opportunities: seed.sales_opportunities,
    transactions: seed.finances,
    transactionsAll: seed.finances,
    stocks: seed.stock,
    animaux: seed.animaux,
    lots: seed.avicole,
    cultures: seed.cultures,
    documents: seed.documents,
    taches: seed.taches,
    alertes: seed.alertes_center,
    businessEvents: seed.business_events,
    businessEventsAll: seed.business_events,
    rows: seed.sales_orders,
    onNavigate: () => {},
    onRefresh: () => {},
    onOpenAssistant: () => {},
    accessibleFarms: [{ id: 'HF-FARM-001', name: 'Horizon Farm', status: 'active' }],
    farmScope: { mode: 'all' },
    activeFarm: null,
    periodLabel: 'Mois en cours',
    periodFiltered: false,
    online: true,
  };
}

test('simulated CRUD path exposes commercial seed rows', async () => {
  const dataMap = await loadSimulatedDataMap();
  assert.ok(dataMap.sales_orders.length > 0, 'sales_orders simulées attendues');
  assert.ok(dataMap.clients.length > 0, 'clients simulés attendus');
  assert.ok(dataMap.finances.length > 0, 'finances simulées attendues (transactions→finances)');
  assert.ok(dataMap.payments.length > 0, 'payments simulés attendus');
});

for (const tab of COMMERCIAL_TABS) {
  test(`Commercial simulated mode tab: ${tab}`, async () => {
    await withSimulatedMode(true, async () => {
      const dataMap = await loadSimulatedDataMap();
      const mod = await import('../../src/modules/CommercialModule.jsx');

      const html = renderToString(
        React.createElement(
          AuthProvider,
          null,
          React.createElement(
            AppProvider,
            { initialDataMap: dataMap },
            React.createElement(
              mod.default,
              { ...buildPropsFromSeed(), initialTab: tab, key: tab },
            ),
          ),
        ),
      );

      assert.ok(html.length > 50, `Commercial/${tab} rendu vide en mode simulé`);
      assert.doesNotMatch(html, ERROR_PATTERN, `Erreur module sur ${tab}`);
    });
  });
}

test('Commercial simulated mode — actions principales visibles (Résumé)', async () => {
  await withSimulatedMode(true, async () => {
    const dataMap = await loadSimulatedDataMap();
    const mod = await import('../../src/modules/CommercialModule.jsx');

    const html = renderToString(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(
          AppProvider,
          { initialDataMap: dataMap },
          React.createElement(mod.default, { ...buildPropsFromSeed(), initialTab: 'Résumé' }),
        ),
      ),
    );

    ACTION_MARKERS.forEach((pattern) => {
      assert.match(html, pattern, `Action attendue absente: ${pattern}`);
    });
  });
});
