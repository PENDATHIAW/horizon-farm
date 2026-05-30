import { makeId } from './ids';

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const clean = (value = '') => String(value || '').trim();

export const reportKey = (type, period) => `auto_report:${type}:${period}`;
export const reportTitle = (type, period) => type === 'mensuel_erp' ? `Rapport mensuel ${period}` : type === 'hebdo_erp' ? `Rapport hebdo ${period}` : `Rapport ${period}`;

export function reportDraftContent(existing = {}, content = {}) {
  return clean(existing.draft_content || existing.brouillon_modifie || existing.edited_summary || existing.summary) || content.summary || '';
}

export function buildReportGenerationWorkflow({ existing = null, type = 'mensuel_erp', period = today(), content = {}, date = today() } = {}) {
  const reportId = existing?.id || makeId('RPT');
  const docId = makeId('DOC');
  const body = reportDraftContent(existing || {}, content);
  const title = reportTitle(type, period);
  return {
    reportId,
    documentId: docId,
    reportPayload: {
      id: reportId,
      title,
      report_type: type,
      period,
      status: 'genere',
      channel: 'PDF',
      report_key: reportKey(type, period),
      generated_at: now(),
      summary: body,
      draft_content: body,
      sales_total: content.sales || 0,
      paid_total: content.paid || 0,
      receivables_total: content.receivables || 0,
      stock_value: content.stockValue || 0,
      stock_critical_count: content.stockCritical || 0,
      margin_estimated: content.margin || 0,
      open_tasks_count: content.tasks || 0,
      critical_alerts_count: content.critical || 0,
      recommendations: Array.isArray(content.recommendations) ? content.recommendations.join('\n') : clean(content.recommendations),
    },
    document: {
      id: docId,
      title,
      document_category: 'rapport',
      module_source: 'rapports',
      entity_type: 'rapport',
      entity_id: reportId,
      related_id: reportId,
      content: body,
      status: 'genere',
      generated_at: now(),
    },
    event: {
      id: makeId('EVT'),
      event_type: existing?.id ? 'rapport_mis_a_jour' : 'rapport_genere',
      module_source: 'rapports',
      entity_type: 'rapport',
      entity_id: reportId,
      title,
      description: `${content.sales || 0} FCFA ventes · ${content.margin || 0} FCFA marge`,
      event_date: date,
      severity: 'info',
      linked_document_id: docId,
      saisies_evitees: 6,
    },
  };
}

export function buildReportScheduleTask({ report = {}, type = 'mensuel_erp', period = today(), dueDate = today() } = {}) {
  const key = `report-schedule:${report.id || type}:${period}`;
  return {
    id: makeId('TSK'),
    title: `Préparer ${report.title || reportTitle(type, period)}`,
    module_lie: 'rapports',
    source_module: 'rapports',
    source_record_id: report.id || '',
    related_id: report.id || '',
    task_dedupe_key: key,
    due_date: dueDate,
    priority: 'moyenne',
    status: 'a_faire',
    checklist: 'Vérifier chiffres; Relire brouillon; Générer PDF; Joindre aux documents',
    notes: `Rapport programmé pour ${period}.`,
  };
}
