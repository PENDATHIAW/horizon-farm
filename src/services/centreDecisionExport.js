import * as XLSX from 'xlsx';
import { buildActionQueue } from '../modules/vision/visionPriorityQueue.js';

const today = () => new Date().toISOString().slice(0, 10);

function sheetRows(headers, rows = []) {
  return [headers, ...rows.map((row) => headers.map((key) => row?.[key] ?? ''))];
}

function addSheet(workbook, name, headers, rows, widths = []) {
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows(headers, rows));
  if (widths.length) worksheet['!cols'] = widths.map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(workbook, worksheet, name.slice(0, 31));
}

function priorityRows(priorities = []) {
  const { today: queue } = buildActionQueue(priorities, { includeDismissed: true });
  return queue.map((item) => ({
    Sujet: item.title,
    'Que faire': item.whatToDo || item.detail,
    Priorité: item.priorityLabel,
    Module: item.sourceLabel,
    Destination: item.targetTab || 'Urgences & risques',
    Type: item.kind || '—',
  }));
}

function recommendationRows(plan = {}) {
  const commercial = (plan.commercialRecommendations || []).map((item) => ({
    Type: 'Commercial',
    Titre: item.title,
    Recommandation: item.recommendation || item.timing,
    Priorité: item.priority,
    'Écart CA': item.gap_revenue ?? '',
  }));
  const investment = (plan.recommendations || [])
    .filter((r) => r.should_recommend_investment || r.technical_rule || r.strategic)
    .map((item) => ({
      Type: item.technical_rule ? 'Terrain' : 'Investissement',
      Titre: item.title,
      Recommandation: item.recommendation || item.timing,
      Priorité: item.priority,
      Couverture: item.coverage_rate != null ? `${item.coverage_rate}%` : '',
    }));
  return [...commercial, ...investment];
}

function cycleRows(strategicPlan = {}) {
  const launch = (strategicPlan.launch?.cycleDecisions || []).map((item) => ({
    Type: 'Lancement',
    Sujet: item.eventLabel || item.title || item.status,
    Message: item.message || item.recommendation,
    Priorité: item.priority,
    'Date pivot': item.pivotDate || item.eventDate || '',
  }));
  const sanitary = (strategicPlan.sanitary || []).map((item) => ({
    Type: 'Vide sanitaire',
    Sujet: item.building || item.title,
    Message: item.message,
    Priorité: item.priority,
    Bloquant: item.blocking ? 'Oui' : 'Non',
  }));
  return [...launch, ...sanitary];
}

function riskRows(data = {}, strategicPlan = {}) {
  const operational = (data.risks || []).slice(0, 30).map((risk) => ({
    Type: 'Opérationnel',
    Sujet: risk.title,
    Cause: risk.cause,
    Impact: risk.impact,
    Action: risk.action,
    Sévérité: risk.severity,
  }));
  const sellNow = (strategicPlan.sellNow || []).map((item) => ({
    Type: 'Vente urgente',
    Sujet: item.status || item.title,
    Message: item.message,
    Priorité: item.priority,
    'Gain/j': item.gainValeurJour ?? '',
  }));
  return [...sellNow, ...operational];
}

const TAB_EXPORT_MAP = {
  'Urgences & risques': 'risks',
  'Croissance & opportunités': 'recommendations',
  'Saisons & marchés': 'cycles',
  'À traiter': 'priorities',
  Recommandations: 'recommendations',
  Cycles: 'cycles',
  Risques: 'risks',
};

export function buildCentreExportWorkbook({ data = {}, decisionPlan = {}, strategicPlan = {} } = {}) {
  const workbook = XLSX.utils.book_new();
  addSheet(
    workbook,
    'A traiter',
    ['Sujet', 'Que faire', 'Priorité', 'Module', 'Destination', 'Type'],
    priorityRows(data.priorities || []),
    [28, 42, 14, 18, 16, 12],
  );
  addSheet(
    workbook,
    'Recommandations',
    ['Type', 'Titre', 'Recommandation', 'Priorité', 'Écart CA / Couverture'],
    recommendationRows(decisionPlan),
    [16, 28, 48, 12, 16],
  );
  addSheet(
    workbook,
    'Cycles',
    ['Type', 'Sujet', 'Message', 'Priorité', 'Date pivot'],
    cycleRows(strategicPlan),
    [16, 24, 48, 12, 14],
  );
  addSheet(
    workbook,
    'Risques',
    ['Type', 'Sujet', 'Cause / Message', 'Impact', 'Action', 'Sévérité'],
    riskRows(data, strategicPlan).map((row) => ({
      Type: row.Type,
      Sujet: row.Sujet,
      'Cause / Message': row.Cause || row.Message,
      Impact: row.Impact || '',
      Action: row.Action || '',
      Sévérité: row.Sévérité || row.Priorité || '',
    })),
    [16, 28, 36, 24, 24, 12],
  );
  addSheet(
    workbook,
    'Synthese',
    ['Indicateur', 'Valeur'],
    [
      { Indicateur: 'Santé ERP', Valeur: `${data.healthScore ?? data.globalScore ?? '—'}/100` },
      { Indicateur: 'File du jour', Valeur: buildActionQueue(data.priorities || [], { includeDismissed: true }).today.length },
      { Indicateur: 'Urgences vente', Valeur: strategicPlan.sellNow?.length || 0 },
      { Indicateur: 'ITH', Valeur: strategicPlan.ith ?? '—' },
      { Indicateur: 'BFR bloqué', Valeur: strategicPlan.bfr?.blocked ? 'Oui' : 'Non' },
      { Indicateur: 'Date export', Valeur: today() },
    ],
    [28, 24],
  );
  return workbook;
}

export function exportCentreDecisionExcel(payload = {}, fileName) {
  const workbook = buildCentreExportWorkbook(payload);
  XLSX.writeFile(workbook, fileName || `centre-decisionnel-${today()}.xlsx`);
}

export function exportCentreDecisionCsv(payload = {}, activeTab = 'Urgences & risques') {
  const key = TAB_EXPORT_MAP[activeTab] || 'priorities';
  const rows = key === 'priorities'
    ? priorityRows(payload.data?.priorities || [])
    : key === 'recommendations'
      ? recommendationRows(payload.decisionPlan || {})
      : key === 'cycles'
        ? cycleRows(payload.strategicPlan || {})
        : riskRows(payload.data || {}, payload.strategicPlan || {});

  const headers = Object.keys(rows[0] || { Sujet: '', Message: '' });
  const lines = [headers.join(';')];
  rows.forEach((row) => {
    lines.push(headers.map((header) => `"${String(row[header] ?? '').replaceAll('"', '""')}"`).join(';'));
  });
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `centre-${key}-${today()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default exportCentreDecisionExcel;
