import { makeId } from './ids.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const amount = (value) => Number(value || 0) || 0;
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();
const now = () => new Date().toISOString();

export const REPORT_STATES = Object.freeze({
  PREVIEW: 'apercu',
  VALIDATED: 'valide',
  FROZEN: 'gele',
  PUBLISHED: 'publie',
});

const validatedSaleStatuses = new Set(['valide', 'validee', 'validated', 'confirme', 'confirmee', 'confirmed', 'livre', 'livree', 'delivered', 'termine', 'terminee', 'completed', 'paye', 'payee', 'paid']);
const paidStatuses = new Set(['paye', 'payee', 'paid', 'encaisse', 'encaissee', 'received']);

function normalizedStatus(row = {}) {
  return lower(row.status || row.statut || row.validation_status).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isValidatedSale(row = {}) {
  return validatedSaleStatuses.has(normalizedStatus(row));
}

function stableFingerprint(value) {
  const input = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `src-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function isImmutableReport(report = {}) {
  return [REPORT_STATES.FROZEN, REPORT_STATES.PUBLISHED].includes(normalizedStatus(report)) || Boolean(report.frozen_at);
}

export function collectReportSnapshot(dataMap = {}) {
  const sales = arr(dataMap.sales_orders || dataMap.salesOrders).filter(isValidatedSale);
  const payments = arr(dataMap.payments).filter((row) => paidStatuses.has(normalizedStatus(row)) || !clean(row.status || row.statut));
  const transactions = arr(dataMap.finances || dataMap.transactions);
  const stocks = arr(dataMap.stock || dataMap.stocks);
  const tasks = arr(dataMap.taches || dataMap.tasks);
  const alerts = arr(dataMap.alertes_center || dataMap.alertes || dataMap.alerts);
  const documents = arr(dataMap.documents);

  const snapshot = {
    validated_sales_count: sales.length,
    revenue: sales.reduce((sum, row) => sum + amount(row.montant_total ?? row.total ?? row.amount), 0),
    receipts: payments.reduce((sum, row) => sum + amount(row.montant ?? row.amount), 0),
    expenses: transactions
      .filter((row) => /sortie|depense|charge|expense/.test(lower(row.type || row.transaction_type || row.categorie)))
      .reduce((sum, row) => sum + amount(row.montant ?? row.amount), 0),
    stock_items: stocks.length,
    open_tasks: tasks.filter((row) => !/termine|done|closed|annule/.test(normalizedStatus(row))).length,
    open_alerts: alerts.filter((row) => !/resolu|traite|closed|ignore/.test(normalizedStatus(row))).length,
    proof_documents: documents.filter((row) => /preuve|facture|recu|justificatif/.test(lower(`${row.document_category || ''} ${row.type || ''} ${row.title || ''}`))).length,
  };

  return Object.freeze({ ...snapshot, source_digest: stableFingerprint(snapshot) });
}

export function buildReportPreview({ reports = [], dataMap = {}, reportType = 'mensuel_exploitation', period = new Date().toISOString().slice(0, 7), generatedAt = now(), correctionOf = null } = {}) {
  const family = arr(reports).filter((row) => clean(row.report_type) === reportType && clean(row.period) === period);
  const nextVersion = Math.max(0, ...family.map((row) => amount(row.version_number))) + 1;
  const root = correctionOf?.root_report_id || correctionOf?.id || family.find((row) => row.root_report_id)?.root_report_id || '';
  const snapshot = collectReportSnapshot(dataMap);
  const id = makeId('RPT');

  return {
    id,
    title: `Rapport d’exploitation ${period} · version ${nextVersion}`,
    report_type: reportType,
    period,
    status: REPORT_STATES.PREVIEW,
    version_number: nextVersion,
    root_report_id: root || id,
    parent_report_id: correctionOf?.id || '',
    generated_at: generatedAt,
    previewed_at: generatedAt,
    source_snapshot: snapshot,
    source_digest: snapshot.source_digest,
    summary: `CA validé ${snapshot.revenue} FCFA · encaissements ${snapshot.receipts} FCFA · dépenses ${snapshot.expenses} FCFA`,
    immutable: false,
  };
}

export function transitionReport(report = {}, action = '', { actor = '', channel = '', timestamp = now(), reports = [], dataMap = {} } = {}) {
  const status = normalizedStatus(report);
  if (!report.id) return { ok: false, error: 'Rapport introuvable.' };

  if (action === 'validate') {
    if (status !== REPORT_STATES.PREVIEW) return { ok: false, error: 'Seul un aperçu peut être validé.' };
    if (!clean(actor)) return { ok: false, error: 'Responsable de validation obligatoire.' };
    return { ok: true, mode: 'update', patch: { status: REPORT_STATES.VALIDATED, validated_by: clean(actor), validated_at: timestamp } };
  }

  if (action === 'freeze') {
    if (status !== REPORT_STATES.VALIDATED || !report.validated_at) return { ok: false, error: 'Validation requise avant le gel.' };
    return { ok: true, mode: 'update', patch: { status: REPORT_STATES.FROZEN, frozen_at: timestamp, immutable: true } };
  }

  if (action === 'publish') {
    if (status !== REPORT_STATES.FROZEN || !report.frozen_at) return { ok: false, error: 'Le rapport doit être gelé avant publication.' };
    if (!clean(channel)) return { ok: false, error: 'Canal de publication obligatoire.' };
    return { ok: true, mode: 'update', patch: { status: REPORT_STATES.PUBLISHED, publication_channel: clean(channel), published_at: timestamp, immutable: true } };
  }

  if (action === 'correct') {
    if (!isImmutableReport(report)) return { ok: false, error: 'La correction versionnée concerne un rapport gelé ou publié.' };
    return { ok: true, mode: 'create', record: buildReportPreview({ reports, dataMap, reportType: report.report_type, period: report.period, generatedAt: timestamp, correctionOf: report }) };
  }

  return { ok: false, error: 'Transition de rapport inconnue.' };
}
