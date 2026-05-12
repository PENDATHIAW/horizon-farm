import { classifyProfitCharge, PROFIT_BUCKETS } from './globalProfitabilityService';
import { toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').toLowerCase();
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.chiffre_affaires);
const idOf = (row = {}) => String(row.id || '').trim();
const textOf = (row = {}) => lower(`${row.categorie || ''} ${row.category || ''} ${row.module_lie || ''} ${row.source_module || ''} ${row.entity_type || ''} ${row.target_type || ''} ${row.type_cible || ''} ${row.libelle || ''} ${row.description || ''} ${row.notes || ''}`);
const hasLinkedTarget = (row = {}) => Boolean(row.animal_id || row.lot_id || row.culture_id || row.stock_id || row.target_id || row.cible_id || row.entity_id || row.related_id || row.source_record_id);
const targetId = (row = {}) => String(row.animal_id || row.lot_id || row.culture_id || row.stock_id || row.target_id || row.cible_id || row.entity_id || row.related_id || row.source_record_id || '').trim();

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
  if (/invest|immobilisation|construction|bâtiment|batiment|business plan/.test(text)) return 'investissements';
  return '';
}

function findCandidate(row = {}, candidates = []) {
  const text = textOf(row);
  const explicit = targetId(row);
  if (explicit) {
    const match = candidates.find((candidate) => String(candidate.id) === explicit);
    if (match) return { candidate: match, reason: 'ID cible déjà présent', confidence: 100 };
  }
  const named = candidates.find((candidate) => {
    const name = lower(`${candidate.name || ''} ${candidate.nom || ''} ${candidate.tag || ''} ${candidate.type || ''}`);
    return name && text.includes(name);
  });
  if (named) return { candidate: named, reason: 'Nom ou tag détecté dans le libellé', confidence: 75 };
  return { candidate: null, reason: '', confidence: 0 };
}

function candidatesForBucket(bucket, data = {}) {
  if (bucket === 'animaux') return arr(data.animaux);
  if (bucket === 'avicole') return arr(data.lots || data.avicole);
  if (bucket === 'cultures') return arr(data.cultures);
  if (bucket === 'stock_non_affecte') return arr(data.stocks || data.stock);
  return [];
}

export function auditChargeAssignment({ transactions = [], animaux = [], lots = [], cultures = [], stocks = [] } = {}) {
  const data = { animaux, lots, cultures, stocks };
  const charges = arr(transactions).filter((tx) => lower(tx.type) === 'sortie' && amount(tx) > 0);
  const audits = charges.map((tx) => {
    const bucket = classifyProfitCharge(tx);
    const moduleHint = moduleFromRow(tx);
    const linked = hasLinkedTarget(tx);
    const target = targetId(tx);
    const candidates = candidatesForBucket(bucket, data);
    const candidateMatch = findCandidate(tx, candidates);
    const isActivity = ['animaux', 'avicole', 'cultures'].includes(bucket);
    const isUnallocated = ['stock_non_affecte', 'sante_non_affectee'].includes(bucket);
    const isStructure = ['rh', 'exploitation', 'equipements', 'fournisseurs_achats', 'autres_charges', 'investissements'].includes(bucket);

    let status = 'ok';
    let severity = 'low';
    let message = 'Charge classée.';
    let action = 'Aucune action nécessaire.';
    let confidence = linked ? 95 : 70;

    if (isActivity && !linked && !candidateMatch.candidate) {
      status = 'needs_target';
      severity = 'high';
      message = `Charge classée en ${PROFIT_BUCKETS[bucket]}, mais sans cible précise.`;
      action = 'Rattacher à un animal, lot ou culture pour fiabiliser la marge.';
      confidence = 45;
    } else if (isActivity && !linked && candidateMatch.candidate) {
      status = 'suggested_target';
      severity = 'medium';
      message = `Cible probable détectée : ${candidateMatch.candidate.name || candidateMatch.candidate.nom || candidateMatch.candidate.tag || candidateMatch.candidate.id}.`;
      action = 'Confirmer le rattachement suggéré.';
      confidence = candidateMatch.confidence;
    } else if (isUnallocated) {
      status = 'unallocated';
      severity = 'medium';
      message = `${PROFIT_BUCKETS[bucket]} : charge opérationnelle non affectée.`;
      action = 'Affecter à Animaux, Avicole, Cultures ou confirmer Stock/Structure.';
      confidence = 50;
    } else if (isStructure) {
      status = 'structure';
      severity = 'low';
      message = `${PROFIT_BUCKETS[bucket]} : charge de structure ou investissement.`;
      action = 'Ne pas rattacher aux sujets sauf charge directe ponctuelle.';
      confidence = 85;
    }

    return {
      id: idOf(tx),
      transaction: tx,
      bucket,
      bucketLabel: PROFIT_BUCKETS[bucket] || bucket,
      moduleHint,
      linked,
      target,
      status,
      severity,
      message,
      action,
      confidence,
      suggestedTarget: candidateMatch.candidate || null,
      suggestedReason: candidateMatch.reason,
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
    if (['needs_target', 'unallocated', 'suggested_target'].includes(audit.status)) acc.toFix += 1;
    if (audit.severity === 'high') acc.high += 1;
    return acc;
  }, { total: 0, amount: 0, toFix: 0, high: 0, byStatus: {}, byBucket: {} });

  const reliability = summary.total ? Math.max(0, Math.round(100 - (summary.high * 18) - ((summary.toFix - summary.high) * 8))) : 100;
  return { audits, summary, reliability };
}
