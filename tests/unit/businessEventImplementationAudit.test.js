import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BUSINESS_EVENT_IDS } from '../../src/config/businessInterconnections.config.js';
import { BUSINESS_EVENT_IMPLEMENTATION_MATRIX } from '../../src/audit/businessEventImplementationMatrix.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const IMPACT_KEYS = ['stock', 'finance', 'commercial', 'tasks', 'alerts', 'documents', 'reporting'];

test('les 26 événements ont chacun un écran, un workflow et un test réels', () => {
  assert.deepEqual(BUSINESS_EVENT_IMPLEMENTATION_MATRIX.map((row) => row.id), BUSINESS_EVENT_IDS);
  assert.equal(new Set(BUSINESS_EVENT_IMPLEMENTATION_MATRIX.map((row) => row.id)).size, 26);

  BUSINESS_EVENT_IMPLEMENTATION_MATRIX.forEach((row) => {
    [row.screen, row.workflow, row.test].forEach((proof) => {
      const absolute = path.join(ROOT, proof.file);
      assert.equal(existsSync(absolute), true, `${row.id}: fichier absent ${proof.file}`);
      assert.match(readFileSync(absolute, 'utf8'), new RegExp(proof.marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${row.id}: marqueur absent ${proof.marker}`);
    });
    IMPACT_KEYS.forEach((key) => assert.ok(row.impacts[key], `${row.id}: impact ${key} non revu`));
    assert.equal(row.status, 'COMPLET', `${row.id}: implémentation encore partielle`);
    assert.ok(row.review.length >= 20, `${row.id}: validation métier non détaillée`);
  });
});

test('aucun événement n’est déclaré complet par configuration seule', () => {
  BUSINESS_EVENT_IMPLEMENTATION_MATRIX.forEach((row) => {
    assert.notEqual(row.screen.file, 'src/config/businessInterconnections.config.js');
    assert.notEqual(row.workflow.file, 'src/config/businessInterconnections.config.js');
    assert.match(row.screen.file, /^src\/(modules|components)\//);
    assert.match(row.workflow.file, /^src\/(utils|services)\//);
    assert.match(row.test.file, /^tests\//);
  });
});
