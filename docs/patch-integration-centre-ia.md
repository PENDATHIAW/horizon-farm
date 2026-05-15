# Patch d'integration — Centre IA Horizon Farm

Ce document indique les modifications restantes pour rendre le module Centre IA visible dans l'application.

## 1. App.jsx — Ajouter l'icone

Dans l'import `lucide-react`, ajouter :

```js
BrainCircuit,
```

## 2. App.jsx — Ajouter le module lazy

Dans `MODULES`, ajouter :

```js
centre_ia: lazy(() => import('./modules/CentreIA')),
```

## 3. App.jsx — Ajouter le menu

Dans `navItems`, ajouter juste apres Dashboard :

```js
{ id: 'centre_ia', label: 'Centre IA', icon: BrainCircuit, hasAlert: stocksCritiques > 0 || lotsAlerte > 0 || financesAlerte > 0 },
```

## 4. App.jsx — Ajouter les props du module

Dans `moduleProps`, ajouter :

```js
centre_ia: {
  lots: avicoleCrud.rows,
  productionLogs: productionOeufsLogsCrud.rows,
  alimentationLogs: alimentationLogsCrud.rows,
  stocks: stockCrud.rows,
  marketPrices: dataMap.market_prices || [],
  marketCalendarEvents: dataMap.market_calendar_events || [],
  salesOrders: salesOrdersCrud.rows,
  payments: paymentsCrud.rows,
  transactions: financesCrud.rows,
  smartfarmEvents: dataMap.smartfarm_events || [],
  sensors: sensorDevicesCrud.rows,
  cameras: cameraDevicesCrud.rows,
  meteo: liveMeteo,
  onNavigate: setActive,
},
```

## 5. AppContext.jsx — Ajouter les services IA

Importer :

```js
import {
  marketPricesService,
  marketPriceSourcesService,
  marketCalendarEventsService,
} from '../services/marketPricesService';
```

Puis dans `serviceMap`, ajouter :

```js
market_prices: marketPricesService,
market_price_sources: marketPriceSourcesService,
market_calendar_events: marketCalendarEventsService,
```

## 6. AppContext.jsx — Ajouter les donnees initiales

Dans `initialData`, ajouter :

```js
market_prices: clone(moduleSeedMap.market_prices || []),
market_price_sources: clone(moduleSeedMap.market_price_sources || []),
market_calendar_events: clone(moduleSeedMap.market_calendar_events || []),
smartfarm_events: clone(moduleSeedMap.smartfarm_events || []),
```

## 7. AuthContext.jsx — Permissions

Le role admin a deja acces a tout via `['*']`.

Pour les autres roles, ajouter `centre_ia` selon besoin :

```js
manager: ['dashboard', 'centre_ia', ...]
veterinaire: ['dashboard', 'centre_ia', ...]
comptable: ['dashboard', 'centre_ia', ...]
```

## 8. Verification attendue

Apres integration :

- le menu affiche Centre IA ;
- le module charge `src/modules/CentreIA.jsx` ;
- le score IA s'affiche ;
- les decisions IA s'affichent ;
- les previsions aliment, oeufs et cash s'affichent ;
- aucune duplication de module metier n'est creee.

## 9. Commandes de test recommandees

```bash
npm install
npm run lint
npm run build
```

## Statut

Le coeur IA existe deja. Ce patch sert uniquement a rendre le Centre IA visible et connecte dans l'application.
