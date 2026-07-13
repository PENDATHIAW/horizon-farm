/**
 * Déduplication pure des événements métier (extraite de businessEventsService
 * pour rester sans dépendance Supabase, donc testable et réutilisable par le
 * rejeu hors ligne). Idempotence : un événement de même issue_key, ou de même
 * (type, module, entité, vente liée), est considéré comme déjà présent.
 */
const arr = (v) => (Array.isArray(v) ? v : []);
const clean = (v) => String(v || '').trim();
const lower = (v) => clean(v).toLowerCase();

export function findDuplicateBusinessEvent(row = {}, events = []) {
  const issueKey = clean(row.issue_key);
  const entityId = clean(row.entity_id || row.source_record_id);
  const eventType = lower(row.event_type || '');
  const module = lower(row.module_source || row.source_module || '');

  return arr(events).find((existing) => {
    if (issueKey && clean(existing.issue_key) === issueKey) return true;
    if (
      eventType
      && module
      && entityId
      && lower(existing.event_type || '') === eventType
      && lower(existing.module_source || existing.source_module || '') === module
      && clean(existing.entity_id || existing.source_record_id) === entityId
      && clean(existing.linked_sale_id) === clean(row.linked_sale_id)
    ) {
      return true;
    }
    return false;
  }) || null;
}
