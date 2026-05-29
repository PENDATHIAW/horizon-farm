const rows = (crud) => crud?.rows || [];

/** Compose le dataMap décisionnel partagé entre Vision, Centre IA et Assistant. */
export function composeDecisionDataMap({ crud = {}, dataMap = {}, liveMeteo = null } = {}) {
  return {
    animaux: rows(crud.animaux),
    avicole: rows(crud.avicole),
    lots: rows(crud.avicole),
    cultures: rows(crud.cultures),
    stock: rows(crud.stock),
    stocks: rows(crud.stock),
    clients: rows(crud.clients),
    fournisseurs: rows(crud.fournisseurs),
    investissements: rows(crud.investissements),
    business_plans: rows(crud.business_plans),
    sales_orders: rows(crud.sales_orders),
    salesOrders: rows(crud.sales_orders),
    payments: rows(crud.payments),
    finances: rows(crud.finances),
    transactions: rows(crud.finances),
    production_oeufs_logs: rows(crud.production_oeufs_logs),
    productionLogs: rows(crud.production_oeufs_logs),
    alimentation_logs: rows(crud.alimentation_logs),
    alimentationLogs: rows(crud.alimentation_logs),
    alertes_center: rows(crud.alertes_center),
    alertes: rows(crud.alertes_center),
    taches: rows(crud.taches),
    tasks: rows(crud.taches),
    documents: rows(crud.documents),
    sales_opportunities: rows(crud.sales_opportunities),
    market_prices: dataMap.market_prices || [],
    market_calendar_events: dataMap.market_calendar_events || [],
    smartfarm_events: dataMap.smartfarm_events || [],
    meteo: liveMeteo,
  };
}

/** Props CRUD de base pour un module. */
export function composeCrudBase(key, crud = {}) {
  const mod = crud[key];
  return {
    rows: rows(mod),
    loading: mod?.loading,
    onCreate: mod?.create,
    onUpdate: mod?.update,
    onDelete: mod?.remove,
    onRefresh: mod?.refresh,
  };
}

/** Données rapport consolidées. */
export function composeReportData(crud = {}) {
  return {
    animaux: rows(crud.animaux),
    lots: rows(crud.avicole),
    sante: rows(crud.sante),
    stocks: rows(crud.stock),
    cultures: rows(crud.cultures),
    salesOrders: rows(crud.sales_orders),
    payments: rows(crud.payments),
    transactions: rows(crud.finances),
    finances: rows(crud.finances),
    documents: rows(crud.documents),
    clients: rows(crud.clients),
    fournisseurs: rows(crud.fournisseurs),
    investissements: rows(crud.investissements),
    taches: rows(crud.taches),
    alertes: rows(crud.alertes_center),
    equipements: rows(crud.equipements),
  };
}

/** Trace partagée alertes / tâches / audit. */
export function composeActionTraceShared(crud = {}, online = true) {
  return {
    tasks: rows(crud.taches),
    alertes: rows(crud.alertes_center),
    businessEvents: rows(crud.business_events),
    events: rows(crud.business_events),
    auditLogs: rows(crud.audit_logs),
    online,
  };
}

/** Ressources internes RH / équipements. */
export function composeInternalResources(crud = {}) {
  return {
    equipements: rows(crud.equipements),
    transactions: rows(crud.finances),
    documents: rows(crud.documents),
    tasks: rows(crud.taches),
  };
}
