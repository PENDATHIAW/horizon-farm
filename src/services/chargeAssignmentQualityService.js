import { classifyProfitCharge, PROFIT_BUCKETS } from './globalProfitabilityService';
import { toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').toLowerCase().trim();
const clean = (value) => String(value || '').trim();
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.chiffre_affaires);
const idOf = (row = {}) => clean(row.id);
const textOf = (row = {}) => lower(`${row.id || ''} ${row.reference || ''} ${row.categorie || ''} ${row.category || ''} ${row.module_lie || ''} ${row.source_module || ''} ${row.entity_type || ''} ${row.target_type || ''} ${row.type_cible || ''} ${row.libelle || ''} ${row.description || ''} ${row.notes || ''}`);
const targetId = (row = {}) => clean(row.animal_id || row.lot_id || row.culture_id || row.stock_id || row.target_id || row.cible_id || row.entity_id || row.related_id || row.source_record_id);
const hasLinkedTarget = (row = {}) => Boolean(targetId(row));

function labelOf(row = {}) {
  return clean(`${row.id || ''} ${row.name || ''} ${row.nom || ''} ${row.tag || ''} ${row.type || ''} ${row.reference || ''}`);
}

function moduleFromRow(row = {}) {
  const text = textOf(row);
  if (/animal|animaux|bovin|ovin|caprin/.test(text)) return 'animaux';
  if (/avicole|volaille|poulet|poussin|pondeuse|chair|lot/.test(text)) return 'avicole';
  if (/culture|cultures|maraichage|maraîchage|parcelle|semence|intrant/.test(text)) return 'cultures';
  if (/stock|aliment|provende|fourrage|maïs|mais|son/.test(text)) return 'stock';
  if (/sant|vaccin|veto|véto|soin|traitement/.test(text)) return 'sante';
  if (/rh|salaire|paie|rémun|remun/.test(text)) return 'rh';
  if (/exploitation|loyer|eau|électric|electric|internet|taxe|impôt|impot|assurance|admin/.test(text)) return 'exploitation';
  if (/equip|maintenance|machine|pompe|groupe|carburant/.test(text)) return 'equipements';
  if (/invest|immobilisation|construction|bâtiment|batiment|business plan|bp/.test(text)) return 'investissements';
  return '';
}

function candidatesForModule(moduleKey, data = {}) {
  if (moduleKey === 'animaux') return arr(data.animaux).map((row) => ({ ...row, _module: 'animaux', _entityType: 'animal' }));
  if (moduleKey === 'avicole') return arr(data.lots || data.avicole).map((row) => ({ ...row, _module: 'avicole', _entityType: 'lot_avicole' }));
  if (moduleKey === 'cultures') return arr(data.cultures).map((row) => ({ ...row, _module: 'cultures', _entityType: 'culture' }));
  if (moduleKey === 'stock') return arr(data.stocks || data.stock).map((row) => ({ ...row, _module: 'stock', _entityType: 'stock' }));
  return [];
}

function allCandidates(data = {}) {
  return [
    ...candidatesForModule('animaux', data),
    ...candidatesForModule('avicole', data),
    ...candidatesForModule('cultures', data),
    ...candidatesForModule('stock', data),
  ];
}

function exactIdMatch(row = {}, candidates = []) {
  const explicit = targetId(row);
  if (!explicit) return null;
  return candidates.find((candidate) => clean(candidate.id) === explicit) || null;
}

function textMatch(row = {}, candidates = []) {
  const text = textOf(row);
  const scored = candidates.map((candidate) => {
    const labels = labelOf(candidate).split(/\s+/).map(lower).filter((x) => x.length >= 3);
    const id = lower(candidate.id);
    const tag = lower(candidate.tag || candidate.name || candidate.nom);
    let score = 0;
    if (id && text.includes(id)) score += 100;
    if (tag && tag.length >= 3 && text.includes(tag)) score += 85;
    labels.forEach((label) => { if (label && text.includes(label)) score += 18; });
    return { candidate, score };
  }).filter((item) => item.score >= 50).sort((a, b) => b.score - a.score);
  return scored[0] || null;
}

export function autoResolveChargeAssignment(row = {}, data = {}) {
  const baseBucket = classifyProfitCharge(row);
  const moduleHint = moduleFromRow(row);
  const candidates = moduleHint ? candidatesForModule(moduleHint, data) : candidatesForModule(baseBucket, data);
  const globalCandidates = candidates.length ? candidates : allCandidates(data);
  const exact = exactIdMatch(row, globalCandidates);
  if (exact) {
    return {
      bucket: exact._module === 'stock' ? baseBucket : exact._module,
      module: exact._module,
      entityType: exact._entityType,
      entityId: exact.id,
      confidence: 100,
      status: 'auto_resolved',
      reason: 'ID cible déjà présent dans la charge.',
      patch: {
        module_lie: exact._module,
        source_module: row.source_module || exact._module,
        entity_type: exact._entityType,
        entity_id: exact.id,
        target_id: exact.id,
        assignment_status: 'auto_resolved',
        assignment_confidence: 100,
      },
    };
  }

  const matched = textMatch(row, globalCandidates);
  if (matched?.candidate && matched.score >= 75) {
    const candidate = matched.candidate;
    return {
      bucket: candidate._module === 'stock' ? baseBucket : candidate._module,
      module: candidate._module,
      entityType: candidate._entityType,
      entityId: candidate.id,
      confidence: Math.min(98, matched.score),
      status: 'auto_resolved',
      reason: 'Nom, tag ou référence cible détecté automatiquement dans le libellé.',
      patch: {
        module_lie: candidate._module,
        source_module: row.source_module || candidate._module,
        entity_type: candidate._entityType,
        entity_id: candidate.id,
        target_id: candidate.id,
        assignment_status: 'auto_resolved',
        assignment_confidence: Math.min(98, matched.score),
      },
    };
  }

  if (['animaux', 'avicole', 'cultures'].includes(baseBucket) && moduleHint === baseBucket) {
    return {
      bucket: baseBucket,
      module: baseBucket,
      entityType: baseBucket === 'animaux' ? 'animal' : baseBucket === 'avicole' ? 'lot_avicole' : 'culture',
      entityId: '',
      confidence: 65,
      status: 'auto_classified_activity',
      reason: 'Activité détectée automatiquement, mais cible individuelle non identifiable.',
      patch: {
        module_lie: baseBucket,
        source_module: row.source_module || baseBucket,
        assignment_status: 'auto_classified_activity',
        assignment_confidence: 65,
      },
    };
  }

  if (['rh', 'exploitation', 'equipements', 'fournisseurs_achats', 'investissements', 'autres_charges'].includes(baseBucket)) {
    return {
      bucket: baseBucket,
      module: baseBucket,
      entityType: 'structure',
      entityId: '',
      confidence: 85,
      status: 'auto_classified_structure',
      reason: `${PROFIT_BUCKETS[baseBucket]} détecté automatiquement comme charge de structure ou investissement.`,
      patch: {
        module_lie: baseBucket,
        source_module: row.source_module || baseBucket,
        entity_type: 'structure',
        assignment_status: 'auto_classified_structure',
        assignment_confidence: 85,
      },
    };
  }

  return {
    bucket: baseBucket,
    module: baseBucket,
    entityType: '',
    entityId: '',
    confidence: 35,
    status: 'auto_unresolved',
    reason: 'Charge classée automatiquement, mais sans cible précise fiable.',
    patch: {
      module_lie: baseBucket,
      source_module: row.source_module || baseBucket,
      assignment_status: 'auto_unresolved',
      assignment_confidence: 35,
    },
  };
}

export function auditChargeAssignment({ transactions = [], animaux = [], lots = [], cultures = [], stocks = [] } = {}) {
  const data = { animaux, lots, cultures, stocks };
  const charges = arr(transactions).filter((tx) => lower(tx.type) === 'sortie' && amount(tx) > 0);
  const audits = charges.map((tx) => {
    const resolved = autoResolveChargeAssignment(tx, data);
    const linked = hasLinkedTarget(tx) || Boolean(resolved.entityId);
    let severity = 'low';
    if (resolved.status === 'auto_unresolved') severity = 'medium';
    if (['stock_non_affecte', 'sante_non_affectee'].includes(resolved.bucket) && !resolved.entityId) severity = 'medium';
    return {
      id: idOf(tx),
      transaction: tx,
      bucket: resolved.bucket,
      bucketLabel: PROFIT_BUCKETS[resolved.bucket] || resolved.bucket,
      moduleHint: resolved.module,
      linked,
      target: resolved.entityId,
      status: resolved.status,
      severity,
      message: resolved.reason,
      action: resolved.status === 'auto_unresolved' ? 'Classé automatiquement en non résolu. Fiabilité réduite, sans action obligatoire.' : 'Affectation automatique disponible.',
      confidence: resolved.confidence,
      suggestedTarget: resolved.entityId ? { id: resolved.entityId, entity_type: resolved.entityType, module: resolved.module } : null,
      autoPatch: resolved.patch,
      amount: amount(tx),
    };
  });

  const summary = audits.reduce((acc, audit) => {
    acc.total += 1;
    acc.amount += audit.amount;
    acc.byStatus[audit.status] = (acc.byStatus[audit.status] || 0) + 1;
    acc.byBucket[audit.bucket] ||= { bucket: audit.bucket, label: audit.bucketLabel, count: 0, amount: 0 };
    acc.byBucket[audit.bucket].count += 1;
    acc.byBucket[audit.bucket].amount += audit.amount;
    if (audit.status === 'auto_unresolved') acc.unresolved += 1;
    if (audit.status.includes('auto')) acc.auto += 1;
    return acc;
  }, { total: 0, amount: 0, auto: 0, unresolved: 0, byStatus: {}, byBucket: {} });

  const reliability = summary.total ? Math.max(0, Math.round(100 - (summary.unresolved * 10))) : 100;
  return { audits, summary, reliability };
}

export function autoEnrichCharges({ transactions = [], animaux = [], lots = [], cultures = [], stocks = [] } = {}) {
  const data = { animaux, lots, cultures, stocks };
  return arr(transactions).map((tx) => {
    if (lower(tx.type) !== 'sortie') return tx;
    const resolved = autoResolveChargeAssignment(tx, data);
    return { ...tx, ...resolved.patch, profit_bucket: resolved.bucket, assignment_reason: resolved.reason };
  });
}
