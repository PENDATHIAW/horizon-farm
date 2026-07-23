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
  'overdue_deadline',
  'deadline_without_owner',
  'missing_required_document',
  'agreement_without_allocation',
  'allocation_above_received',
  'spend_above_80',
  'report_snapshot_outdated',
  'shared_document_not_published',
  'funder_access_anomaly',
  'event_without_next_action',
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

export function fundingDaysUntil(value, now = new Date()) {
  const date = dateValue(value);
  if (!date) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
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
    owner: str(row.owner_label || row.owner || row.responsable || row.assigned_to || ''),
    owner_label: str(row.owner_label || row.owner || row.responsable || row.assigned_to || ''),
    next_action: str(row.next_action || row.prochaine_action || row.follow_up || ''),
    next_action_at: dateValue(row.next_action_at || row.follow_up_at || row.relance_at),
    eligibility: str(row.eligibility || row.criteres || ''),
    required_documents: arr(row.required_documents || row.documents_required || row.pieces_requises),
    source: row.source || row.source_module || (type === 'evenement' ? 'business_events' : FINANCEMENTS_MODULE_ID),
    event_linked: type === 'evenement',
    created_at: row.created_at || null,
    farm_id: row.farm_id || null,
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
    farm_id: row.farm_id || null,
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
    file_url: row.file_url || row.url || null,
    erp_document_id: row.erp_document_id || null,
    linked_application_id: row.linked_application_id || row.application_id || null,
    linked_agreement_id: row.linked_agreement_id || row.agreement_id || null,
    application_id: row.application_id || row.linked_application_id || null,
    agreement_id: row.agreement_id || row.linked_agreement_id || null,
    source: row.source || row.module_source || 'documents',
    farm_id: row.farm_id || null,
  };
}

export function normalizeFundingApplication(row = {}, index = 0) {
  const required = arr(row.required_documents || row.documents_required || row.pieces_requises);
  const ready = arr(row.ready_documents || row.documents_ready || row.pieces_pretes);
  const readyKeys = new Set(ready.map(lower));
  const completedRequired = required.filter((document) => readyKeys.has(lower(document))).length;
  const completion = required.length
    ? Math.round((completedRequired / required.length) * 100)
    : num(row.completion_rate || row.progress || 0);
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
    farm_id: row.farm_id || null,
  };
}

export function normalizeFundingAgreement(row = {}, index = 0) {
  const amountGranted = num(row.amount_granted || row.amount || row.montant || row.montant_accorde);
  const amountReceived = num(row.amount_received || row.received || row.encaisse || row.montant_recu);
  const amountSpent = num(row.amount_spent || row.spent || row.depense || row.montant_utilise);
  return {
    id: row.id || `funding-agreement-${index}`,
    application_id: row.application_id || null,
    title: str(row.title || row.name || row.nom || 'Convention financement'),
    funder: str(row.funder || row.financeur || row.organization || row.institution || ''),
    status: lower(row.status || row.statut) || 'signed',
    amount_granted: amountGranted,
    amount_received: amountReceived,
    amount_spent: amountSpent,
    amount_remaining: amountReceived - amountSpent,
    spend_rate: amountReceived > 0 ? Math.round((amountSpent / amountReceived) * 100) : 0,
    signed_at: dateValue(row.signed_at || row.date_signature),
    reporting_due_at: dateValue(row.reporting_due_at || row.date_reporting || row.next_report_at),
    restrictions: arr(row.restrictions || row.allowed_expense_categories),
    farm_id: row.farm_id || null,
  };
}

export function normalizeExpenseAllocation(row = {}, index = 0) {
  return {
    id: row.id || `funding-allocation-${index}`,
    agreement_id: row.agreement_id || row.funding_agreement_id || null,
    transaction_id: row.transaction_id || row.finance_transaction_id || row.finance_id || null,
    document_id: row.document_id || null,
    amount: num(row.amount || row.montant),
    category: str(row.category || row.categorie || ''),
    status: lower(row.status || row.statut) || 'allocated',
    allocated_at: dateValue(row.allocated_at || row.created_at),
    farm_id: row.farm_id || null,
  };
}

export function normalizeFundingReport(row = {}, index = 0) {
  const rawStatus = lower(row.status || row.statut) || 'draft';
  const status = rawStatus === 'publie' ? 'published' : rawStatus;
  const visibility = lower(row.visibility || row.publication_scope || row.access_level) || 'internal';
  return {
    id: row.id || `funding-report-${index}`,
    title: str(row.title || row.name || row.nom || 'Rapport financement'),
    period: str(row.period || row.period_label || 'Toutes les périodes'),
    status: FUNDING_REPORT_STATUSES.includes(status) ? status : 'draft',
    visibility: ['internal', 'restricted', 'shared', 'public'].includes(visibility) ? visibility : 'internal',
    version: Math.max(1, num(row.version || row.version_number || 1)),
    immutable: row.immutable === true,
    source_snapshot_hash: row.source_snapshot_hash || null,
    source_snapshot_generated_at: row.source_snapshot_generated_at || null,
    created_at: row.created_at || null,
    published_at: row.published_at || null,
    sections: arr(row.sections),
    public_summary: str(row.public_summary || row.summary || ''),
    file_url: row.file_url || row.download_url || null,
    farm_id: row.farm_id || null,
  };
}

export function deriveFundingOpportunitiesFromEvents(events = []) {
  return arr(events)
    .filter((event) => {
      const text = lower(`${event.type || ''} ${event.category || ''} ${event.title || ''} ${event.description || ''}`);
      const eventDate = event.date || event.event_date || event.start_date || null;
      const isCurrent = !eventDate || fundingDaysUntil(eventDate) >= 0;
      return isCurrent && ['financeur', 'financement', 'subvention', 'banque', 'investisseur', 'forum', 'salon'].some((token) => text.includes(token));
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
  salesOrders,
  payments,
  clients,
  deliveries,
  invoices,
  documents,
  stocks,
  transactions,
  businessPlans,
  investissements,
} = {}) {
  const profile = buildInvestorForumProfile({ crud, dataMap, liveMeteo });
  const sourceRows = (explicit, key) => (Array.isArray(explicit) ? explicit : rows(crud, dataMap, key));
  const ordersRows = sourceRows(salesOrders, 'sales_orders');
  const paymentsRows = sourceRows(payments, 'payments');
  const clientsRows = sourceRows(clients, 'clients');
  const deliveriesRows = sourceRows(deliveries, 'deliveries');
  const invoicesRows = sourceRows(invoices, 'invoices');
  const documentsRows = sourceRows(documents, 'documents');
  const stocksRows = sourceRows(stocks, 'stock');
  const transactionsRows = sourceRows(transactions, 'finances');
  const businessPlansRows = sourceRows(businessPlans, 'business_plans');
  const investissementsRows = sourceRows(investissements, 'investissements');

  const commercial = buildConsolidatedCommercialKpis({
    orders: ordersRows,
    payments: paymentsRows,
    clients: clientsRows,
    deliveries: deliveriesRows,
    invoices: invoicesRows,
  });
  const k = profile.keyFigures || {};
  const directStockValue = stocksRows.reduce((sum, item) => {
    const explicitTotal = num(item.valeur_totale ?? item.total_value ?? item.value);
    if (explicitTotal > 0) return sum + explicitTotal;
    return sum + (num(item.quantite ?? item.quantity) * num(item.prix_unitaire ?? item.unit_price));
  }, 0);
  const stockValue = num(k.valeur_stock) > 0 ? num(k.valeur_stock) : directStockValue;
  const financeIncome = transactionsRows
    .filter((row) => ['entree', 'recette', 'income'].includes(lower(row.type || row.sens)))
    .reduce((sum, row) => sum + num(row.montant || row.amount), 0);
  const financeExpense = transactionsRows
    .filter((row) => ['sortie', 'depense', 'dépense', 'expense', 'debit', 'débit'].includes(lower(row.type || row.sens)))
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
      investments_amount: num(k.investissements) > 0
        ? num(k.investissements)
        : investissementsRows.reduce((sum, row) => sum + num(row.montant || row.amount), 0),
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
  snapshot.hash = hashFundingSnapshot({
    public_kpis: snapshot.public_kpis,
    finance_summary: snapshot.finance_summary,
  });
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
    status: FUNDING_REPORT_STATUSES.includes(lower(report.status)) ? lower(report.status) : 'draft',
    visibility: ['internal', 'restricted', 'shared', 'public'].includes(lower(report.visibility)) ? lower(report.visibility) : 'internal',
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
  if (!['shared', 'public'].includes(report.visibility)) errors.push('report_not_shared');
  return { ok: errors.length === 0, errors };
}

export function detectFundingCoherenceIssues({
  opportunities = [],
  applications = [],
  documents = [],
  agreements = [],
  expenseAllocations = [],
  reports = [],
  sourceSnapshot = null,
} = {}) {
  const issues = [];
  const docs = arr(documents).map(normalizeFundingDocument);
  const agreementsRows = arr(agreements).map(normalizeFundingAgreement);
  const allocations = arr(expenseAllocations).map(normalizeExpenseAllocation);
  const applicationsRows = arr(applications).map(normalizeFundingApplication);

  arr(opportunities).map(normalizeFundingOpportunity).forEach((opp) => {
    const remainingDays = fundingDaysUntil(opp.deadline);
    const active = !['accordee', 'refusee', 'abandonnee'].includes(opp.status);
    if (active && remainingDays != null && remainingDays < 0) {
      issues.push({ id: `opp-overdue-${opp.id}`, severity: 'haute', type: 'overdue_deadline', message: `${opp.title}: échéance dépassée.` });
    }
    if (active && remainingDays != null && remainingDays >= 0 && remainingDays <= 14 && !opp.owner) {
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

  arr(reports).map(normalizeFundingReport).forEach((report) => {
    if ((report.status === 'published' || report.status === 'publie') && !report.source_snapshot_hash) {
      issues.push({ id: `report-freeze-${report.id}`, severity: 'critique', type: 'report_snapshot_outdated', message: `${report.title || 'Rapport'}: snapshot source absent.` });
    }
    if (
      report.status === 'ready'
      && report.source_snapshot_hash
      && sourceSnapshot?.hash
      && report.source_snapshot_hash !== sourceSnapshot.hash
    ) {
      issues.push({ id: `report-stale-${report.id}`, severity: 'haute', type: 'report_snapshot_outdated', message: `${report.title || 'Rapport'}: données modifiées depuis sa préparation.` });
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
  suggestedOpportunities = [],
  ...sourceInput
} = {}) {
  const snapshot = buildFundingSourceSnapshot({ crud, dataMap, liveMeteo, ...sourceInput });
  const eventOpportunities = deriveFundingOpportunitiesFromEvents(sourceInput.businessEvents || rows(crud, dataMap, 'business_events'));
  const normalizedOpportunities = uniqById(arr(opportunities).map(normalizeFundingOpportunity));
  const normalizedSuggestions = uniqById([...arr(suggestedOpportunities), ...eventOpportunities].map(normalizeFundingOpportunity))
    .filter((suggestion) => !normalizedOpportunities.some((opportunity) => (
      opportunity.source === suggestion.source
      && lower(opportunity.title) === lower(suggestion.title)
    )));
  const normalizedContacts = uniqById(arr(contacts).map(normalizeFundingContact));
  const normalizedDocuments = uniqById(arr(documents).map(normalizeFundingDocument));
  const normalizedApplications = uniqById(arr(applications).map(normalizeFundingApplication)).map((application, index) => {
    const evidenceKeys = new Set(
      normalizedDocuments
        .filter((document) => (
          String(document.linked_application_id || '') === String(application.id)
          && ['ready', 'published'].includes(document.status)
        ))
        .flatMap((document) => [document.title, document.category])
        .map(lower),
    );
    const evidencedDocuments = application.required_documents.filter((document) => evidenceKeys.has(lower(document)));
    return normalizeFundingApplication({
      ...application,
      ready_documents: uniqById([
        ...application.ready_documents.map((document) => ({ id: lower(document), value: document })),
        ...evidencedDocuments.map((document) => ({ id: lower(document), value: document })),
      ]).map((document) => document.value),
    }, index);
  });
  const normalizedAllocations = uniqById(arr(expenseAllocations).map(normalizeExpenseAllocation));
  const normalizedAgreements = uniqById(arr(agreements).map(normalizeFundingAgreement)).map((agreement) => {
    const allocated = normalizedAllocations
      .filter((allocation) => allocation.agreement_id === agreement.id)
      .reduce((sum, allocation) => sum + allocation.amount, 0);
    const amountSpent = allocated > 0 ? allocated : agreement.amount_spent;
    return {
      ...agreement,
      amount_spent: amountSpent,
      amount_remaining: agreement.amount_received - amountSpent,
      spend_rate: agreement.amount_received > 0 ? Math.round((amountSpent / agreement.amount_received) * 100) : 0,
    };
  });
  const normalizedReports = uniqById(arr(reports).map(normalizeFundingReport));
  const applicationByOpportunity = new Map();
  normalizedApplications.forEach((application) => {
    if (!application.opportunity_id) return;
    const previous = applicationByOpportunity.get(String(application.opportunity_id)) || 0;
    applicationByOpportunity.set(String(application.opportunity_id), Math.max(previous, application.requested_amount));
  });
  const requestedFromOpportunities = normalizedOpportunities.reduce((sum, opportunity) => (
    sum + Math.max(opportunity.amount_requested, applicationByOpportunity.get(String(opportunity.id)) || 0)
  ), 0);
  const knownOpportunityIds = new Set(normalizedOpportunities.map((opportunity) => String(opportunity.id)));
  const requestedFromStandaloneApplications = normalizedApplications
    .filter((application) => !application.opportunity_id || !knownOpportunityIds.has(String(application.opportunity_id)))
    .reduce((sum, application) => sum + application.requested_amount, 0);
  const requestedAmount = requestedFromOpportunities + requestedFromStandaloneApplications;
  const grantedAmount = normalizedAgreements.reduce((sum, row) => sum + row.amount_granted, 0);
  const receivedAmount = normalizedAgreements.reduce((sum, row) => sum + row.amount_received, 0);
  const spentAmount = normalizedAgreements.reduce((sum, row) => sum + row.amount_spent, 0);
  const nextDeadline = normalizedOpportunities
    .filter((row) => row.deadline && fundingDaysUntil(row.deadline) >= 0 && !['accordee', 'refusee', 'abandonnee'].includes(row.status))
    .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))[0] || null;
  const alerts = buildFundingAlerts({
    opportunities: normalizedOpportunities,
    applications: normalizedApplications,
    documents: normalizedDocuments,
    agreements: normalizedAgreements,
    expenseAllocations: normalizedAllocations,
    reports: normalizedReports,
    accessLogs,
    sourceSnapshot: snapshot,
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
      remaining_amount: receivedAmount - spentAmount,
      active_opportunities: normalizedOpportunities.filter((row) => !['accordee', 'refusee', 'abandonnee'].includes(row.status)).length,
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
    suggestedOpportunities: normalizedSuggestions,
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
      sourceSnapshot: snapshot,
    }),
    alertTypes: FUNDING_ALERT_TYPES,
  };
}

export function canFunderAccess({ account = {}, resource = {}, action = 'read' } = {}) {
  if (action !== 'read' && action !== 'download') return false;
  if (lower(account.status) !== 'active') return false;
  if (account.expires_at && new Date(account.expires_at).getTime() <= Date.now()) return false;
  if (resource.visibility && !['shared', 'public'].includes(lower(resource.visibility))) return false;
  const permissions = arr(account.permissions);
  if (!permissions.length) return false;
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
  account = { status: 'revoked', permissions: [] },
  reports = cockpit.reports || [],
  journalEntries = [],
  documents = cockpit.documents || [],
  demoMode = false,
} = {}) {
  const base = demoMode ? buildFundingCockpit(createFundingDemoDataset()) : cockpit;
  const effectiveAccount = demoMode ? { status: 'active', permissions: ['*'] } : account;
  const sourceReports = demoMode ? base.reports : reports;
  const sourceDocuments = demoMode ? base.documents : documents;
  const publicReports = arr(sourceReports)
    .map(normalizeFundingReport)
    .filter((report) => report.status === 'published' && canFunderAccess({ account: effectiveAccount, resource: { ...report, section: 'reports' } }))
    .map((report) => redactFunderPayload({
      id: report.id,
      title: report.title,
      period: report.period,
      status: report.status,
      visibility: report.visibility,
      version: report.version,
      published_at: report.published_at,
      public_summary: report.public_summary,
      sections: report.sections.filter((section) => typeof section === 'string'),
      file_url: report.file_url,
    }));
  const sharedDocuments = arr(sourceDocuments)
    .map(normalizeFundingDocument)
    .filter((doc) => ['shared', 'public'].includes(doc.visibility) && doc.status === 'published' && canFunderAccess({ account: effectiveAccount, resource: { ...doc, section: 'shared_documents' } }))
    .map((doc) => redactFunderPayload({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      version: doc.version,
      visibility: doc.visibility,
      status: doc.status,
      published_at: doc.published_at,
      file_url: doc.file_url,
    }));
  const journal = arr(journalEntries)
    .filter((entry) => entry.published === true || lower(entry.status) === 'published')
    .filter((entry) => canFunderAccess({ account: effectiveAccount, resource: { ...entry, visibility: entry.visibility || 'shared', section: 'project_journal' } }))
    .map((entry) => redactFunderPayload({
      id: entry.id,
      title: entry.title,
      summary: entry.summary,
      date: entry.date || entry.event_date || entry.created_at,
      status: entry.status,
    }));
  const overviewAllowed = canFunderAccess({
    account: effectiveAccount,
    resource: { visibility: 'shared', section: 'overview', id: 'overview' },
  });
  const sectionAccess = {
    overview: overviewAllowed,
    reports: publicReports.length > 0 || canFunderAccess({
      account: effectiveAccount,
      resource: { visibility: 'shared', section: 'reports', id: 'reports' },
    }),
    project_journal: journal.length > 0 || canFunderAccess({
      account: effectiveAccount,
      resource: { visibility: 'shared', section: 'project_journal', id: 'project_journal' },
    }),
    shared_documents: sharedDocuments.length > 0 || canFunderAccess({
      account: effectiveAccount,
      resource: { visibility: 'shared', section: 'shared_documents', id: 'shared_documents' },
    }),
  };

  return {
    module: FINANCEMENTS_MODULE_ID,
    readOnly: true,
    demoMode,
    sections: PUBLIC_FUNDER_SECTIONS,
    accessDenied: !Object.values(sectionAccess).some(Boolean),
    sectionAccess,
    overview: overviewAllowed ? redactFunderPayload({
      project: base.sourceSnapshot?.profile_title || 'Horizon Farm',
      public_kpis: base.sourceSnapshot?.public_kpis || {},
      generated_at: base.sourceSnapshot?.generated_at || new Date().toISOString(),
    }) : { project: '', public_kpis: {}, generated_at: null },
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
