/**
 * Génère tests/fixtures/horizon-farm-bp-fixture.xlsx depuis HORIZON_FARM_OFFICIAL_BP.
 * Structure alignée sur le modèle Plan financier prévisionnel (4 onglets).
 */
import * as XLSX from 'xlsx';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HORIZON_FARM_OFFICIAL_BP } from '../src/services/horizonFarmOfficialBusinessPlan.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '../tests/fixtures/horizon-farm-bp-fixture.xlsx');
const bp = HORIZON_FARM_OFFICIAL_BP;

const hypothesesRows = [
  ['Hypothèses — HORIZON FARM'],
  [],
  ['CHARGES VARIABLES'],
  ['Désignation', 'Quantité', 'Prix unitaire', 'Mensuel', 'Annuel'],
  ...bp.variableCosts.lines.map((l) => [l.designation, l.quantity, l.unitPrice, l.monthly, l.annual]),
  ['Total charges variables', '', '', '', bp.variableCosts.workbookAnnualTotal],
  [],
  ['CHARGES FIXES'],
  ['Désignation', 'Mensuel', 'Annuel'],
  ...bp.fixedCosts.lines.map((l) => [l.designation, l.monthly, l.annual]),
  ['Total charges fixes', '', bp.fixedCosts.annualByYear[0]],
  [],
  ['SALAIRES'],
  ['Poste', 'Nombre', 'Salaire/mois', 'Annuel'],
  ...bp.payroll.lines.map((l) => [l.designation, l.people, l.monthlySalary, l.annual]),
  ['Total salaires', '', '', bp.payroll.annualTotal],
  [],
  ['CHIFFRE D\'AFFAIRES ANNUEL'],
  ['Activité', 'Quantité', 'Prix unitaire', 'CA annuel'],
  ...bp.revenue.byActivity.map((a) => [a.label, a.quantity, a.unitPrice, a.annual]),
  ['Total CA', '', '', bp.revenue.annualTotal],
];

const periodiciteRows = [
  ['Périodicité des sources de revenu'],
  ['Mois', 'Œufs', 'Chair', 'Bœufs', 'Fumier pondeuses', 'Fumier chair', 'Fumier bœufs', 'Total CA'],
  ...bp.revenue.monthly.map((m) => [
    `M${m.month}`, m.oeufs, m.chair, m.bovins, m.fumierPondeuses, m.fumierChair, m.fumierBovins, m.total,
  ]),
  ['Total', 36630000, 47520000, 35000000, 1800000, 600000, 270000, bp.revenue.annualTotal],
];

const donneesRows = [
  ['Données à saisir — HORIZON FARM'],
  ['Porteuse', bp.identity.ownerName],
  ['Projet', bp.identity.projectName],
  ['Statut juridique', bp.identity.legalStatus],
  ['Activité', bp.identity.activityType],
  ['Fiscalité', bp.identity.taxRegime],
  ['ACRE', bp.identity.acre ? 'Oui' : 'Non'],
  [],
  ['BESOINS DE DÉMARRAGE'],
  ['Désignation', 'Quantité', 'Unité', 'Prix unitaire', 'Total'],
  ...bp.startupNeeds.lines.map((l) => [l.designation, l.quantity, l.unit, l.unitPrice, l.total]),
  ['Total besoins de démarrage', '', '', '', bp.startupNeeds.officialTotal],
  [],
  ['FINANCEMENT'],
  ['Source', 'Montant'],
  ...bp.funding.lines.map((l) => [l.designation, l.amount]),
  ['Total ressources', bp.funding.officialTotal],
  [],
  ['AMORTISSEMENTS'],
  ['Durée amortissement', bp.amortization.years],
  ['Montant amortissable', bp.amortization.amortizableAmount],
  ['Dotation année 1', bp.amortization.annualDepreciation[0]],
  ['Dotation année 2', bp.amortization.annualDepreciation[1]],
  [],
  ['BFR'],
  ['Crédit client moyen', bp.workingCapital.clientCreditDays],
  ['Dette fournisseur moyenne', bp.workingCapital.supplierDebtDays],
  ...bp.workingCapital.bfrByYear.map((v, i) => [`BFR an ${i + 1}`, v]),
  [],
  ['RÉSULTAT PRÉVISIONNEL'],
  ...bp.forecast.resultByYear.map((v, i) => [`Résultat an ${i + 1}`, v]),
  ...bp.forecast.cashFlowCapacityByYear.map((v, i) => [`CAF an ${i + 1}`, v]),
];

const planRows = [
  ['Plan financier à imprimer'],
  ['RÉSULTAT ET CAF'],
  ['Ligne', 'A1', 'A2', 'A3', 'A4', 'A5'],
  ['Résultat de l\'exercice', ...bp.forecast.resultByYear],
  ['Capacité d\'autofinancement', ...bp.forecast.cashFlowCapacityByYear],
  [],
  ['TRÉSORERIE MENSUELLE ANNÉE 1'],
  ['Mois', 'Encaissements', 'Décaissements', 'Solde du mois', 'Cumul trésorerie'],
  ...bp.forecast.monthlyCashYear1.map((m) => [
    `M${m.month}`, m.receipts, m.disbursements, m.monthlyBalance, m.cumulativeCash,
  ]),
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hypothesesRows), 'Hypothèses');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(periodiciteRows), 'Périodicité des sources de reve');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(donneesRows), 'Données à saisir');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(planRows), 'Plan financier à imprimer');

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
console.log(`Fixture écrite : ${outPath}`);
