/**
 * Parse cellule-à-cellule le classeur BP Horizon Farm (4 onglets).
 * Produit un objet compatible HORIZON_FARM_OFFICIAL_BP pour dispatchOfficialBpImport().
 */

import * as XLSX from 'xlsx';
import { HORIZON_FARM_OFFICIAL_BP } from '../horizonFarmOfficialBusinessPlan.js';

const norm = (v = '') => String(v ?? '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const parseNum = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v ?? '').replace(/\s/g, '').replace(/,/g, '.').replace(/[^\d.-]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const cellText = (grid, r, c) => {
  const row = grid[r];
  if (!row) return '';
  return row[c] ?? '';
};

const findSheet = (workbook, patterns = []) => {
  const names = workbook.SheetNames || [];
  const normalized = names.map((n) => norm(n));
  const idx = normalized.findIndex((n) => patterns.some((p) => n.includes(norm(p))));
  return idx >= 0 ? names[idx] : null;
};

const sheetGrid = (workbook, sheetName) => {
  if (!sheetName || !workbook.Sheets[sheetName]) return [];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', raw: true });
};

const findRow = (grid, patterns, from = 0) => {
  for (let r = from; r < grid.length; r += 1) {
    const line = norm(grid[r]?.map((c) => String(c ?? '')).join(' '));
    if (patterns.some((p) => line.includes(norm(p)))) return r;
  }
  return -1;
};

const rowText = (grid, r) => norm((grid[r] || []).map((c) => String(c ?? '')).join(' '));

const findLabelValue = (grid, labels = []) => {
  for (let r = 0; r < grid.length; r += 1) {
    const cells = grid[r] || [];
    for (let c = 0; c < cells.length; c += 1) {
      const label = norm(cells[c]);
      if (!label || !labels.some((l) => label.includes(norm(l)))) continue;
      for (let k = c + 1; k < cells.length; k += 1) {
        const val = String(cells[k] ?? '').trim();
        if (val) return val;
      }
    }
  }
  return '';
};

const findNumericAfterLabel = (grid, labels = []) => {
  for (let r = 0; r < grid.length; r += 1) {
    const cells = grid[r] || [];
    for (let c = 0; c < cells.length; c += 1) {
      const label = norm(cells[c]);
      if (!label || !labels.some((l) => label.includes(norm(l)))) continue;
      for (let k = c + 1; k < cells.length; k += 1) {
        const n = parseNum(cells[k]);
        if (n !== 0) return n;
      }
    }
  }
  return 0;
};

const HEADER_LABELS = new Set(['designation', 'libelle', 'poste', 'activite', 'source', 'charge', 'duree']);

const isHeaderRow = (grid, r) => {
  const line = rowText(grid, r);
  if ((line.includes('designation') || line.includes('libelle') || line.includes('poste'))
    && (line.includes('quant') || line.includes('prix') || line.includes('total') || line.includes('mensuel'))) return true;
  if (line.includes('poste') && (line.includes('nombre') || line.includes('salaire'))) return true;
  if (line.includes('activite') && line.includes('prix')) return true;
  if (line.includes('source') && line.includes('montant')) return true;
  return false;
};

const isDataHeaderLabel = (designation = '') => HEADER_LABELS.has(norm(designation));

const isTotalRow = (grid, r) => {
  const line = rowText(grid, r);
  return line.startsWith('total') || line.includes('total ') || line.includes(' somme ');
};

const isEmptyRow = (grid, r) => !(grid[r] || []).some((c) => String(c ?? '').trim());

const findColumn = (grid, headerRow, patterns, fallback = 0) => {
  const cells = grid[headerRow] || [];
  for (let c = 0; c < cells.length; c += 1) {
    const h = norm(cells[c]);
    if (patterns.some((p) => h.includes(norm(p)))) return c;
  }
  return fallback;
};

const extractTable = (grid, sectionPatterns, endPatterns = ['total']) => {
  const start = findRow(grid, sectionPatterns);
  if (start < 0) return [];
  let headerRow = start;
  for (let r = start; r < Math.min(start + 6, grid.length); r += 1) {
    if (isHeaderRow(grid, r)) { headerRow = r; break; }
  }
  const colLabel = findColumn(grid, headerRow, ['designation', 'libelle', 'poste', 'charge', 'activite', 'source'], 0);
  const colQty = findColumn(grid, headerRow, ['quant', 'qte', 'nombre', 'duree'], 1);
  const colUnit = findColumn(grid, headerRow, ['unite'], 2);
  const colPrice = findColumn(grid, headerRow, ['prix unit', 'pu ', 'prix/u'], 2);
  const colMonthly = findColumn(grid, headerRow, ['mensuel', '/mois'], 3);
  const colAnnual = findColumn(grid, headerRow, ['annuel', 'annee', 'an '], 4);
  const colTotal = findColumn(grid, headerRow, ['total', 'montant'], 5);

  const rows = [];
  for (let r = headerRow + 1; r < grid.length; r += 1) {
    if (isEmptyRow(grid, r)) continue;
    const line = rowText(grid, r);
    if (endPatterns.some((p) => line.includes(norm(p)) && line.includes('total'))) break;
    if (isTotalRow(grid, r)) break;
    const designation = String(cellText(grid, r, colLabel) ?? '').trim();
    if (!designation || norm(designation).length < 2) continue;
    if (isDataHeaderLabel(designation)) continue;
    if (norm(designation).includes('section')) continue;

    const quantity = parseNum(cellText(grid, r, colQty));
    const unit = String(cellText(grid, r, colUnit) ?? '').trim();
    const unitPrice = parseNum(cellText(grid, r, colPrice));
    const monthly = parseNum(cellText(grid, r, colMonthly));
    const annual = parseNum(cellText(grid, r, colAnnual));
    const total = parseNum(cellText(grid, r, colTotal)) || (quantity && unitPrice ? quantity * unitPrice : 0);

    rows.push({ designation, quantity, unit, unitPrice, monthly, annual, total, rowIndex: r });
  }
  return rows;
};

const OFFICIAL_CATEGORY_BY_DESIGNATION = Object.fromEntries(
  HORIZON_FARM_OFFICIAL_BP.startupNeeds.lines.map((l) => [norm(l.designation), l.category]),
);

const OFFICIAL_VARIABLE_CATEGORY = Object.fromEntries(
  HORIZON_FARM_OFFICIAL_BP.variableCosts.lines.map((l) => [norm(l.designation), l.category]),
);

const OFFICIAL_FIXED_CATEGORY = Object.fromEntries(
  HORIZON_FARM_OFFICIAL_BP.fixedCosts.lines.map((l) => [norm(l.designation), l.category]),
);

function inferStartupCategory(designation = '') {
  const key = norm(designation);
  if (OFFICIAL_CATEGORY_BY_DESIGNATION[key]) return OFFICIAL_CATEGORY_BY_DESIGNATION[key];
  if (key.includes('tresorerie') && key.includes('depart')) return 'tresorerie_depart';
  if (key.includes('stock') && (key.includes('matiere') || key.includes('produit') || key.includes('depart'))) return 'stock_depart';
  if (key.includes('poussin') && key.includes('pondeuse')) return 'cheptel_pondeuses';
  if (key.includes('abreuvoir') && key.includes('bovin')) return 'materiel_bovins';
  if (key.includes('abreuvoir')) return 'petit_materiel_avicole';
  if (key.includes('radiant')) return 'materiel_chair';
  if (key.includes('botte') || key.includes('combinaison')) return 'epi';
  if (key.includes('lasso')) return 'materiel_bovins';
  if (key.includes('papier')) return 'administratif';
  if (key.includes('mangeoire')) return 'petit_materiel_avicole';
  if (key.includes('bache')) return 'petit_materiel_avicole';
  if (key.includes('plateau')) return 'petit_materiel_avicole';
  return 'besoin_demarrage';
}

function inferVariableCategory(designation = '') {
  const key = norm(designation);
  if (OFFICIAL_VARIABLE_CATEGORY[key]) return OFFICIAL_VARIABLE_CATEGORY[key];
  if (key.includes('vaccin') || key.includes('prophylax')) return 'sante';
  if (key.includes('aliment') && key.includes('pondeuse')) return 'alimentation_pondeuses';
  if (key.includes('aliment') && key.includes('chair')) return 'alimentation_chair';
  if (key.includes('aliment') && (key.includes('boeuf') || key.includes('bovin'))) return 'alimentation_bovins';
  if (key.includes('emballage') || key.includes('oeuf')) return 'emballages_oeufs';
  if (key.includes('boeuf') || key.includes('bovin')) return 'achat_bovins';
  if (key.includes('carton') && key.includes('poussin')) return 'poussins_chair';
  if (key.includes('gaz')) return 'gaz';
  if (key.includes('litiere')) return 'litiere';
  return 'charge_variable';
}

function inferFixedCategory(designation = '') {
  const key = norm(designation);
  if (OFFICIAL_FIXED_CATEGORY[key]) return OFFICIAL_FIXED_CATEGORY[key];
  if (key.includes('loyer') && key.includes('pondeuse')) return 'loyer_pondeuses';
  if (key.includes('loyer') && key.includes('chair')) return 'loyer_chair';
  if (key.includes('loyer') && (key.includes('boeuf') || key.includes('bovin'))) return 'loyer_bovins';
  if (key.includes('provision')) return 'provisions';
  if (key.includes('nettoyage') || key.includes('entretien')) return 'entretien';
  return 'charge_fixe';
}

function parseIdentity(grid) {
  const ownerName = findLabelValue(grid, ['porteuse', 'porteur', 'nom', 'dirigeant']) || HORIZON_FARM_OFFICIAL_BP.identity.ownerName;
  const projectName = findLabelValue(grid, ['projet', 'nom du projet', 'entreprise']) || HORIZON_FARM_OFFICIAL_BP.identity.projectName;
  const legalStatus = findLabelValue(grid, ['statut juridique', 'forme juridique']) || HORIZON_FARM_OFFICIAL_BP.identity.legalStatus;
  const activityType = findLabelValue(grid, ['activite', 'type activite']) || HORIZON_FARM_OFFICIAL_BP.identity.activityType;
  const taxRegime = findLabelValue(grid, ['fiscalite', 'impot', 'regime fiscal']) || HORIZON_FARM_OFFICIAL_BP.identity.taxRegime;
  const acreRaw = findLabelValue(grid, ['acre']);
  const acre = /oui|yes|true|1/i.test(acreRaw);
  return { projectName, ownerName, legalStatus, activityType, acre, taxRegime };
}

function parseStartupNeeds(grid) {
  const rows = extractTable(grid, ['besoins de demarrage', 'besoin de demarrage', 'investissements de demarrage']);
  const lines = rows.map((row) => {
    const category = inferStartupCategory(row.designation);
    const total = row.total || (row.quantity * row.unitPrice);
    return {
      designation: row.designation,
      category,
      quantity: row.quantity || 1,
      unit: row.unit || 'forfait',
      unitPrice: row.unitPrice || total,
      total,
      needsBreakdown: category === 'stock_depart',
    };
  });
  const officialTotal = findNumericAfterLabel(grid, ['total besoins', 'total des besoins', 'besoins de demarrage total'])
    || lines.reduce((s, l) => s + l.total, 0);
  return { officialTotal, lines };
}

function parseFunding(grid) {
  const rows = extractTable(grid, ['financement', 'ressources', 'apports', 'plan de financement']);
  const lines = rows
    .filter((row) => !norm(row.designation).includes('ecart') && !norm(row.designation).startsWith('total ressources'))
    .map((row) => ({
      designation: row.designation,
      amount: row.total || row.annual || row.monthly || row.unitPrice,
    }));
  const officialTotal = findNumericAfterLabel(grid, ['total ressources', 'total financement'])
    || lines.reduce((s, l) => s + l.amount, 0);
  return { officialTotal, lines: lines.length ? lines : HORIZON_FARM_OFFICIAL_BP.funding.lines };
}

function parseAmortization(grid) {
  const years = findNumericAfterLabel(grid, ['duree amortissement', 'amortissement sur']) || HORIZON_FARM_OFFICIAL_BP.amortization.years;
  const amortizableAmount = findNumericAfterLabel(grid, ['montant amortissable', 'base amortissable']) || HORIZON_FARM_OFFICIAL_BP.amortization.amortizableAmount;
  const annualDepreciation = [];
  for (let y = 1; y <= 5; y += 1) {
    const val = findNumericAfterLabel(grid, [`dotation annee ${y}`, `dotation année ${y}`, `amortissement an ${y}`, `an ${y}`]);
    if (val) annualDepreciation[y - 1] = val;
  }
  if (!annualDepreciation.length) {
    const perYear = years ? amortizableAmount / years : 0;
    for (let i = 0; i < 5; i += 1) annualDepreciation[i] = i < years ? perYear : 0;
  }
  return { years, amortizableAmount, annualDepreciation };
}

function parseVariableCosts(grid) {
  const rows = extractTable(grid, ['charges variables', 'cout variable', 'couts variables']);
  const lines = rows.map((row) => {
    const monthly = row.monthly || (row.annual ? row.annual / 12 : 0);
    const annual = row.annual || monthly * 12;
    return {
      designation: row.designation,
      category: inferVariableCategory(row.designation),
      quantity: row.quantity || 1,
      unitPrice: row.unitPrice || monthly,
      monthly,
      annual,
      corrected: norm(row.designation).includes('carton') && norm(row.designation).includes('poussin'),
    };
  });
  const workbookAnnualTotal = lines.reduce((s, l) => s + l.annual, 0);
  return {
    workbookAnnualTotal,
    correctedAnnualTotal: workbookAnnualTotal,
    correctionReason: '',
    lines: lines.length ? lines : HORIZON_FARM_OFFICIAL_BP.variableCosts.lines,
  };
}

function parseFixedCosts(grid) {
  const rows = extractTable(grid, ['charges fixes', 'cout fixe', 'couts fixes']);
  const lines = rows
    .filter((row) => !norm(row.designation).includes('loyer total'))
    .map((row) => ({
      designation: row.designation,
      category: inferFixedCategory(row.designation),
      monthly: row.monthly || (row.annual ? row.annual / 12 : row.total),
      annual: row.annual || (row.monthly ? row.monthly * 12 : row.total),
    }));
  const annualByYear = [lines.reduce((s, l) => s + l.annual, 0)];
  for (let i = 1; i < 5; i += 1) annualByYear[i] = Math.round(annualByYear[0] * (1 + 0.1 * i));
  return { annualByYear, lines: lines.length ? lines : HORIZON_FARM_OFFICIAL_BP.fixedCosts.lines };
}

function parsePayroll(grid) {
  const rows = extractTable(grid, ['salaires', 'remuneration', 'masse salariale']);
  const lines = rows
    .filter((row) => !norm(row.designation).includes('total'))
    .map((row) => {
      const people = row.quantity || 1;
      const monthlySalary = row.monthly || row.unitPrice || (row.annual ? row.annual / 12 : 0);
      const annual = row.annual || monthlySalary * 12 * people;
      return { designation: row.designation, people, monthlySalary, annual };
    });
  const annualTotal = lines.reduce((s, l) => s + l.annual, 0);
  return {
    annualTotal,
    lines: lines.length ? lines : HORIZON_FARM_OFFICIAL_BP.payroll.lines,
    salariesByYear: HORIZON_FARM_OFFICIAL_BP.payroll.salariesByYear,
    ownerCompensationByYear: HORIZON_FARM_OFFICIAL_BP.payroll.ownerCompensationByYear,
    socialChargesEmployeesByYear: HORIZON_FARM_OFFICIAL_BP.payroll.socialChargesEmployeesByYear,
    socialChargesOwnerByYear: HORIZON_FARM_OFFICIAL_BP.payroll.socialChargesOwnerByYear,
  };
}

function parseRevenueByActivity(grid) {
  const rows = extractTable(grid, ['chiffre d affaires', 'revenus annuels', 'ca annuel', 'sources de revenu']);
  const activityMap = [
    { patterns: ['oeuf', 'tablette'], activity: 'oeufs', label: 'Tablettes de 30 œufs' },
    { patterns: ['chair', 'poulet'], activity: 'poulets_chair', label: 'Poulets de chair' },
    { patterns: ['boeuf', 'bovin'], activity: 'bovins', label: 'Bœufs' },
    { patterns: ['fumier', 'pondeuse'], activity: 'fumier_pondeuses', label: 'Fumier pondeuses' },
    { patterns: ['fumier', 'chair'], activity: 'fumier_chair', label: 'Fumier chair' },
    { patterns: ['fumier', 'boeuf', 'bovin'], activity: 'fumier_bovins', label: 'Fumier bœufs' },
  ];
  const byActivity = rows.map((row) => {
    const d = norm(row.designation);
    const match = activityMap.find(({ patterns }) => patterns.every((p) => d.includes(p)) || patterns.some((p) => d.includes(p)));
    const annual = row.annual || row.total || (row.quantity * row.unitPrice);
    return {
      activity: match?.activity || 'autre',
      label: row.designation,
      quantity: row.quantity || 0,
      unitPrice: row.unitPrice || 0,
      annual,
    };
  }).filter((r) => r.annual > 0);
  const annualTotal = byActivity.reduce((s, r) => s + r.annual, 0);
  return {
    annualTotal: annualTotal || HORIZON_FARM_OFFICIAL_BP.revenue.annualTotal,
    byActivity: byActivity.length ? byActivity : HORIZON_FARM_OFFICIAL_BP.revenue.byActivity,
    annualByYear: HORIZON_FARM_OFFICIAL_BP.revenue.annualByYear,
  };
}

function parsePeriodicite(grid) {
  const headerRow = findRow(grid, ['mois', 'periode', 'periode']);
  if (headerRow < 0) return HORIZON_FARM_OFFICIAL_BP.revenue.monthly;

  const colMonth = findColumn(grid, headerRow, ['mois', 'periode'], 0);
  const colOeufs = findColumn(grid, headerRow, ['oeuf', 'tablette'], 1);
  const colChair = findColumn(grid, headerRow, ['chair', 'poulet'], 2);
  const colBovins = findColumn(grid, headerRow, ['boeuf', 'bovin'], 3);
  const colFumierP = findColumn(grid, headerRow, ['fumier pondeuse', 'fumier pon'], 4);
  const colFumierC = findColumn(grid, headerRow, ['fumier chair'], 5);
  const colFumierB = findColumn(grid, headerRow, ['fumier bovin', 'fumier boeuf'], 6);
  const colTotal = findColumn(grid, headerRow, ['total'], 7);

  const monthly = [];
  for (let r = headerRow + 1; r < grid.length; r += 1) {
    const monthRaw = cellText(grid, r, colMonth);
    const monthMatch = String(monthRaw).match(/\d+/);
    const month = monthMatch ? Number(monthMatch[0]) : monthly.length + 1;
    if (month < 1 || month > 12) {
      if (isTotalRow(grid, r)) break;
      continue;
    }
    const oeufs = parseNum(cellText(grid, r, colOeufs));
    const chair = parseNum(cellText(grid, r, colChair));
    const bovins = parseNum(cellText(grid, r, colBovins));
    const fumierPondeuses = parseNum(cellText(grid, r, colFumierP));
    const fumierChair = parseNum(cellText(grid, r, colFumierC));
    const fumierBovins = parseNum(cellText(grid, r, colFumierB));
    const total = parseNum(cellText(grid, r, colTotal)) || oeufs + chair + bovins + fumierPondeuses + fumierChair + fumierBovins;
    if (!total && !oeufs && !chair && !bovins) continue;
    monthly.push({ month, oeufs, chair, bovins, fumierPondeuses, fumierChair, fumierBovins, total });
    if (monthly.length >= 12) break;
  }
  return monthly.length >= 12 ? monthly : HORIZON_FARM_OFFICIAL_BP.revenue.monthly;
}

function parseWorkingCapital(grid) {
  const clientCreditDays = findNumericAfterLabel(grid, ['credit client', 'delai client']) || HORIZON_FARM_OFFICIAL_BP.workingCapital.clientCreditDays;
  const supplierDebtDays = findNumericAfterLabel(grid, ['dette fournisseur', 'delai fournisseur']) || HORIZON_FARM_OFFICIAL_BP.workingCapital.supplierDebtDays;
  const bfrByYear = [];
  for (let y = 1; y <= 5; y += 1) {
    const val = findNumericAfterLabel(grid, [`bfr an ${y}`, `bfr année ${y}`, `besoin fonds roulement an ${y}`]);
    if (val) bfrByYear[y - 1] = val;
  }
  return {
    clientCreditDays,
    supplierDebtDays,
    bfrByYear: bfrByYear.length ? bfrByYear : HORIZON_FARM_OFFICIAL_BP.workingCapital.bfrByYear,
  };
}

function parseForecast(planGrid, donneesGrid) {
  const resultByYear = [];
  const cashFlowCapacityByYear = [];
  for (let y = 1; y <= 5; y += 1) {
    const result = findNumericAfterLabel(planGrid, [`resultat an ${y}`, `resultat exercice an ${y}`, `resultat de l exercice an ${y}`])
      || findNumericAfterLabel(donneesGrid, [`resultat an ${y}`, `resultat année ${y}`]);
    const caf = findNumericAfterLabel(planGrid, [`caf an ${y}`, `capacite autofinancement an ${y}`])
      || findNumericAfterLabel(donneesGrid, [`caf an ${y}`]);
    if (result) resultByYear[y - 1] = result;
    if (caf) cashFlowCapacityByYear[y - 1] = caf;
  }

  const monthlyCashYear1 = [];
  const cashHeader = findRow(planGrid, ['encaissement', 'decaissement', 'tresorerie mensuelle', 'flux tresorerie']);
  if (cashHeader >= 0) {
    const colMonth = findColumn(planGrid, cashHeader, ['mois'], 0);
    const colReceipts = findColumn(planGrid, cashHeader, ['encaissement', 'recette'], 1);
    const colDisburse = findColumn(planGrid, cashHeader, ['decaissement', 'depense'], 2);
    const colBalance = findColumn(planGrid, cashHeader, ['solde du mois', 'solde mensuel'], 3);
    const colCumul = findColumn(planGrid, cashHeader, ['cumul', 'cumulative'], 4);
    for (let r = cashHeader + 1; r < planGrid.length; r += 1) {
      const monthMatch = String(cellText(planGrid, r, colMonth)).match(/\d+/);
      const month = monthMatch ? Number(monthMatch[0]) : monthlyCashYear1.length + 1;
      if (month < 1 || month > 12) { if (isTotalRow(planGrid, r)) break; continue; }
      const receipts = parseNum(cellText(planGrid, r, colReceipts));
      const disbursements = parseNum(cellText(planGrid, r, colDisburse));
      const monthlyBalance = parseNum(cellText(planGrid, r, colBalance)) || receipts - disbursements;
      const cumulativeCash = parseNum(cellText(planGrid, r, colCumul));
      if (!receipts && !disbursements) continue;
      monthlyCashYear1.push({ month, receipts, disbursements, monthlyBalance, cumulativeCash });
      if (monthlyCashYear1.length >= 12) break;
    }
  }

  return {
    resultByYear: resultByYear.length ? resultByYear : HORIZON_FARM_OFFICIAL_BP.forecast.resultByYear,
    cashFlowCapacityByYear: cashFlowCapacityByYear.length ? cashFlowCapacityByYear : HORIZON_FARM_OFFICIAL_BP.forecast.cashFlowCapacityByYear,
    monthlyCashYear1: monthlyCashYear1.length >= 12 ? monthlyCashYear1 : HORIZON_FARM_OFFICIAL_BP.forecast.monthlyCashYear1,
  };
}

/**
 * Parse le classeur xlsx et retourne un objet BP + métadonnées de détection.
 */
export function parseBpExcelWorkbookToOfficialBp(arrayBuffer, fileName = '') {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames || [];

  const hypothesesName = findSheet(workbook, ['hypoth', 'hypothe']);
  const periodiciteName = findSheet(workbook, ['period', 'périod', 'revenu']);
  const donneesName = findSheet(workbook, ['donn', 'saisir']);
  const planName = findSheet(workbook, ['imprim', 'plan fin']);

  const hypothesesGrid = sheetGrid(workbook, hypothesesName);
  const periodiciteGrid = sheetGrid(workbook, periodiciteName);
  const donneesGrid = sheetGrid(workbook, donneesName);
  const planGrid = sheetGrid(workbook, planName);

  const identity = parseIdentity(donneesGrid.length ? donneesGrid : hypothesesGrid);
  const startupNeeds = parseStartupNeeds(donneesGrid.length ? donneesGrid : hypothesesGrid);
  const funding = parseFunding(donneesGrid);
  const amortization = parseAmortization(donneesGrid);
  const variableCosts = parseVariableCosts(hypothesesGrid);
  const fixedCosts = parseFixedCosts(hypothesesGrid.length ? hypothesesGrid : donneesGrid);
  const payroll = parsePayroll(hypothesesGrid.length ? hypothesesGrid : donneesGrid);
  const revenuePartial = parseRevenueByActivity(hypothesesGrid);
  const monthly = parsePeriodicite(periodiciteGrid);
  const workingCapital = parseWorkingCapital(donneesGrid.length ? donneesGrid : planGrid);
  const forecast = parseForecast(planGrid, donneesGrid);

  const bp = {
    sourceDocument: fileName || 'import-xlsx',
    identity,
    startupNeeds,
    funding,
    amortization,
    variableCosts,
    fixedCosts,
    payroll,
    revenue: {
      ...revenuePartial,
      monthly,
    },
    workingCapital,
    forecast,
    operatingStrategy: HORIZON_FARM_OFFICIAL_BP.operatingStrategy,
    integrationWarnings: [
      ...(HORIZON_FARM_OFFICIAL_BP.integrationWarnings || []),
      ...(startupNeeds.lines.length < 5 ? ['Peu de lignes besoins de démarrage détectées - vérifier l’onglet Données à saisir.'] : []),
      ...(monthly.length < 12 ? ['Périodicité mensuelle incomplète - vérifier l’onglet Périodicité.'] : []),
    ],
  };

  const parsedMeta = {
    sheetNames,
    detected: {
      hypotheses: hypothesesName,
      periodicite: periodiciteName,
      donnees: donneesName,
      plan: planName,
    },
    rowCounts: Object.fromEntries(sheetNames.map((name) => {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: '' });
      return [name, rows.length];
    })),
    counts: {
      startupLines: startupNeeds.lines.length,
      fundingLines: funding.lines.length,
      variableCosts: variableCosts.lines.length,
      fixedCosts: fixedCosts.lines.length,
      payrollLines: payroll.lines.length,
      revenueMonths: monthly.length,
    },
    parseVersion: '1.0',
  };

  return { bp, parsedMeta };
}

export default parseBpExcelWorkbookToOfficialBp;
