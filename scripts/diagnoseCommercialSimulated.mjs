/**
 * Diagnostic: Commercial tabs with REAL simulated data path (baseSupabaseService).
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AppProvider } from '../src/context/AppContext.jsx';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { SIMULATED_DATA_MODE_KEY } from '../src/utils/uiPreferences.js';
import { COMMERCIAL_TABS } from '../src/utils/commercialNavigation.js';
import { salesOrdersService, salesOrderItemsService, paymentsService, deliveriesService, salesOpportunitiesService } from '../src/services/salesService.js';
import { clientsService } from '../src/services/clientsService.js';
import { financesService } from '../src/services/financesService.js';
import { stockService } from '../src/services/stockService.js';
import { animauxService } from '../src/services/animauxService.js';
import { avicoleService } from '../src/services/avicoleService.js';
import { culturesService } from '../src/services/culturesService.js';
import { businessEventsService } from '../src/services/businessEventsService.js';
import { documentsService } from '../src/services/documentsService.js';
import { alertesCenterService } from '../src/services/alertesCenterService.js';
import { tachesService } from '../src/services/tachesService.js';

// Import baseSupabaseService side effect (clears moduleSeedMap — like production)
import '../src/services/baseSupabaseService.js';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

globalThis.localStorage.setItem(SIMULATED_DATA_MODE_KEY, '1');

async function loadSimulatedCommercialProps() {
  const [
    salesOrders, orderItems, clients, payments, deliveries, opportunities,
    transactions, stocks, animaux, lots, cultures, businessEvents, documents, taches, alertes,
  ] = await Promise.all([
    salesOrdersService.getAll(),
    salesOrderItemsService.getAll(),
    clientsService.getAll(),
    paymentsService.getAll(),
    deliveriesService.getAll(),
    salesOpportunitiesService.getAll(),
    financesService.getAll(),
    stockService.getAll(),
    animauxService.getAll(),
    avicoleService.getAll(),
    culturesService.getAll(),
    businessEventsService.getAll(),
    documentsService.getAll(),
    tachesService.getAll(),
    alertesCenterService.getAll(),
  ]);

  return {
    user: { email: 'test@horizonfarm.app', user_metadata: { name: 'Test' } },
    salesOrders,
    salesOrdersAll: salesOrders,
    orderItems,
    clients,
    payments,
    paymentsAll: payments,
    deliveries,
    opportunities,
    transactions,
    transactionsAll: transactions,
    stocks,
    animaux,
    lots,
    cultures,
    businessEvents,
    businessEventsAll: businessEvents,
    documents,
    taches,
    alertes,
    rows: salesOrders,
    dataMap: {},
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

async function main() {
  const mod = await import('../src/modules/CommercialModule.jsx');
  let baseProps;
  try {
    baseProps = await loadSimulatedCommercialProps();
  } catch (e) {
    console.error('loadSimulatedCommercialProps failed:', e);
    process.exit(1);
  }

  console.log('Simulated counts:', {
    salesOrders: baseProps.salesOrders.length,
    clients: baseProps.clients.length,
    payments: baseProps.payments.length,
    deliveries: baseProps.deliveries.length,
    opportunities: baseProps.opportunities.length,
  });

  const fails = [];
  for (const tab of COMMERCIAL_TABS) {
    try {
      const html = renderToString(
        React.createElement(
          AuthProvider,
          null,
          React.createElement(
            AppProvider,
            null,
            React.createElement(mod.default, { ...baseProps, initialTab: tab, key: tab }),
          ),
        ),
      );
      if (html.length <= 50) throw new Error(`empty render (${html.length})`);
      if (/ERREUR MODULE|is not defined|cannot read properties of undefined/i.test(html)) {
        throw new Error(html.slice(0, 400));
      }
      console.log(`OK ${tab}`);
    } catch (e) {
      console.log(`FAIL ${tab}: ${e.message}`);
      if (e.stack) console.log(e.stack.split('\n').slice(0, 8).join('\n'));
      fails.push({ tab, error: e.message });
    }
  }

  if (fails.length) {
    console.log('\n=== FAILURES ===');
    fails.forEach((f) => console.log(`${f.tab}|${f.error}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
