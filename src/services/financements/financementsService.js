import { buildInvestorForumProfile } from '../investorForums/investorProfileService.js';
import { buildConsolidatedCommercialKpis } from '../../utils/commercialKpiConsolidated.js';

export const FINANCEMENTS_MODULE_ID = 'financements';

export const FUNDING_OPPORTUNITY_TYPES = [
  'subvention',
  'pret',
  'concours',
  'evenement',
  'investisseur_prive',
  'programme_accompagnement',
];

export const FUNDING_OPPORTUNITY_STATUSES = [
  'identifiee',
  'a_qualifier',
  'en_preparation',
  'deposee',
  'en_instruction',
  'accordee',
  'refusee',
  'abandonnee',
];

export const FUNDING_CONTACT_STATUSES = [
  'prospect',
  'contacte',
  'en_echange',
  'dossier_envoye',
  'relance_a_faire',
  'partenaire',
  'inactif',
];

export const FUNDING_REPORT_STATUSES = ['draft', 'ready', 'published', 'archived'];

export const FUNDING_ALERT_TYPES = [
  'deadline_without_owner',
  'missing_required_document',
  'agreement_without_allocation',
  'spend_above_80',
  'report_snapshot_outdated',
  'funder_access_anomaly',
];

export const PUBLIC_FUNDER_SECTIONS = [
  'overview',
  'reports',
  'project_journal',
  'shared_documents',
];

const LEGACY_TYPE_MAP = {
  forum: 'evenement',
  salon: 'evenement',
  evenement: 'evenement',
  event: 'evenement',
  banque: 'pret',
  bank: 'pret',
  pret: 'pret',
  prêt: 'pret',
  loan: 'pret',
  subvention: 'subvention',
  grant: 'subvention',
  concours: 'concours',
  investisseur: 'investisseur_prive',
  private_investor: 'investisseur_prive',
  accompagnement: 'programme_accompagnement',
  incubateur: 'programme_accompagnement',
};

const CONTACT_STATUS_MAP = {
  en_discussion: 'en_echange',
  negociation: 'en_echange',
  accord: 'partenaire',
  refus: 'inactif',
};

const SENSITIVE_PUBLIC_KEYS = new Set([
  'raw',
  'raw_data',
  'internal',
  'internal_notes',
  'private_notes',
  'notes',
  'transactions',
  'payments',
  'clients',
  'fournisseurs',
  'supplier_price',
  'prix_fournisseur',
  'salary',
  'salaire',
  'margin_by_client',
  'stock_items',
  'audit_logs',
]);

const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value) => Number(value || 0);
const str = (value) => String(value || '').trim();
const lower = (value) => str(value).toLowerCase();
const todayIso = () => new Date().toISOString().slice(0, 10);

function rows(crud = {}, dataMap = {}, key = '', fallback = []) {
  return arr(crud?.[key]?.rows).length ? arr(crud[key].rows) : arr(dataMap?.[key]).length ? arr(dataMap[key]) : arr(fallback);
}

function dateValue(value) {
  const raw = str(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function daysUntil(value) {
  const date = dateValue(value);
  if (!date) return null;
  const today = new Date(`${todayIso()}T00:00:00`);
  const target = new Date(`${date}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function uniqById(items = []) {
  const seen = new Set();
  return arr(items).filter((item, index) => {
    const id = item?.id || `${item?.title || item?.name || 'row'}-${index}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function hashFundingSnapshot(value = {}) {
  const input = stableStringify(value);
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash &= 0xffffffff;
  }
  return `funding-${Math.abs(hash).toString(36)}`;
}

export function mapLegacyFundingOpportunityType(value = '') {
  const key = lower(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return LEGACY_TYPE_MAP[key] || (FUNDING_OPPORTUNITY_TYPES.includes(key) ? key : 'subvention');
}

export function normalizeFundingOpportunity(row = {}, index = 0) {
  const type = mapLegacyFundingOpportunityType(row.type || row.opportunity_type || row.contact_type || row.category);
  const status = FUNDING_OPPORTUNITY_STATUSES.includes(lower(row.status || row.statut))
    ? lower(row.status || row.statut)
    : 'identifiee';
  const deadline = dateValue(row.deadline || row.date_limite || row.due_date || row.event_date);
  return {
    id: row.id || `funding-opportunity-${index}`,
    title: str(row.title || row.name || row.nom || row.organization || row.institution || 'Opportunité financement'),
    institution: str(row.institution || row.organization || row.organisme || row.partner || ''),
    type,
    status,
    amount_requested: num(row.amount_requested || row.amount || row.montant || row.potential_amount),
    deadline,
    owner: str(row.owner || row.responsable || row.assigned_to || ''),
    next_action: str(row.next_action || row.prochaine_action || row.follow_up || ''),
    next_action_at: dateValue(row.next_action_at || row.follow_up_at || row.relance_at),
    eligibility: str(row.eligibility || row.criteres || ''),
    required_documents: arr(row.required_documents || row.documents_required || row.pieces_requises),
    source: row.source || row.source_module || (type === 'evenement' ? 'business_events' : FINANCEMENTS_MODULE_ID),
    event_linked: type === 'evenement',
    created_at: row.created_at || null,
  };
}

export function normalizeFundingContact(row = {}, index = 0) {
  const statusRaw = lower(row.status || row.statut);
  return {
    id: row.id || `funding-contact-${index}`,
    name: str(row.name || row.nom || row.contact_name || 'Contact financeur'),
    organization: str(row.organization || row.organisme || row.company || ''),
    role: str(row.role || row.function || row.fonction || ''),
    organization_type: mapLegacyFundingOpportunityType(row.organization_type || row.contact_type || row.type),
    country: str(row.country || row.pays || ''),
    email: str(row.email || ''),
    phone: str(row.phone || row.telephone || ''),
    status: CONTACT_STATUS_MAP[statusRaw] || (FUNDING_CONTACT_STATUSES.includes(statusRaw) ? statusRaw : 'prospect'),
    last_exchange_at: dateValue(row.last_exchange_at || row.last_contact_at || row.updated_at),
    next_follow_up_at: dateValue(row.next_follow_up_at || row.follow_up_at || row.relance_at),
    linked_opportunity_id: row.linked_opportunity_id || row.opportunity_id || null,
    consent_status: str(row.consent_status || row.consent || 'non_precise'),
    source: row.source || 'funding_contacts',
  };
}

export function normalizeFundingDocument(row = {}, index = 0) {
  const visibility = lower(row.visibility || row.publication_scope || row.access_level) || 'internal';
  const status = lower(row.status || row.statut || (row.published_at ? 'published' : 'draft'));
  return {
    id: row.id || `funding-document-${index}`,
    title: str(row.title || row.nom || row.name || row.filename || 'Document financement'),
    category: str(row.category || row.document_category || row.type || 'piece_dossier'),
    version: str(row.version || row.version_label || 'v1'),
    visibility: ['shared', 'public', 'internal', 'restricted'].includes(visibility) ? visibility : 'internal',
    status: status === 'publie' ? 'published' : status,
    published_at: row.published_at || row.publication_date || null,
    linked_application_id: row.linked_application_id || row.application_id || null,
    linked_agreement_id: row.linked_agreement_id || row.agreement_id || null,
    source: row.source || row.module_source || 'documents',
  };
}

export function normalizeFundingApplication(row = {}, index = 0) {
  const required = arr(row.required_documents || row.documents_required || row.pieces_requises);
  const ready = arr(row.ready_documents || row.documents_ready || row.pieces_pretes);
  const completion = required.length ? Math.round((ready.length / required.length) * 100) : num(row.completion_rate || row.progress || 0);
  return {
    id: row.id || `funding-application-${index}`,
    opportunity_id: row.opportunity_id || null,
    title: str(row.title || row.name || row.nom || 'Dossier financement'),
    target_institution: str(row.target_institution || row.institution || row.organization || ''),
    status: lower(row.status || row.statut) || 'draft',
    requested_amount: num(row.requested_amount || row.amount_requested || row.montant_demande),
    submitted_at: dateValue(row.submitted_at || row.date_depot),
    decision_due_at: dateValue(row.decision_due_at || row.date_decision || row.deadline),
    required_documents: required,
    ready_documents: ready,
    completion_rate: Math.min(100, Math.max(0, completion)),
    frozen_snapshot_hash: row.frozen_snapshot_hash || row.source_snapshot_hash || null,
  };
}

export function normalizeFundingAgreement(row = {}, index = 0) {
  const amountGranted = num(row.amount_granted || row.amount || row.montant || row.montant_accorde);
  const amountReceived = num(row.amount_received || row.received || row.encaisse || row.montant_recu);
  const amountSpent = num(row.amount_spent || row.spent || row.depense || row.montant_utilise);
  return {
    id: row.id || `funding-agreement-${index}`,
    title: str(row.title || row.name || row.nom || 'Convention financement'),
    funder: str(row.funder || row.financeur || row.organization || row.institution || ''),
    status: lower(row.status || row.statut) || 'signed',
    amount_granted: amountGranted,
    amount_received: amountReceived,
    amount_spent: amountSpent,
    amount_remaining: Math.max(0, amountReceived - amountSpent),
    spend_rate: amountReceived > 0 ? Math.round((amountSpent / amountReceived) * 100) : 0,
    signed_at: dateValue(row.signed_at || row.date_signature),
    reporting_due_at: dateValue(row.reporting_due_at || row.date_reporting || row.next_report_at),
    restrictions: arr(row.restrictions || row.allowed_expense_categories),
  };
}

export function normalizeExpenseAllocation(row = {}, index = 0) {
  return {
    id: row.id || `funding-allocation-${index}`,
    agreement_id: row.agreement_id || row.funding_agreement_id || null,
    transaction_id: row.transaction_id || row.finance_id || null,
    document_id: row.document_id || null,
    amount: num(row.amount || row.montant),
    category: str(row.category || row.categorie || ''),
    status: lower(row.status || row.statut) || 'allocated',
    allocated_at: dateValue(row.allocated_at || row.created_at),
  };
}

export function deriveFundingOpportunitiesFromEvents(events = []) {
  return arr(events)
    .filter((event) => {
      const text = lower(`${event.type || ''} ${event.category || ''} ${event.title || ''} ${event.description || ''}`);
      return ['financeur', 'financement', 'subvention', 'banque', 'investisseur', 'forum', 'salon'].some((token) => text.includes(token));
    })
    .map((event, index) => normalizeFundingOpportunity({
      id: `event-${event.id || index}`,
      title: event.title || event.name,
      organization: event.partner || event.organization,
      type: ['forum', 'salon'].some((token) => lower(event.title || event.type).includes(token)) ? 'evenement' : event.type,
      status: 'identifiee',
      event_date: event.date || event.event_date || event.created_at,
      source: 'business_events',
      next_action: event.next_action || '',
    }, index));
}

export function buildFundingSourceSnapshot({
  crud = {},
  dataMap = {},
  liveMeteo = null,
  salesOrders = [],
  payments = [],
  clients = [],
  deliveries = [],
  invoices = [],
  documents = [],
  stocks = [],
  transactions = [],
  businessPlans = [],
  investissements = [],
} = {}) {
  const profile = buildInvestorForumProfile({ crud, dataMap, liveMeteo });
  const ordersRows = arr(salesOrders).length ? salesOrders : rows(crud, dataMap, 'sales_orders');
  const paymentsRows = arr(payments).length ? payments : rows(crud, dataMap, 'payments');
  const clientsRows = arr(clients).length ? clients : rows(crud, dataMap, 'clients');
  const documentsRows = arr(documents).length ? documents : rows(crud, dataMap, 'documents');
  const stocksRows = arr(stocks).length ? stocks : rows(crud, dataMap, 'stock');
  const transactionsRows = arr(transactions).length ? transactions : rows(crud, dataMap, 'finances');
  const businessPlansRows = arr(businessPlans).length ? businessPlans : rows(crud, dataMap, 'business_plans');
  const investissementsRows = arr(investissements).length ? investissements : rows(crud, dataMap, 'investissements');

  const commercial = buildConsolidatedCommercialKpis({
    orders: ordersRows,
    payments: paymentsRows,
    clients: clientsRows,
    deliveries: arr(deliveries).length ? deliveries : rows(crud, dataMap, 'deliveries'),
    invoices: arr(invoices).length ? invoices : rows(crud, dataMap, 'invoices'),
  });
  const k = profile.keyFigures || {};
  const stockValue = k.valeur_stock ?? stocksRows.reduce((sum, item) => sum + num(item.valeur_totale || item.value || item.quantite) * num(item.prix_unitaire || item.unit_price || 1), 0);
  const financeIncome = transactionsRows
    .filter((row) => ['entree', 'recette', 'income'].includes(lower(row.type || row.sens)))
    .reduce((sum, row) => sum + num(row.montant || row.amount), 0);
  const financeExpense = transactionsRows
    .filter((row) => ['sortie', 'depense', 'expense'].includes(lower(row.type || row.sens)))
    .reduce((sum, row) => sum + num(row.montant || row.amount), 0);

  const snapshot = {
    module: FINANCEMENTS_MODULE_ID,
    generated_at: new Date().toISOString(),
    profile_title: profile.projectSummary?.title || 'Horizon Farm',
    public_kpis: {
      ca: commercial.ca,
      collected: commercial.collected,
      receivable: commercial.receivable,
      stock_value: stockValue,
      documents_count: documentsRows.length,
      business_plans_count: businessPlansRows.length,
      investments_amount: k.investissements ?? investissementsRows.reduce((sum, row) => sum + num(row.montant || row.amount), 0),
      bp_need: k.besoin_bp ?? 0,
      bp_year1_result: k.resultat_bp_an1 ?? null,
    },
    finance_summary: {
      income: financeIncome,
      expense: financeExpense,
      net: financeIncome - financeExpense,
      source: 'finances rows + official profile fallback',
    },
    sources: {
      commercial: 'buildConsolidatedCommercialKpis',
      finance: 'Finance rows / Hey Horizon Core snapshot',
      stock: 'stock valuation from existing stock source',
      business_plan: 'HORIZON_FARM_OFFICIAL_BP + business_plans',
      profile: 'buildInvestorForumProfile',
    },
  };
  snapshot.hash = hashFundingSnapshot(snapshot.public_kpis);
  return snapshot;
}

export function createFundingReportVersion(report = {}, sourceSnapshot = {}, options = {}) {
  const previousVersion = num(report.version || report.version_number || 0);
  const nextVersion = options.version || (previousVersion > 0 ? previousVersion + 1 : 1);
  const snapshotHash = sourceSnapshot.hash || hashFundingSnapshot(sourceSnapshot.public_kpis || sourceSnapshot);
  return Object.freeze({
    id: report.id || `funding-report-${Date.now()}`,
    title: str(report.title || 'Rapport financement'),
    period: str(report.period || 'Toutes les périodes'),
    status: report.status || 'draft',
    visibility: report.visibility || 'shared',
    version: nextVersion,
    immutable: true,
    source_snapshot_hash: snapshotHash,
    source_snapshot_generated_at: sourceSnapshot.generated_at || new Date().toISOString(),
    created_at: report.created_at || new Date().toISOString(),
    published_at: report.published_at || null,
    sections: arr(report.sections),
    public_summary: str(report.public_summary || report.summary || ''),
  });
}

export function validateFundingReportPublication(report = {}, sourceSnapshot = {}) {
  const errors = [];
  if (!report.immutable) errors.push('report_not_immutable');
  if (!report.source_snapshot_hash) errors.push('missing_source_snapshot_hash');
  const currentHash = sourceSnapshot.hash || hashFundingSnapshot(sourceSnapshot.public_kpis || sourceSnapshot);
  if (report.source_snapshot_hash && currentHash && report.source_snapshot_hash !== currentHash) {
    errors.push('snapshot_changed_since_freeze');
  }
  if (!arr(report.sections).length && !report.public_summary) errors.push('missing_public_content');
  if (!['ready', 'published'].includes(report.status)) errors.push('report_not_ready');
  return { ok: errors.length === 0, errors };
}

export function detectFundingCoherenceIssues({
  opportunities = [],
  applications = [],
  documents = [],
  agreements = [],
  expenseAllocations = [],
  reports = [],
} = {}) {
  const issues = [];
  const docs = arr(documents).map(normalizeFundingDocument);
  const agreementsRows = arr(agreements).map(normalizeFundingAgreement);
  const allocations = arr(expenseAllocations).map(normalizeExpenseAllocation);
  const applicationsRows = arr(applications).map(normalizeFundingApplication);

  arr(opportunities).map(normalizeFundingOpportunity).forEach((opp) => {
    if (opp.deadline && daysUntil(opp.deadline) <= 14 && !opp.owner) {
      issues.push({ id: `opp-owner-${opp.id}`, severity: 'haute', type: 'deadline_without_owner', message: `${opp.title}: responsable manquant avant échéance.` });
    }
    if (opp.event_linked && !opp.next_action) {
      issues.push({ id: `event-next-${opp.id}`, severity: 'moyenne', type: 'event_without_next_action', message: `${opp.title}: prochaine action à renseigner.` });
    }
  });

  applicationsRows.forEach((application) => {
    if (application.required_documents.length && application.completion_rate < 100) {
      issues.push({ id: `app-doc-${application.id}`, severity: 'haute', type: 'missing_required_document', message: `${application.title}: pièces manquantes.` });
    }
  });

  agreementsRows.forEach((agreement) => {
    const allocated = allocations.filter((row) => row.agreement_id === agreement.id).reduce((sum, row) => sum + row.amount, 0);
    if (agreement.amount_received > 0 && allocated <= 0) {
      issues.push({ id: `agreement-allocation-${agreement.id}`, severity: 'haute', type: 'agreement_without_allocation', message: `${agreement.title}: fonds reçus sans affectation.` });
    }
    if (allocated > agreement.amount_received && agreement.amount_received > 0) {
      issues.push({ id: `agreement-over-${agreement.id}`, severity: 'critique', type: 'allocation_above_received', message: `${agreement.title}: affectations supérieures aux fonds reçus.` });
    }
    if (agreement.spend_rate >= 80) {
      issues.push({ id: `agreement-80-${agreement.id}`, severity: 'moyenne', type: 'spend_above_80', message: `${agreement.title}: plus de 80% des fonds consommés.` });
    }
  });

  docs.forEach((doc) => {
    if (['shared', 'public'].includes(doc.visibility) && doc.status !== 'published') {
      issues.push({ id: `shared-doc-${doc.id}`, severity: 'moyenne', type: 'shared_document_not_published', message: `${doc.title}: document partagé non publié.` });
    }
  });

  arr(reports).forEach((report) => {
    if ((report.status === 'published' || report.status === 'publie') && !report.source_snapshot_hash) {
      issues.push({ id: `report-freeze-${report.id}`, severity: 'critique', type: 'report_snapshot_outdated', message: `${report.title || 'Rapport'}: snapshot source absent.` });
    }
  });

  return issues;
}

function buildFundingAlerts(input = {}) {
  const coherence = detectFundingCoherenceIssues(input);
  const alerts = coherence
    .filter((issue) => FUNDING_ALERT_TYPES.includes(issue.type))
    .map((issue) => ({ ...issue, title: issue.message }));
  const accessAnomalies = arr(input.accessLogs).filter((log) => lower(log.status || log.result) === 'denied' || lower(log.action).includes('write'));
  accessAnomalies.slice(0, 3).forEach((log, index) => {
    alerts.push({
      id: `funder-access-${log.id || index}`,
      severity: 'haute',
      type: 'funder_access_anomaly',
      title: `${log.funder || log.user_id || 'Accès financeur'}: action non autorisée.`,
    });
  });
  return alerts;
}

export function buildFundingCockpit({
  crud = {},
  dataMap = {},
  liveMeteo = null,
  opportunities = [],
  contacts = [],
  applications = [],
  documents = [],
  agreements = [],
  expenseAllocations = [],
  reports = [],
  accessLogs = [],
  ...sourceInput
} = {}) {
  const snapshot = buildFundingSourceSnapshot({ crud, dataMap, liveMeteo, ...sourceInput });
  const eventOpportunities = deriveFundingOpportunitiesFromEvents(sourceInput.businessEvents || rows(crud, dataMap, 'business_events'));
  const normalizedOpportunities = uniqById([...arr(opportunities), ...eventOpportunities].map(normalizeFundingOpportunity));
  const normalizedContacts = arr(contacts).map(normalizeFundingContact);
  const normalizedApplications = arr(applications).map(normalizeFundingApplication);
  const normalizedDocuments = arr(documents).map(normalizeFundingDocument);
  const normalizedAgreements = arr(agreements).map(normalizeFundingAgreement);
  const normalizedAllocations = arr(expenseAllocations).map(normalizeExpenseAllocation);
  const normalizedReports = arr(reports).map((report) => createFundingReportVersion(report, snapshot, { version: report.version || report.version_number || 1 }));
  const requestedAmount = normalizedOpportunities.reduce((sum, row) => sum + row.amount_requested, 0)
    + normalizedApplications.reduce((sum, row) => sum + row.requested_amount, 0);
  const grantedAmount = normalizedAgreements.reduce((sum, row) => sum + row.amount_granted, 0);
  const receivedAmount = normalizedAgreements.reduce((sum, row) => sum + row.amount_received, 0);
  const spentAmount = normalizedAllocations.reduce((sum, row) => sum + row.amount, 0)
    || normalizedAgreements.reduce((sum, row) => sum + row.amount_spent, 0);
  const nextDeadline = normalizedOpportunities
    .filter((row) => row.deadline)
    .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))[0] || null;
  const alerts = buildFundingAlerts({
    opportunities: normalizedOpportunities,
    applications: normalizedApplications,
    documents: normalizedDocuments,
    agreements: normalizedAgreements,
    expenseAllocations: normalizedAllocations,
    reports: normalizedReports,
    accessLogs,
  });

  return {
    module: FINANCEMENTS_MODULE_ID,
    generated_at: new Date().toISOString(),
    sourceSnapshot: snapshot,
    kpis: {
      requested_amount: requestedAmount,
      granted_amount: grantedAmount,
      received_amount: receivedAmount,
      spent_amount: spentAmount,
      remaining_amount: Math.max(0, receivedAmount - spentAmount),
      active_opportunities: normalizedOpportunities.filter((row) => !['refusee', 'abandonnee'].includes(row.status)).length,
      contacts: normalizedContacts.length,
      applications: normalizedApplications.length,
      shared_documents: normalizedDocuments.filter((row) => ['shared', 'public'].includes(row.visibility)).length,
      published_reports: normalizedReports.filter((row) => row.status === 'published').length,
    },
    opportunities: normalizedOpportunities,
    contacts: normalizedContacts,
    applications: normalizedApplications,
    documents: normalizedDocuments,
    agreements: normalizedAgreements,
    expenseAllocations: normalizedAllocations,
    reports: normalizedReports,
    accessLogs: arr(accessLogs),
    nextDeadline,
    alerts,
    coherenceIssues: detectFundingCoherenceIssues({
      opportunities: normalizedOpportunities,
      applications: normalizedApplications,
      documents: normalizedDocuments,
      agreements: normalizedAgreements,
      expenseAllocations: normalizedAllocations,
      reports: normalizedReports,
    }),
    alertTypes: FUNDING_ALERT_TYPES,
  };
}

export function canFunderAccess({ account = {}, resource = {}, action = 'read' } = {}) {
  if (action !== 'read' && action !== 'download') return false;
  if (lower(account.status || 'active') !== 'active') return false;
  if (resource.visibility && !['shared', 'public'].includes(lower(resource.visibility))) return false;
  const permissions = arr(account.permissions);
  if (!permissions.length) return true;
  return permissions.includes('*') || permissions.includes(resource.id) || permissions.includes(resource.category) || permissions.includes(resource.section);
}

export function assertFunderReadOnlyPermissions(action = 'read') {
  return ['read', 'download'].includes(lower(action));
}

export function redactFunderPayload(value) {
  if (Array.isArray(value)) return value.map(redactFunderPayload);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !SENSITIVE_PUBLIC_KEYS.has(lower(key)))
      .map(([key, entry]) => [key, redactFunderPayload(entry)]));
  }
  return value;
}

export function buildFundingPublicSpace({
  cockpit = {},
  account = { status: 'active', permissions: ['*'] },
  reports = cockpit.reports || [],
  journalEntries = [],
  documents = cockpit.documents || [],
  demoMode = false,
} = {}) {
  const base = demoMode ? buildFundingCockpit(createFundingDemoDataset()) : cockpit;
  const sourceReports = demoMode ? base.reports : reports;
  const sourceDocuments = demoMode ? base.documents : documents;
  const publicReports = arr(sourceReports)
    .filter((report) => ['published', 'publie'].includes(lower(report.status)) && canFunderAccess({ account, resource: { ...report, section: 'reports' } }))
    .map(redactFunderPayload);
  const sharedDocuments = arr(sourceDocuments)
    .map(normalizeFundingDocument)
    .filter((doc) => ['shared', 'public'].includes(doc.visibility) && doc.status === 'published' && canFunderAccess({ account, resource: { ...doc, section: 'shared_documents' } }))
    .map(redactFunderPayload);
  const journal = arr(journalEntries)
    .filter((entry) => entry.published === true || lower(entry.status) === 'published')
    .filter((entry) => canFunderAccess({ account, resource: { ...entry, visibility: 'shared', section: 'project_journal' } }))
    .map(redactFunderPayload);

  return {
    module: FINANCEMENTS_MODULE_ID,
    readOnly: true,
    demoMode,
    sections: PUBLIC_FUNDER_SECTIONS,
    overview: redactFunderPayload({
      project: base.sourceSnapshot?.profile_title || 'Horizon Farm',
      public_kpis: base.sourceSnapshot?.public_kpis || {},
      generated_at: base.sourceSnapshot?.generated_at || new Date().toISOString(),
    }),
    reports: publicReports,
    project_journal: journal,
    shared_documents: sharedDocuments,
  };
}

export function createFundingDemoDataset() {
  const snapshotDate = new Date().toISOString();
  return {
    opportunities: [
      { id: 'demo-subvention', title: 'Programme exemple subvention agricole', institution: 'Organisme exemple', type: 'subvention', status: 'en_preparation', amount_requested: 18000000, deadline: todayIso(), owner: 'Equipe projet', next_action: 'Finaliser budget et annexes' },
      { id: 'demo-event', title: 'Rencontre financeurs exemple', institution: 'Réseau partenaire exemple', type: 'evenement', status: 'identifiee', owner: 'Equipe projet', next_action: 'Préparer note projet' },
    ],
    contacts: [
      { id: 'demo-contact', name: 'Contact exemple', organization: 'Fonds exemple', organization_type: 'subvention', status: 'contacte', next_follow_up_at: todayIso() },
    ],
    applications: [
      { id: 'demo-application', title: 'Dossier exemple 2026', target_institution: 'Fonds exemple', requested_amount: 18000000, status: 'ready', required_documents: ['BP', 'Budget', 'Identite'], ready_documents: ['BP', 'Budget', 'Identite'] },
    ],
    documents: [
      { id: 'demo-doc', title: 'Budget simplifie exemple', category: 'budget', visibility: 'shared', status: 'published', published_at: snapshotDate },
    ],
    agreements: [
      { id: 'demo-agreement', title: 'Convention exemple', funder: 'Fonds exemple', amount_granted: 12000000, amount_received: 9000000, amount_spent: 6400000, status: 'signed' },
    ],
    expenseAllocations: [
      { id: 'demo-allocation', agreement_id: 'demo-agreement', amount: 6400000, category: 'equipement', status: 'allocated' },
    ],
    reports: [
      { id: 'demo-report', title: 'Rapport financeur exemple', status: 'published', visibility: 'shared', version: 1, immutable: true, source_snapshot_hash: 'demo-hash', sections: ['Avancement', 'Indicateurs'] },
    ],
    accessLogs: [],
  };
}

export default buildFundingCockpit;
