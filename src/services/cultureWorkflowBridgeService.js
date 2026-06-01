const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value = '') => String(value || '').trim().toLowerCase();
const n = (value = 0) => Number(value || 0) || 0;

function stockForCulture(stocks = [], cultureId = '') {
  const id = clean(cultureId);
  return arr(stocks).filter((row) => clean(row.source_record_id || row.linked_event_id || row.culture_id) === id
    || clean(row.origine_label || '').includes(id));
}

function salesForCulture(salesOrders = [], cultureId = '') {
  const id = clean(cultureId);
  return arr(salesOrders).filter((order) => {
    const source = clean(order.source_module || order.product_type || '');
    const sourceId = clean(order.source_id || order.product_id || order.culture_id);
    return source.includes('culture') && sourceId === id;
  });
}

function harvestEvents(businessEvents = [], cultureId = '') {
  const id = clean(cultureId);
  return arr(businessEvents).filter((event) => {
    const target = clean(event.target_id || event.culture_id || event.related_id || event.source_record_id);
    const type = clean(`${event.event_type || ''} ${event.type_evenement || ''}`);
    return target === id && (type.includes('recolte') || type.includes('récolte'));
  });
}

export function auditCultureWorkflow({ cultures = [], stocks = [], salesOrders = [], businessEvents = [] } = {}) {
  return arr(cultures).map((culture) => {
    const harvests = harvestEvents(businessEvents, culture.id);
    const stockRows = stockForCulture(stocks, culture.id);
    const sales = salesForCulture(salesOrders, culture.id);
    const harvestedQty = n(culture.quantite_recoltee ?? culture.production_reelle);
    const stockQty = stockRows.reduce((sum, row) => sum + n(row.quantite ?? row.quantity), 0);
    const soldQty = sales.reduce((sum, order) => sum + n(order.quantite ?? order.quantity ?? order.qty), 0);
    const soldAmount = sales.reduce((sum, order) => sum + n(order.montant_total ?? order.total), 0);
    const gaps = [];
    if (harvestedQty > 0 && !stockRows.length) gaps.push('recolte_sans_stock');
    if (stockQty > 0 && !sales.length) gaps.push('stock_sans_vente');
    if (harvestedQty > stockQty + soldQty + 1) gaps.push('quantite_non_rapprochee');
    return {
      cultureId: culture.id,
      label: culture.nom || culture.type || culture.id,
      harvestedQty,
      stockQty,
      soldQty,
      soldAmount,
      harvestCount: harvests.length,
      stockCount: stockRows.length,
      saleCount: sales.length,
      gaps,
      coherent: !gaps.length && harvestedQty > 0,
    };
  }).sort((a, b) => b.gaps.length - a.gaps.length);
}

export function summarizeCultureWorkflow(audit = []) {
  const rows = arr(audit);
  return {
    total: rows.length,
    coherent: rows.filter((row) => row.coherent).length,
    withGaps: rows.filter((row) => row.gaps.length).length,
    rows: rows.slice(0, 12),
  };
}
