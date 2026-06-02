/**
 * Métadonnées des transactions finance : origine, module source, clé d’idempotence.
 * Finance = miroir des modules métier + charges exceptionnelles manuelles.
 */

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();

export const ORIGIN_TYPES = {
  AUTOMATIC: 'automatic',
  MANUAL: 'manual',
  WORKFLOW: 'workflow',
  IMPORTED: 'imported',
};

const WORKFLOW_SOURCES = new Set([
  'sale_side_effects',
  'record_sale_payment',
  'stock_purchase_workflow',
  'purchase_side_effects',
  'payment_side_effects',
  'erp_interconnection',
  'workflow',
]);

const AUTOMATIC_SOURCES = new Set([
  'automatique',
  'automatic',
  'auto',
  'sync',
]);

/** Normalise origin_type (nouveau champ) à partir des champs legacy. */
export function resolveOriginType(row = {}) {
  const explicit = lower(row.origin_type);
  if (Object.values(ORIGIN_TYPES).includes(explicit)) return explicit;

  const createdFrom = lower(row.created_from || row.transaction_source || '');
  const legacyOrigin = lower(row.transaction_origin || '');

  if (legacyOrigin === 'import' || legacyOrigin === 'importe' || legacyOrigin === 'importé' || createdFrom.includes('import')) {
    return ORIGIN_TYPES.IMPORTED;
  }
  if (WORKFLOW_SOURCES.has(createdFrom) || createdFrom.includes('workflow') || createdFrom.includes('_side_effects')) {
    return ORIGIN_TYPES.WORKFLOW;
  }
  if (
    AUTOMATIC_SOURCES.has(legacyOrigin)
    || legacyOrigin === 'automatique'
    || row.side_effects_managed === true
    || Boolean(clean(row.source_module) && clean(row.source_record_id) && createdFrom && !createdFrom.includes('hey_horizon'))
  ) {
    if (WORKFLOW_SOURCES.has(createdFrom) || createdFrom.includes('workflow') || createdFrom.includes('purchase') || createdFrom.includes('sale')) {
      return ORIGIN_TYPES.WORKFLOW;
    }
    return ORIGIN_TYPES.AUTOMATIC;
  }
  if (createdFrom.includes('hey_horizon') && !row.side_effects_managed) {
    return ORIGIN_TYPES.MANUAL;
  }
  if (!clean(row.source_module) && !row.side_effects_managed) {
    return ORIGIN_TYPES.MANUAL;
  }
  return ORIGIN_TYPES.AUTOMATIC;
}

export function buildFinanceIssueKey({
  sourceModule = '',
  sourceRecordId = '',
  suffix = '',
} = {}) {
  const mod = lower(sourceModule) || 'finance';
  const id = clean(sourceRecordId) || 'na';
  const tail = clean(suffix);
  return tail ? `finance:${mod}:${id}:${tail}` : `finance:${mod}:${id}`;
}

/** Enrichit une ligne finance avant persistance. */
export function enrichFinanceTransaction(row = {}, overrides = {}) {
  const sourceModule = clean(overrides.source_module ?? row.source_module ?? row.module_lie ?? '');
  const sourceRecordId = clean(
    overrides.source_record_id
    ?? row.source_record_id
    ?? row.related_id
    ?? row.order_id
    ?? row.stock_id
    ?? row.payment_id
    ?? '',
  );
  const originType = overrides.origin_type || resolveOriginType({ ...row, ...overrides });
  const issueKey = clean(overrides.issue_key)
    || clean(row.issue_key)
    || (sourceModule && sourceRecordId
      ? buildFinanceIssueKey({ sourceModule, sourceRecordId, suffix: clean(overrides.issue_suffix || row.payment_id || row.id || '') })
      : '');

  return {
    ...row,
    ...overrides,
    origin_type: originType,
    transaction_origin: row.transaction_origin || (originType === ORIGIN_TYPES.MANUAL ? 'manuel' : 'automatique'),
    source_module: sourceModule || row.source_module || '',
    source_record_id: sourceRecordId || row.source_record_id || '',
    issue_key: issueKey,
  };
}

export function isAutomaticFinanceTransaction(row = {}) {
  const origin = resolveOriginType(row);
  return origin === ORIGIN_TYPES.AUTOMATIC || origin === ORIGIN_TYPES.WORKFLOW || origin === ORIGIN_TYPES.IMPORTED;
}

export function isManualExceptionFinanceTransaction(row = {}) {
  return resolveOriginType(row) === ORIGIN_TYPES.MANUAL;
}

export function originTypeLabel(originType = '') {
  const map = {
    [ORIGIN_TYPES.AUTOMATIC]: 'Automatique',
    [ORIGIN_TYPES.MANUAL]: 'Manuelle exceptionnelle',
    [ORIGIN_TYPES.WORKFLOW]: 'Workflow métier',
    [ORIGIN_TYPES.IMPORTED]: 'Importée',
  };
  return map[lower(originType)] || 'Automatique';
}

const chargeText = (payload = {}) => lower(
  `${payload.categorie || ''} ${payload.category || ''} ${payload.libelle || ''} ${payload.label || ''} ${payload.module_lie || ''} ${payload.source_module || ''} ${payload.notes || ''}`,
);

/** Redirection module source si l’utilisateur tente une charge opérationnelle en finance. */
export function classifyOperationalChargeRedirect(payload = {}) {
  const type = lower(payload.type || payload.transaction_type || '');
  if (type === 'entree' || type === 'entrée' || type === 'income') return null;

  const text = chargeText(payload);

  if (/medicament|médicament|vaccin|veterinaire|vétérinaire|veto|traitement|antibio|sante|santé/.test(text)) {
    return {
      block: true,
      module: 'sante',
      tab: null,
      label: 'Santé',
      message: 'Les achats vétérinaires / médicaments se saisissent dans le module Santé, pas en finance directe.',
    };
  }

  if (/aliment|provende|stock|intrant|semence|engrais|achat|fournisseur|matériel|materiel/.test(text)) {
    return {
      block: true,
      module: 'achats_stock',
      tab: 'Stock',
      label: 'Achats & Stock',
      message: 'Les achats stockables (aliment, intrants…) se saisissent dans Achats & Stock → Réception achat.',
    };
  }

  if (/paie|salaire|rémunération|remuneration|rh|employe|employé/.test(text)) {
    return {
      block: true,
      module: 'rh',
      tab: null,
      label: 'RH / Paie',
      message: 'La paie et les salaires se gèrent dans RH, pas comme charge simple en finance.',
    };
  }

  return null;
}

export function splitTreasuryTransactions(transactions = []) {
  const automatic = [];
  const manualException = [];
  arr(transactions).forEach((row) => {
    if (isManualExceptionFinanceTransaction(row)) manualException.push(row);
    else automatic.push(row);
  });
  return { automatic, manualException };
}
