import { makeId } from './ids';

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const clean = (value = '') => String(value || '').trim();
const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value = 0) => Number(value || 0) || 0;

const paidStatuses = ['paye', 'payee', 'payé', 'payée', 'encaisse', 'encaissé', 'paid'];
const openStatuses = ['nouvelle', 'nouveau', 'ouverte', 'open', 'a_faire', 'en_cours'];

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

export function buildMonthlyFinancierReportWorkflow({
  dataMap = {},
  existing = null,
  period = today().slice(0, 7),
  humanValidated = false,
  validator = '',
  date = today(),
} = {}) {
  const salesOrders = arr(dataMap.sales_orders || dataMap.salesOrders || dataMap.ventes);
  const transactions = arr(dataMap.finances || dataMap.transactions || dataMap.financeTransactions);
  const stocks = arr(dataMap.stocks || dataMap.stock);
  const alerts = arr(dataMap.alertes || dataMap.alerts);
  const tasks = arr(dataMap.taches || dataMap.tasks);
  const documents = arr(dataMap.documents);
  const events = arr(dataMap.business_events || dataMap.businessEvents);
  const bpLines = arr(dataMap.bp_investment_lines || dataMap.bpInvestmentLines);
  const bpCosts = arr(dataMap.bp_recurring_costs || dataMap.bpRecurringCosts);
  const cultures = arr(dataMap.cultures);
  const lots = arr(dataMap.lots || dataMap.avicole);
  const animals = arr(dataMap.animaux || dataMap.animals);

  const salesTotal = salesOrders.reduce((sum, row) => sum + n(row.montant_total ?? row.total ?? row.amount), 0);
  const paidTotal = transactions
    .filter((row) => {
      const type = String(row.type || row.transaction_type || '');
      if (type.includes('entree')) return true;
      return !type && paidStatuses.includes(clean(row.statut || row.status).toLowerCase());
    })
    .reduce((sum, row) => sum + n(row.montant ?? row.amount), 0);
  const expenses = transactions
    .filter((row) => String(row.type || row.transaction_type || '').includes('sortie'))
    .reduce((sum, row) => sum + n(row.montant ?? row.amount), 0);
  const receivables = salesOrders.reduce((sum, row) => sum + n(row.reste_a_payer ?? row.remaining ?? row.balance_due), 0);
  const stockValue = stocks.reduce((sum, row) => sum + n(row.quantite ?? row.quantity) * n(row.prix_unitaire ?? row.prixUnit ?? row.unit_price), 0);
  const margin = salesOrders.reduce((sum, row) => sum + n(row.marge ?? row.margin ?? row.margin_estimated), 0);
  const fundingUsed = [...bpLines, ...bpCosts].reduce((sum, row) => sum + n(row.montant_reel ?? row.montant_paye ?? 0), 0);
  const missingProofs = documents.filter((doc) => clean(doc.status || doc.verification_status).toLowerCase().includes('manquant'));
  const criticalAlerts = alerts.filter((alert) => ['critique', 'haute', 'critical'].includes(clean(alert.severity || alert.priority).toLowerCase()));
  const openTasks = tasks.filter((task) => openStatuses.includes(clean(task.status || task.statut).toLowerCase()));
  const missingData = [
    salesOrders.length ? '' : 'ventes',
    transactions.length ? '' : 'finances',
    stocks.length ? '' : 'stock',
    documents.length ? '' : 'preuves/documents',
    bpLines.length || bpCosts.length ? '' : 'budget/financement',
  ].filter(Boolean);
  const reportId = existing?.id || makeId('RPT');
  const documentId = makeId('DOC');
  const status = humanValidated && missingData.length === 0 ? 'valide' : 'brouillon';
  const summary = [
    `CA ${salesTotal} FCFA`,
    `encaissements ${paidTotal} FCFA`,
    `créances ${receivables} FCFA`,
    `dépenses ${expenses} FCFA`,
    `marge ${margin} FCFA`,
    `stock ${stockValue} FCFA`,
    `financement utilisé ${fundingUsed} FCFA`,
    `${criticalAlerts.length} alerte(s) critique(s)`,
    `${missingProofs.length} preuve(s) manquante(s)`,
  ].join(' · ');

  return {
    reportId,
    documentId,
    reportPayload: {
      id: reportId,
      title: `Rapport financeur mensuel ${period}`,
      report_type: 'mensuel_financeur',
      period,
      status,
      statut: status,
      validation_status: humanValidated ? 'valide_humainement' : 'a_valider',
      validated_by: humanValidated ? validator : '',
      validated_at: humanValidated ? now() : '',
      generated_at: now(),
      channel: 'PDF',
      report_key: reportKey('mensuel_financeur', period),
      summary,
      activity_by_filiere: {
        avicole: lots.length,
        animaux: animals.length,
        cultures: cultures.length,
      },
      sales_total: salesTotal,
      paid_total: paidTotal,
      receivables_total: receivables,
      expenses_total: expenses,
      margin_estimated: margin,
      stock_value: stockValue,
      alert_count: alerts.length,
      critical_alerts_count: criticalAlerts.length,
      open_tasks_count: openTasks.length,
      decisions_count: events.length,
      funding_used: fundingUsed,
      proof_missing_count: missingProofs.length,
      missing_data: missingData,
      forecast_vs_real_gap: {
        bp_lines_count: bpLines.length,
        bp_costs_count: bpCosts.length,
        used_amount: fundingUsed,
      },
    },
    document: {
      id: documentId,
      title: `Rapport financeur mensuel ${period}`,
      document_category: 'rapport_financeur',
      module_source: 'rapports',
      entity_type: 'rapport',
      entity_id: reportId,
      related_id: reportId,
      content: summary,
      status,
      generated_at: now(),
      verification_status: humanValidated ? 'valide' : 'a_valider',
    },
    validationTask: humanValidated ? null : {
      id: makeId('TSK'),
      title: `Valider rapport financeur ${period}`,
      module_lie: 'rapports',
      source_module: 'rapports',
      source_record_id: reportId,
      related_id: reportId,
      task_dedupe_key: `report-validation:${period}`,
      due_date: date,
      priority: missingData.length ? 'haute' : 'moyenne',
      status: 'a_faire',
      checklist: 'Contrôler chiffres; Vérifier preuves; Valider humainement; Envoyer financeur',
      notes: missingData.length ? `Données manquantes: ${missingData.join(', ')}` : 'Confirmation requise.',
    },
    auditLog: {
      id: makeId('LOG'),
      actor: validator || 'system',
      action: humanValidated ? 'validate_financier_report' : 'generate_financier_report_draft',
      module: 'rapports',
      record_id: reportId,
      created_at: now(),
    },
    event: {
      id: makeId('EVT'),
      event_type: 'monthly_financier_report',
      type_evenement: 'monthly_financier_report',
      module_source: 'rapports',
      entity_type: 'rapport',
      entity_id: reportId,
      title: `Rapport financeur ${period}`,
      description: summary,
      event_date: date,
      severity: missingData.length || missingProofs.length ? 'warning' : 'info',
      linked_document_id: documentId,
      amount: salesTotal,
      saisies_evitees: 10,
    },
  };
}
