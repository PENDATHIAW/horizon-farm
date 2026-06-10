import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BP_LINE_STATUS, buildBpLineStatusPatch } from '../../src/utils/bpLineConcretization.js';
import {
  mergeBpInvestmentLineSync,
  mergeBpRecurringCostSync,
  tagExcelImportLines,
  lineHasExcelSource,
  countPreservedExcelLines,
} from '../../src/utils/bpSyncProtection.js';
import { buildBpImportFromExcel } from '../../src/services/bpImport/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, '../fixtures/horizon-farm-bp-fixture.xlsx');

test('import Excel taggue les lignes source', () => {
  const tagged = tagExcelImportLines([
    { designation: 'Abreuvoir 5L', montant_prevu: 250000 },
  ], 'mon-bp.xlsx');
  assert.equal(tagged[0].source_document, 'mon-bp.xlsx');
  assert.equal(tagged[0].source_preservation, 'excel');
  assert.ok(lineHasExcelSource(tagged[0]));
});

test('sync ne remplace pas les montants Excel existants', () => {
  const existing = {
    id: 'line-1',
    designation: 'Abreuvoir 5L',
    quantite: 50,
    prix_unitaire: 5000,
    montant_prevu: 250000,
    total: 250000,
    statut: BP_LINE_STATUS.A_CONCRETISER,
    source_document: 'mon-bp.xlsx',
    source_preservation: 'excel',
  };
  const official = {
    designation: 'Abreuvoir 5L',
    quantite: 50,
    prix_unitaire: 9999,
    montant_prevu: 499950,
    total: 499950,
  };
  const merged = mergeBpInvestmentLineSync(official, existing);
  assert.equal(merged.montant_prevu, 250000);
  assert.equal(merged.prix_unitaire, 5000);
  assert.equal(merged.source_document, 'mon-bp.xlsx');
});

test('sync préserve statut reporté / annulé', () => {
  const existing = {
    id: 'line-2',
    designation: 'Trésorerie départ',
    montant_prevu: 5000000,
    statut: BP_LINE_STATUS.REPORTE,
  };
  const merged = mergeBpInvestmentLineSync({ designation: 'Trésorerie départ', montant_prevu: 6000000 }, existing);
  assert.equal(merged.statut, BP_LINE_STATUS.REPORTE);
  assert.equal(merged.id, 'line-2');
});

test('reporter et annuler ne suppriment pas la ligne (patch statut)', () => {
  const line = { id: 'x1', designation: 'Test', statut: BP_LINE_STATUS.A_CONCRETISER };
  const postponed = buildBpLineStatusPatch(BP_LINE_STATUS.REPORTE);
  const cancelled = buildBpLineStatusPatch(BP_LINE_STATUS.ANNULE);
  assert.equal(postponed.statut, BP_LINE_STATUS.REPORTE);
  assert.equal(cancelled.statut, BP_LINE_STATUS.ANNULE);
  assert.ok(line.id);
});

test('buildBpImportFromExcel conserve sourceBp et lignes', () => {
  const buffer = readFileSync(fixturePath);
  const imported = buildBpImportFromExcel(buffer, 'BP-TEST', 'fixture.xlsx');
  assert.ok(imported.sourceBp);
  assert.ok(imported.investmentLines.length >= 10);
  assert.equal(imported.sourceBp.sourceDocument, 'fixture.xlsx');
});

test('tagExcelImport + merge conserve toutes les lignes source', () => {
  const buffer = readFileSync(fixturePath);
  const imported = buildBpImportFromExcel(buffer, 'BP-TEST', 'fixture.xlsx');
  const tagged = tagExcelImportLines(imported.investmentLines, 'fixture.xlsx');
  assert.equal(countPreservedExcelLines(tagged), tagged.length);
  const first = tagged[0];
  const merged = mergeBpInvestmentLineSync({ ...first, montant_prevu: 999999999 }, first);
  assert.equal(merged.montant_prevu, first.montant_prevu);
});

test('merge charge récurrente Excel préserve montant_mensuel', () => {
  const existing = {
    id: 'cost-1',
    designation: 'Loyer',
    montant_mensuel: 150000,
    source_document: 'bp.xlsx',
    source_preservation: 'excel',
  };
  const merged = mergeBpRecurringCostSync({ designation: 'Loyer', montant_mensuel: 200000 }, existing);
  assert.equal(merged.montant_mensuel, 150000);
});

test('fallback off-* ne remplace pas une ligne Excel en base', () => {
  const dbLine = {
    id: 'real-id-1',
    designation: '3000 pondeuses',
    montant_prevu: 12000000,
    source_document: 'bp.xlsx',
    source_preservation: 'excel',
  };
  const preview = { id: 'off-0', designation: '3000 pondeuses', montant_prevu: 10000000 };
  assert.notEqual(dbLine.id, preview.id);
  const merged = mergeBpInvestmentLineSync(preview, dbLine);
  assert.equal(merged.id, 'real-id-1');
  assert.equal(merged.montant_prevu, 12000000);
});
