export const JUSTIFIED_EXCEPTION_STORAGE_KEY = 'horizon_farm_justified_exceptions';
export const LEGACY_IGNORED_INTERCONNECTION_KEY = 'horizon_farm_ignored_interconnection_issues';

export const JUSTIFIED_EXCEPTION_TYPES = {
  INTERCONNECTION: 'interconnection',
  AUDIT_LOT: 'audit_lot',
  HEALTH_FINDING: 'health_finding',
  VISION_AUDIT: 'vision_audit',
  QUALITY_GAP: 'quality_gap',
};

export const JUSTIFIED_EXCEPTION_REASONS = [
  { value: 'stock_initial', label: 'Stock initial' },
  { value: 'don', label: 'Don' },
  { value: 'correction_inventaire', label: 'Correction inventaire' },
  { value: 'charge_non_stockable', label: 'Charge non stockable' },
  { value: 'document_administratif', label: 'Document administratif' },
  { value: 'vente_credit_normale', label: 'Vente à crédit normale' },
  { value: 'capteur_desactive', label: 'Capteur volontairement désactivé' },
  { value: 'test_interne', label: 'Test interne' },
];

const clean = (value) => String(value ?? '').trim();

export function reasonLabel(value = '') {
  return JUSTIFIED_EXCEPTION_REASONS.find((item) => item.value === value)?.label || value || '-';
}

export function buildInterconnectionIssueKey(issue = {}) {
  return `${issue.flow || 'erp'}:${issue.module || 'module'}:${issue.row_id || 'row'}:${issue.linked_id || ''}:${issue.message || ''}`;
}

export function buildAuditLotIssueKey(issue = {}) {
  return `audit:${issue.lot || 'lot'}:${issue.module || 'module'}:${issue.title || ''}`;
}

export function buildHealthFindingIssueKey(finding = {}) {
  return clean(finding.id || finding.issue_key || finding.alert_dedupe_key || finding.title);
}

export function buildVisionAuditIssueKey(issue = {}, moduleId = '') {
  return `vision:${moduleId || issue.moduleId || 'module'}:${issue.title || ''}:${issue.detail || ''}`;
}

export function buildIssueKey(issue = {}, typeException = JUSTIFIED_EXCEPTION_TYPES.INTERCONNECTION, context = {}) {
  if (typeException === JUSTIFIED_EXCEPTION_TYPES.AUDIT_LOT) return buildAuditLotIssueKey(issue);
  if (typeException === JUSTIFIED_EXCEPTION_TYPES.HEALTH_FINDING) return buildHealthFindingIssueKey(issue);
  if (typeException === JUSTIFIED_EXCEPTION_TYPES.VISION_AUDIT) return buildVisionAuditIssueKey(issue, context.moduleId);
  if (issue.issue_key) return clean(issue.issue_key);
  return buildInterconnectionIssueKey(issue);
}

export function validateJustifiedExceptionPayload(payload = {}) {
  const issueKey = clean(payload.issue_key);
  const raison = clean(payload.raison);
  const typeException = clean(payload.type_exception);
  if (!issueKey) return 'Clé issue manquante.';
  if (!raison) return 'Choisis une raison.';
  if (!typeException) return 'Type exception manquant.';
  if (!JUSTIFIED_EXCEPTION_REASONS.some((item) => item.value === raison)) return 'Raison non reconnue.';
  if (!Object.values(JUSTIFIED_EXCEPTION_TYPES).includes(typeException)) return 'Type exception non reconnu.';
  return '';
}
