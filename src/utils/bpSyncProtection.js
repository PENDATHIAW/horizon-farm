/**
 * Protection du contenu Excel / BP source lors des synchronisations.
 * Ne jamais écraser silencieusement les montants importés depuis Excel.
 */

import { BP_LINE_STATUS } from './bpLineConcretization.js';

const num = (v) => Number(v || 0) || 0;

export function lineHasExcelSource(row = {}) {
  return Boolean(
    row.source_document
    || row.excel_import_hash
    || row.source_bp_document
    || row.source_preservation === 'excel'
    || String(row.bp_import_version || '').startsWith('excel'),
  );
}

export function mergeBpInvestmentLineSync(official = {}, existing = null) {
  const base = {
    ...official,
    total: num(official.total ?? official.montant_prevu ?? num(official.quantite) * num(official.prix_unitaire)),
    statut: existing?.statut || BP_LINE_STATUS.A_CONCRETISER,
    display_in_investissements: true,
  };
  if (!existing?.id && !lineHasExcelSource(existing)) return base;

  const preserved = {
    montant_paye: existing.montant_paye ?? base.montant_paye,
    montant_engage: existing.montant_engage ?? base.montant_engage,
    montant_reel: existing.montant_reel ?? base.montant_reel,
    statut: existing.statut || base.statut,
    linked_finance_transaction_id: existing.linked_finance_transaction_id,
    asset_id: existing.asset_id,
    asset_created_at: existing.asset_created_at,
    proof_document_id: existing.proof_document_id,
    date_concretisation: existing.date_concretisation,
    id: existing.id,
    business_plan_id: existing.business_plan_id,
  };

  if (lineHasExcelSource(existing)) {
    return {
      ...base,
      ...preserved,
      quantite: existing.quantite ?? base.quantite,
      prix_unitaire: existing.prix_unitaire ?? base.prix_unitaire,
      montant_prevu: existing.montant_prevu ?? existing.total ?? base.montant_prevu,
      total: existing.total ?? existing.montant_prevu ?? base.total,
      designation: existing.designation || base.designation,
      source_document: existing.source_document || base.source_document,
      source_bp_line: existing.source_bp_line || base.source_bp_line,
      source_bp_document: existing.source_bp_document || base.source_bp_document,
      excel_import_hash: existing.excel_import_hash,
      source_preservation: 'excel',
    };
  }

  return { ...base, ...preserved };
}

export function mergeBpRecurringCostSync(official = {}, existing = null) {
  const base = {
    ...official,
    frequence: 'mensuelle',
    statut: existing?.statut || BP_LINE_STATUS.A_CONCRETISER,
    display_in_investissements: false,
  };
  if (!existing?.id && !lineHasExcelSource(existing)) return base;

  const preserved = {
    montant_paye: existing.montant_paye,
    montant_engage: existing.montant_engage,
    statut: existing.statut || base.statut,
    linked_finance_transaction_id: existing.linked_finance_transaction_id,
    id: existing.id,
    business_plan_id: existing.business_plan_id,
  };

  if (lineHasExcelSource(existing)) {
    return {
      ...base,
      ...preserved,
      montant_mensuel: existing.montant_mensuel ?? existing.montant_prevu ?? base.montant_mensuel,
      montant_prevu: existing.montant_prevu ?? base.montant_prevu,
      designation: existing.designation || base.designation,
      source_document: existing.source_document,
      source_preservation: 'excel',
    };
  }

  return { ...base, ...preserved };
}

export function tagExcelImportLines(lines = [], fileName = '') {
  const hash = `excel:${fileName}:${lines.length}`;
  return lines.map((line) => ({
    ...line,
    source_document: fileName,
    source_bp_document: fileName,
    source_preservation: 'excel',
    excel_import_hash: hash,
    bp_import_version: 'excel-2.1',
  }));
}

export function countPreservedExcelLines(lines = []) {
  return lines.filter(lineHasExcelSource).length;
}
