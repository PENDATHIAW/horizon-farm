import { rowsOf } from './moduleRows.js';
import { filterRowsByPeriodScope, isAllTimeScope, normalizePeriodScope } from './periodScope.js';

const arr = (value) => (Array.isArray(value) ? value : []);

/** Données CRUD live — prioritaire sur les props (snapshots période parfois périmés). */
export function crudFirstRows(provided, crud, periodFiltered = false) {
  const live = arr(crud?.rows);
  if (live.length) return live;
  return rowsOf(provided, crud, periodFiltered);
}

export function resolveCommercialDataset({
  props = {},
  ordersCrud,
  paymentsCrud,
  clientsCrud,
  opportunitiesCrud,
  deliveriesCrud,
  invoicesCrud,
  periodFiltered = false,
  periodScope,
}) {
  const scope = normalizePeriodScope(periodScope || props.periodScope);
  const ordersLive = crudFirstRows(props.salesOrdersAll || props.salesOrders || props.rows, ordersCrud, false);
  const paymentsLive = crudFirstRows(props.paymentsAll || props.payments, paymentsCrud, false);
  const deliveriesLive = crudFirstRows(props.deliveries, deliveriesCrud, false);
  const invoicesLive = crudFirstRows(props.invoices, invoicesCrud, false);
  const clientsLive = crudFirstRows(props.clients, clientsCrud, false);
  const opportunitiesLive = crudFirstRows(props.opportunities, opportunitiesCrud, false);
  const applyPeriod = periodFiltered && !isAllTimeScope(scope);

  return {
    ordersAll: ordersLive,
    paymentsAll: paymentsLive,
    deliveriesAll: deliveriesLive,
    invoicesAll: invoicesLive,
    orders: applyPeriod ? filterRowsByPeriodScope(ordersLive, scope) : ordersLive,
    payments: applyPeriod ? filterRowsByPeriodScope(paymentsLive, scope) : paymentsLive,
    clients: applyPeriod ? filterRowsByPeriodScope(clientsLive, scope) : clientsLive,
    opportunities: applyPeriod ? filterRowsByPeriodScope(opportunitiesLive, scope) : opportunitiesLive,
  };
}
