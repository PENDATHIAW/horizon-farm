/** Soin → tâche/alerte → finance → document — sans miroir IA non validé. */
export function classifyHealthRecord(record = {}) {
  const origin = String(record.origin_type || record.source_type || '').toLowerCase();
  if (origin.includes('ia') || record.is_ai_suggestion) return 'ai_suggestion';
  if (record.is_reminder || record.task_type === 'reminder') return 'health_task';
  if (record.is_alert) return 'health_alert';
  return 'health_action';
}

export function shouldCreateFinanceForHealth(record = {}) {
  return Number(record.cout ?? record.cost ?? record.montant ?? 0) > 0;
}
