/** Évite les doublons Activité & Suivi quand un workflow canonique a déjà émis l'événement. */

const WORKFLOW_MARKERS = [
  'commercial_sale_workflow',
  'commercial_sale_repair',
  'sale_workflow',
  'record_sale_payment',
  'stock_purchase_workflow',
  'purchase_side_effects',
  'culture_side_effects',
  'elevage_transformation_workflow',
  'alerte_creation',
  'alerte_action',
  'erp_health_engine',
  'smartfarm_event_alerte',
];

const clean = (value = '') => String(value || '').trim().toLowerCase();

export function shouldSkipAppContextBusinessEvent(record = {}, moduleKey = '') {
  if (!record?.id) return true;
  if (record.side_effects_managed === true) return true;

  const createdFrom = clean(record.created_from);
  if (createdFrom && WORKFLOW_MARKERS.some((marker) => createdFrom.includes(marker))) return true;

  if (moduleKey === 'sales_orders' && (createdFrom || record.workflow_id || record.commercial_workflow_id)) return true;
  if (moduleKey === 'payments' && createdFrom) return true;
  if (moduleKey === 'finances' && (createdFrom || record.transaction_origin === 'automatique')) return true;
  if (moduleKey === 'stock' && createdFrom.includes('stock_purchase')) return true;
  if (moduleKey === 'cultures' && (record.derniere_recolte_id || record.last_harvest_at)) return true;

  return false;
}

export function filterAppContextBusinessEvents(events = [], moduleKey = '', record = {}) {
  if (shouldSkipAppContextBusinessEvent(record, moduleKey)) return [];
  return events;
}
