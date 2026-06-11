import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TABLE_CANONICAL_TRUTHS,
  WORKFLOW_CANONICAL_MATRIX,
  EVENT_AUDIT_SUMMARY,
  KPI_DUPLICATION_HOTSPOTS,
  DEAD_COMPONENTS,
  ARCHITECTURE_SCORES,
  getCanonicalTruth,
  getCanonicalWorkflow,
} from '../../src/audit/canonicalArchitectureRegistry.js';

test('TABLE_CANONICAL_TRUTHS couvre les domaines métier clés', () => {
  const donnees = TABLE_CANONICAL_TRUTHS.map((r) => r.donnee.toLowerCase());
  assert.ok(donnees.some((d) => d.includes('ca')));
  assert.ok(donnees.some((d) => d.includes('marge')));
  assert.ok(donnees.some((d) => d.includes('trésorerie') || d.includes('tresorerie')));
  assert.ok(donnees.some((d) => d.includes('créance') || d.includes('creance')));
  assert.ok(donnees.some((d) => d.includes('stock')));
  assert.ok(donnees.some((d) => d.includes('mortalité') || d.includes('mortalite')));
  assert.ok(donnees.some((d) => d.includes('rentabilité') || d.includes('rentabilite')));
});

test('WORKFLOW_CANONICAL_MATRIX distingue canonical et legacy vente', () => {
  const commercial = getCanonicalWorkflow('commitCommercialSale');
  const legacy = getCanonicalWorkflow('commitSaleWorkflow');
  assert.equal(commercial.role, 'canonical');
  assert.equal(legacy.role, 'legacy');
});

test('getCanonicalTruth retrouve créances ERP', () => {
  const row = getCanonicalTruth('créances');
  assert.ok(row);
  assert.equal(row.sourceCanonique, 'consolidateFinance');
  assert.equal(row.champ, 'creancesReelles');
});

test('EVENT_AUDIT_SUMMARY liste garde-fous idempotence', () => {
  assert.ok(EVENT_AUDIT_SUMMARY.dedupeGuards.length >= 4);
  assert.ok(EVENT_AUDIT_SUMMARY.auditEngine.includes('erpTransversalAudit'));
});

test('scores architecture après >= avant', () => {
  assert.ok(ARCHITECTURE_SCORES.apres.global >= ARCHITECTURE_SCORES.avant.global);
  assert.ok(KPI_DUPLICATION_HOTSPOTS.length >= 4);
  assert.ok(DEAD_COMPONENTS.length >= 4);
  assert.ok(WORKFLOW_CANONICAL_MATRIX.filter((w) => w.role === 'canonical').length >= 5);
});
