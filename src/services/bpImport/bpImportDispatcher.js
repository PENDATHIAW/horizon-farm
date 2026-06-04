/**
 * Import BP — répartit le contenu des 4 onglets vers les bons modules ERP.
 * Source principale : horizonFarmOfficialBusinessPlan (transcription du xlsx).
 * Option : parseBpExcelWorkbook() pour import fichier direct.
 */

import * as XLSX from 'xlsx';
import { HORIZON_FARM_OFFICIAL_BP } from '../horizonFarmOfficialBusinessPlan.js';
import {
  BP_LINE_NATURE,
  BP_SHEET_KEYS,
  BP_SHEET_LABELS,
  BP_TARGET_MODULES,
  resolveStartupLineMeta,
} from './bpSheetMapping.js';

const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
const num = (v) => Number(v || 0) || 0;

function lineKey(row = {}) {
  return String(row.designation || row.label || row.name || '').trim().toLowerCase();
}

function enrichInvestmentLine(line = {}, ctx = {}) {
  const meta = resolveStartupLineMeta(line.categorie || line.category);
  const montantPrevu = num(line.total ?? line.montant_prevu ?? num(line.quantite) * num(line.prix_unitaire));
  const issueKey = `bp:${ctx.businessPlanId || 'plan'}:${ctx.source_bp_sheet || BP_SHEET_KEYS.DONNEES}:${lineKey(line)}`;
  return {
    ...line,
    nature: line.nature || meta.nature,
    module_source: line.module_source || BP_TARGET_MODULES.INVESTISSEMENTS,
    module_cible: line.module_cible || meta.module_cible,
    onglet_source: line.onglet_source || ctx.source_bp_sheet || BP_SHEET_KEYS.DONNEES,
    workflow_cible: line.workflow_cible || 'concretiser_bp_line',
    montant_prevu: montantPrevu,
    montant_engage: num(line.montant_engage),
    montant_paye: num(line.montant_paye ?? line.montant_reel),
    reste_a_realiser: Math.max(0, montantPrevu - num(line.montant_paye ?? line.montant_reel)),
    date_prevue: line.date_prevue || '',
    date_concretisation: line.date_concretisation || line.date_realisation || '',
    source_bp_sheet: ctx.source_bp_sheet || BP_SHEET_KEYS.DONNEES,
    source_bp_line: line.source_bp_line || lineKey(line),
    linked_record_id: line.linked_record_id || line.asset_id || line.linked_finance_transaction_id || '',
    issue_key: line.issue_key || issueKey,
    display_in_investissements: line.display_in_investissements ?? meta.display_in_investissements,
  };
}

function enrichRecurringCost(cost = {}, ctx = {}) {
  const montantPrevu = num(cost.montant_mensuel ?? cost.montant_prevu);
  return {
    ...cost,
    nature: cost.nature || ctx.nature,
    module_source: BP_TARGET_MODULES.INVESTISSEMENTS,
    module_cible: cost.module_cible || ctx.module_cible,
    onglet_source: ctx.source_bp_sheet || BP_SHEET_KEYS.HYPOTHESES,
    montant_prevu: montantPrevu,
    montant_engage: num(cost.montant_engage),
    montant_paye: num(cost.montant_paye ?? cost.montant_reel),
    reste_a_realiser: Math.max(0, montantPrevu - num(cost.montant_paye ?? cost.montant_reel)),
    source_bp_sheet: ctx.source_bp_sheet,
    source_bp_line: cost.source_bp_line || lineKey(cost),
    issue_key: cost.issue_key || `bp:${ctx.businessPlanId || 'plan'}:${ctx.source_bp_sheet}:${lineKey(cost)}`,
    display_in_investissements: false,
    frequence: cost.frequence || 'mensuelle',
  };
}

function enrichProjection(row = {}, ctx = {}) {
  return {
    ...row,
    nature: BP_LINE_NATURE.REVENU_PREVISIONNEL,
    module_cible: BP_TARGET_MODULES.OBJECTIFS_CROISSANCE,
    onglet_source: BP_SHEET_KEYS.PERIODICITE,
    source_bp_sheet: BP_SHEET_KEYS.PERIODICITE,
    display_in_investissements: false,
    issue_key: `bp:${ctx.businessPlanId || 'plan'}:m${row.mois_index}`,
  };
}

function enrichFunding(row = {}, ctx = {}) {
  return {
    id: row.id || makeId('BPFUND'),
    designation: row.designation || row.nom_source || row.label,
    nom_source: row.designation || row.nom_source,
    source_type: row.source_type || 'apport',
    montant: num(row.amount ?? row.montant),
    statut: row.statut || 'prevu',
    nature: BP_LINE_NATURE.FINANCEMENT,
    module_cible: BP_TARGET_MODULES.OBJECTIFS_CROISSANCE,
    onglet_source: BP_SHEET_KEYS.DONNEES,
    source_bp_sheet: BP_SHEET_KEYS.DONNEES,
    source_bp_line: lineKey(row),
    issue_key: `bp:${ctx.businessPlanId || 'plan'}:funding:${lineKey(row)}`,
    display_in_investissements: false,
    business_plan_id: ctx.businessPlanId,
  };
}

/**
 * Répartit le BP officiel (objet JS = transcription xlsx) vers payloads ERP.
 */
export function dispatchOfficialBpImport(businessPlanId = '', bp = HORIZON_FARM_OFFICIAL_BP) {
  const ctx = { businessPlanId, sourceDocument: bp.sourceDocument };

  const investmentLines = [
    ...bp.startupNeeds.lines.map((line) => enrichInvestmentLine({
      designation: line.designation,
      categorie: line.category,
      quantite: line.quantity,
      unite: line.unit,
      prix_unitaire: line.unitPrice,
      total: line.total,
      notes: line.needsBreakdown ? 'Forfait à ventiler si détail disponible.' : '',
    }, { ...ctx, source_bp_sheet: BP_SHEET_KEYS.DONNEES })),
    {
      ...enrichInvestmentLine({
        designation: 'Amortissement matériel amortissable (BP)',
        categorie: 'amortissement',
        quantite: 1,
        unite: 'forfait',
        prix_unitaire: bp.amortization.amortizableAmount,
        total: bp.amortization.amortizableAmount,
        nature: BP_LINE_NATURE.INVESTISSEMENT_AMORTISSABLE,
        module_cible: BP_TARGET_MODULES.INVESTISSEMENTS,
        display_in_investissements: true,
        notes: `Durée ${bp.amortization.years} ans · dotation A1 ${bp.amortization.annualDepreciation[0]} FCFA`,
      }, { ...ctx, source_bp_sheet: BP_SHEET_KEYS.DONNEES }),
    },
  ];

  const recurringCosts = [
    ...bp.variableCosts.lines.map((line) => enrichRecurringCost({
      designation: line.designation,
      categorie: line.category,
      montant_mensuel: line.monthly,
    }, { ...ctx, source_bp_sheet: BP_SHEET_KEYS.HYPOTHESES, nature: BP_LINE_NATURE.CHARGE_VARIABLE, module_cible: BP_TARGET_MODULES.FINANCE_PILOTAGE })),
    ...bp.fixedCosts.lines.map((line) => enrichRecurringCost({
      designation: line.designation,
      categorie: line.category,
      montant_mensuel: line.monthly,
    }, { ...ctx, source_bp_sheet: BP_SHEET_KEYS.HYPOTHESES, nature: BP_LINE_NATURE.CHARGE_FIXE, module_cible: BP_TARGET_MODULES.FINANCE_PILOTAGE })),
    ...bp.payroll.lines.map((line) => enrichRecurringCost({
      designation: line.designation,
      categorie: 'salaires',
      montant_mensuel: line.annual / 12,
    }, { ...ctx, source_bp_sheet: BP_SHEET_KEYS.HYPOTHESES, nature: BP_LINE_NATURE.SALAIRE, module_cible: BP_TARGET_MODULES.RH })),
  ];

  const revenueProjections = bp.revenue.monthly.map((row) => enrichProjection({
    mois_index: row.month,
    ca_estime: row.total,
    charges_estimees: 0,
    notes: `Œufs ${row.oeufs} · Chair ${row.chair} · Bovins ${row.bovins} · Fumiers ${row.fumierPondeuses + row.fumierChair + row.fumierBovins}`,
    ca_oeufs: row.oeufs,
    ca_chair: row.chair,
    ca_bovins: row.bovins,
    ca_fumier_pondeuses: row.fumierPondeuses,
    ca_fumier_chair: row.fumierChair,
    ca_fumier_bovins: row.fumierBovins,
  }, ctx));

  const fundingSources = bp.funding.lines.map((line) => enrichFunding({
    designation: line.designation,
    montant: line.amount,
    source_type: /pret|prêt|bnde/i.test(line.designation) ? 'emprunt' : /subvention/i.test(line.designation) ? 'subvention' : 'apport',
  }, ctx));

  const distributionSummary = {
    sheets: Object.values(BP_SHEET_KEYS).map((key) => ({
      key,
      label: BP_SHEET_LABELS[key],
      counts: {
        investmentLines: investmentLines.filter((l) => l.source_bp_sheet === key || (key === BP_SHEET_KEYS.DONNEES && l.source_bp_sheet === BP_SHEET_KEYS.DONNEES)).length,
        recurringCosts: recurringCosts.filter((c) => c.source_bp_sheet === key).length,
        revenueProjections: revenueProjections.filter((p) => p.source_bp_sheet === key).length,
      },
    })),
    routedTo: {
      [BP_TARGET_MODULES.INVESTISSEMENTS]: investmentLines.filter((l) => l.display_in_investissements !== false).length,
      [BP_TARGET_MODULES.FINANCE_PILOTAGE]: recurringCosts.filter((c) => c.module_cible === BP_TARGET_MODULES.FINANCE_PILOTAGE).length,
      [BP_TARGET_MODULES.RH]: recurringCosts.filter((c) => c.module_cible === BP_TARGET_MODULES.RH).length,
      [BP_TARGET_MODULES.OBJECTIFS_CROISSANCE]: revenueProjections.length + fundingSources.length,
    },
  };

  const planMetadata = {
    identite_projet: bp.identity,
    besoin_demarrage_total: bp.startupNeeds.officialTotal,
    financement_total: bp.funding.officialTotal,
    amortissement: bp.amortization,
    bfr: bp.workingCapital,
    resultat_previsionnel: bp.forecast.resultByYear,
    caf_previsionnelle: bp.forecast.cashFlowCapacityByYear,
    tresorerie_mensuelle_previsionnelle: bp.forecast.monthlyCashYear1,
    bp_distribution: distributionSummary,
    bp_import_version: '2.0',
    source_document: bp.sourceDocument,
  };

  const reportSnapshot = {
    nature: BP_LINE_NATURE.SYNTHESE_RAPPORT,
    module_cible: BP_TARGET_MODULES.DOCUMENTS,
    source_bp_sheet: BP_SHEET_KEYS.PLAN_IMPRIMABLE,
    read_only: true,
    title: 'Plan financier à imprimer — synthèse BP',
    forecast: bp.forecast,
    workingCapital: bp.workingCapital,
    revenueByYear: bp.revenue.annualByYear,
  };

  return {
    planMetadata,
    investmentLines,
    recurringCosts,
    revenueProjections,
    fundingSources,
    reportSnapshot,
    distributionSummary,
  };
}

/**
 * Parse un classeur xlsx BP — retourne les noms d'onglets détectés + métadonnées brutes.
 * La répartition ERP utilise dispatchOfficialBpImport() sur la source officielle JS
 * tant que le parsing cellule-à-cellule n'est pas branché sur ce fichier.
 */
export function parseBpExcelWorkbook(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames || [];
  const normalized = sheetNames.map((name) => name.trim().toLowerCase());
  const detect = (patterns) => sheetNames.find((_, i) => patterns.some((p) => normalized[i]?.includes(p)));

  return {
    sheetNames,
    detected: {
      hypotheses: detect(['hypoth', 'hypothe']),
      periodicite: detect(['period', 'périod', 'revenu']),
      donnees: detect(['donn', 'saisir']),
      plan: detect(['imprim', 'plan fin']),
    },
    rowCounts: Object.fromEntries(sheetNames.map((name) => {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: '' });
      return [name, rows.length];
    })),
    note: 'Import fichier : structure détectée. Répartition ERP via dispatchOfficialBpImport sur source officielle synchronisée.',
  };
}

export function buildBpImportFromExcel(arrayBuffer, businessPlanId = '') {
  const parsed = parseBpExcelWorkbook(arrayBuffer);
  const dispatched = dispatchOfficialBpImport(businessPlanId);
  return { parsed, ...dispatched };
}
