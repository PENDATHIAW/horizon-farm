import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('phases futures — no operational module or centre action is exposed', () => {
  assert.equal(existsSync('src/modules/BoviniaModule.jsx'), false);
  assert.equal(existsSync('src/modules/TallowModule.jsx'), false);

  const greenpreneursMetrics = readFileSync('src/services/greenpreneurs/greenpreneursMetrics.js', 'utf8');
  assert.doesNotMatch(greenpreneursMetrics, /gp-tallow/);
  assert.doesNotMatch(greenpreneursMetrics, /phase3_bovinia.*alerts\.push/s);

  const readiness = readFileSync('src/services/greenpreneurs/valorisationReadinessEngine.js', 'utf8');
  assert.doesNotMatch(readiness, /Créer tâche|Créer opportunité|Créer document/);
  assert.match(readiness, /Critère futur/);
});
