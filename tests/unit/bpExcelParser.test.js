import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { HORIZON_FARM_OFFICIAL_BP } from '../../src/services/horizonFarmOfficialBusinessPlan.js';
import {
  buildBpImportFromExcel,
  dispatchOfficialBpImport,
  parseBpExcelWorkbookToOfficialBp,
} from '../../src/services/bpImport/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, '../fixtures/horizon-farm-bp-fixture.xlsx');

function loadFixture() {
  return readFileSync(fixturePath);
}

test('parseBpExcelWorkbookToOfficialBp détecte les 4 onglets', () => {
  const { bp, parsedMeta } = parseBpExcelWorkbookToOfficialBp(loadFixture(), 'horizon-farm-bp-fixture.xlsx');
  assert.ok(parsedMeta.detected.hypotheses);
  assert.ok(parsedMeta.detected.periodicite);
  assert.ok(parsedMeta.detected.donnees);
  assert.ok(parsedMeta.detected.plan);
  assert.equal(parsedMeta.parseVersion, '1.0');
  assert.ok(bp.startupNeeds.lines.length >= 15);
  assert.equal(bp.revenue.monthly.length, 12);
});

test('parse extrait les totaux clés du BP Horizon Farm', () => {
  const { bp } = parseBpExcelWorkbookToOfficialBp(loadFixture());
  assert.equal(bp.startupNeeds.officialTotal, HORIZON_FARM_OFFICIAL_BP.startupNeeds.officialTotal);
  assert.equal(bp.funding.officialTotal, HORIZON_FARM_OFFICIAL_BP.funding.officialTotal);
  assert.equal(bp.amortization.amortizableAmount, HORIZON_FARM_OFFICIAL_BP.amortization.amortizableAmount);
  assert.equal(bp.identity.projectName, HORIZON_FARM_OFFICIAL_BP.identity.projectName);
});

test('parse extrait les lignes de démarrage avec catégories', () => {
  const { bp } = parseBpExcelWorkbookToOfficialBp(loadFixture());
  const abreuvoir = bp.startupNeeds.lines.find((l) => l.designation.includes('Abreuvoir 5L'));
  assert.ok(abreuvoir);
  assert.equal(abreuvoir.total, 250000);
  assert.equal(abreuvoir.category, 'petit_materiel_avicole');
  const treso = bp.startupNeeds.lines.find((l) => l.designation.includes('Trésorerie'));
  assert.ok(treso);
  assert.equal(treso.category, 'tresorerie_depart');
});

test('buildBpImportFromExcel dispatch depuis le fichier parsé', () => {
  const official = dispatchOfficialBpImport('BP-OFFICIAL');
  const fromExcel = buildBpImportFromExcel(loadFixture(), 'BP-EXCEL', 'fixture.xlsx');
  assert.equal(fromExcel.investmentLines.length, official.investmentLines.length);
  assert.equal(fromExcel.recurringCosts.length, official.recurringCosts.length);
  assert.equal(fromExcel.revenueProjections.length, 12);
  assert.ok(fromExcel.sourceBp);
  assert.equal(fromExcel.sourceBp.sourceDocument, 'fixture.xlsx');
});

test('périodicité mensuelle parsée cohérente avec le BP officiel', () => {
  const { bp } = parseBpExcelWorkbookToOfficialBp(loadFixture());
  const m5Excel = bp.revenue.monthly.find((m) => m.month === 5);
  const m5Official = HORIZON_FARM_OFFICIAL_BP.revenue.monthly.find((m) => m.month === 5);
  assert.equal(m5Excel.total, m5Official.total);
  assert.equal(m5Excel.oeufs, m5Official.oeufs);
});
