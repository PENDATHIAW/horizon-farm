/**
 * Audit et réparation des liaisons BP ↔ opérations réelles (finance, actifs).
 * « Lier opération » = réparation exceptionnelle, pas parcours normal.
 */

import { toNumber } from './format.js';
import { investmentAssetKind, investmentLabel } from './investmentWorkflows.js';
import {
  BP_LINE_STATUS,
  bpCostAmount,
  bpCostLabel,
  bpLineAmount,
  buildBpLineConcretizationRoute,
  buildBpCostConcretizationRoute,
  canConcretizeBpCost,
  canConcretizeBpLine,
  isBpCostEditable,
  isBpLineEditable,
  normalizeBpLineStatus,
} from './bpLineConcretization.js';

const now = () => new Date().toISOString();
const lower = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export function lineRecordId(line = {}) {
  return line.linked_record_id || line.asset_id || line.linked_stock_id || line.linked_entity_id || '';
}

export function lineFinanceId(line = {}) {
  return line.linked_finance_transaction_id || line.transaction_id || line.linked_transaction_id || '';
}

/** Vérifie si une ligne concrétisée possède bien ses liens métier. */
export function auditBpLineLinkage(line = {}, { kind = 'investment' } = {}) {
  const status = normalizeBpLineStatus(line);
  const recordId = lineRecordId(line);
  const financeId = lineFinanceId(line);
  const proofId = line.proof_document_id || '';
  const isPartial = status === BP_LINE_STATUS.CONCRETISE_PARTIEL;
  const isConcretized = status === BP_LINE_STATUS.CONCRETISE || isPartial;
  const isBlocked = [BP_LINE_STATUS.BLOQUE, BP_LINE_STATUS.A_JUSTIFIER].includes(status);
  const isTerminal = [BP_LINE_STATUS.ANNULE, BP_LINE_STATUS.REMPLACE, BP_LINE_STATUS.REPORTE].includes(status);
  const expectsAsset = kind === 'investment' && Boolean(investmentAssetKind(line));
  const label = kind === 'cost' ? bpCostLabel(line) : investmentLabel(line);

  let linkageIssue = null;
  let linkageMessage = '';

  if (isConcretized && !isTerminal) {
    if (!recordId && !financeId) {
      linkageIssue = 'missing_both';
      linkageMessage = 'Opération créée mais non liée - réparer la liaison.';
    } else if (expectsAsset && recordId && !financeId) {
      linkageIssue = 'missing_finance';
      linkageMessage = 'Actif créé sans écriture Trésorerie liée.';
    } else if (expectsAsset && financeId && !recordId) {
      linkageIssue = 'missing_asset';
      linkageMessage = 'Paiement enregistré sans actif métier lié.';
    } else if (!expectsAsset && !financeId && toNumber(line.montant_reel ?? line.montant_paye) > 0) {
      linkageIssue = 'missing_finance';
      linkageMessage = 'Montant réalisé sans opération finance liée.';
    }
  }

  const route = kind === 'cost'
    ? buildBpCostConcretizationRoute(line)
    : buildBpLineConcretizationRoute(line);
  const canConcretize = kind === 'cost'
    ? canConcretizeBpCost(line) && Boolean(route)
    : canConcretizeBpLine(line) && Boolean(route);

  return {
    status,
    label,
    recordId,
    financeId,
    proofId,
    isPartial,
    isConcretized,
    isBlocked,
    isTerminal,
    expectsAsset,
    linkageIssue,
    linkageMessage,
    needsProof: Boolean(financeId) && !proofId && toNumber(line.montant_reel ?? line.montant_paye ?? bpLineAmount(line)) >= 100000,
    showConcretize: canConcretize && !isPartial && !isConcretized,
    showComplete: isPartial || (isConcretized && isPartial) || (status === BP_LINE_STATUS.CONCRETISE_PARTIEL),
    showJoinProof: Boolean(financeId) && !proofId,
    showViewOperation: Boolean(recordId || financeId),
    showViewBlockage: isBlocked || Boolean(linkageIssue),
    showRepairLink: Boolean(linkageIssue),
  };
}

/** Cherche des transactions finance probablement rattachables (réparation). */
export function findProbableFinanceLinks(line = {}, transactions = [], { kind = 'investment' } = {}) {
  const label = lower(kind === 'cost' ? bpCostLabel(line) : investmentLabel(line));
  const targetAmount = toNumber(
    line.montant_reel ?? line.montant_paye ?? (kind === 'cost' ? bpCostAmount(line) : bpLineAmount(line)),
  );
  if (targetAmount <= 0) return [];

  const tolerance = Math.max(500, targetAmount * 0.03);
  const lineId = String(line.id || '');

  return (Array.isArray(transactions) ? transactions : [])
    .filter((trx) => {
      if (!trx?.id) return false;
      if (lineFinanceId(line) && String(trx.id) === String(lineFinanceId(line))) return false;
      if (trx.bp_line_id && String(trx.bp_line_id) !== lineId) return false;
      if (trx.bp_cost_id && String(trx.bp_cost_id) !== lineId) return false;
      const amount = toNumber(trx.montant ?? trx.amount);
      if (Math.abs(amount - targetAmount) > tolerance) return false;
      const libelle = lower(trx.libelle || trx.label || trx.description || '');
      const moduleOk = ['investissements', 'finances', 'investissement'].includes(lower(trx.source_module || trx.module_lie || ''));
      const labelOk = !label || libelle.includes(label.slice(0, 10)) || label.includes(libelle.slice(0, 10));
      const idOk = String(trx.investment_line_id || trx.source_record_id || '') === lineId;
      return idOk || moduleOk || labelOk;
    })
    .slice(0, 3)
    .map((trx) => ({
      transaction: trx,
      score: scoreFinanceMatch(line, trx, { label, targetAmount, tolerance }),
    }))
    .sort((a, b) => b.score - a.score)
    .map((row) => row.transaction);
}

function scoreFinanceMatch(line, trx, { label, targetAmount, tolerance }) {
  let score = 0;
  const amount = toNumber(trx.montant ?? trx.amount);
  if (Math.abs(amount - targetAmount) <= tolerance * 0.1) score += 40;
  else if (Math.abs(amount - targetAmount) <= tolerance) score += 25;
  const libelle = lower(trx.libelle || trx.label || '');
  if (label && libelle.includes(label.slice(0, 12))) score += 30;
  if (String(trx.bp_line_id || trx.bp_cost_id || trx.investment_line_id || '') === String(line.id)) score += 50;
  if (lower(trx.source_module || '') === 'investissements') score += 15;
  return score;
}

export function buildBpFinanceRepairPatch(line = {}, transaction = {}) {
  const amount = toNumber(transaction.montant ?? transaction.amount ?? line.montant_reel);
  return {
    linked_finance_transaction_id: transaction.id,
    linked_transaction_id: transaction.id,
    montant_reel: amount || line.montant_reel,
    montant_paye: amount || line.montant_paye,
    reste_a_realiser: Math.max(0, bpLineAmount(line) - amount),
    linkage_repaired_at: now(),
    linkage_repair_source: 'probable_match',
    linkage_repair_transaction_id: transaction.id,
    updated_at: now(),
  };
}

/** Actions principales + menu réparation pour une ligne BP. */
export function resolveBpLineActions(line = {}, context = {}) {
  const kind = context.kind || 'investment';
  const linkage = auditBpLineLinkage(line, { kind });
  const probable = linkage.linkageIssue
    ? findProbableFinanceLinks(line, context.transactions, { kind })
    : [];
  const editable = kind === 'cost' ? isBpCostEditable(line) : isBpLineEditable(line);

  const primary = [];
  if (linkage.showConcretize) primary.push({ id: 'concretize', label: 'Concrétiser', tone: 'primary' });
  if (linkage.showComplete && !linkage.showConcretize) primary.push({ id: 'complete', label: 'Compléter', tone: 'primary' });
  if (linkage.showRepairLink) primary.push({ id: 'repair', label: 'Réparer liaison', tone: 'danger' });
  if (linkage.showJoinProof) primary.push({ id: 'proof', label: 'Joindre preuve', tone: 'secondary' });
  if (linkage.showViewOperation) primary.push({ id: 'view_op', label: 'Voir opération', tone: 'secondary' });
  if (linkage.showViewBlockage && !linkage.showRepairLink) primary.push({ id: 'view_block', label: 'Voir blocage', tone: 'warn' });

  const repair = [];
  if (editable) {
    if (kind === 'investment') repair.push({ id: 'edit', label: 'Modifier' });
    repair.push({ id: 'postpone', label: 'Reporter' });
    repair.push({ id: 'cancel', label: 'Annuler' });
    repair.push({ id: 'link_existing', label: 'Lier une opération existante…', advanced: true });
    if (probable.length) {
      repair.push({
        id: 'auto_link',
        label: `Réparer · ${probable[0].libelle || probable[0].id || 'transaction probable'}`,
        advanced: true,
        transaction: probable[0],
      });
    }
  }

  return { linkage, probable, primary, repair, editable };
}

export function navigateToLinkedOperation(line = {}, { onNavigate, kind = 'investment' } = {}) {
  const recordId = lineRecordId(line);
  const financeId = lineFinanceId(line);
  if (financeId) {
    onNavigate?.('finance_pilotage', { tab: 'Trésorerie' });
    return { target: 'finance', id: financeId };
  }
  if (recordId) {
    const assetKind = investmentAssetKind(line);
    if (assetKind === 'avicole') onNavigate?.('elevage', { tab: 'Avicole' });
    else if (assetKind === 'animal') onNavigate?.('elevage', { tab: 'Animaux' });
    else if (assetKind === 'culture') onNavigate?.('cultures');
    else if (assetKind === 'stock') onNavigate?.('achats_stock', { tab: 'Stock' });
    else onNavigate?.('finance_pilotage', { tab: 'Investissements' });
    return { target: 'asset', id: recordId };
  }
  if (kind === 'cost') {
    const route = buildBpCostConcretizationRoute(line);
    if (route?.navigate) {
      const { module, tab } = route.navigate;
      onNavigate?.(module, tab ? { tab } : undefined);
      return { target: 'module', module };
    }
  }
  return null;
}
