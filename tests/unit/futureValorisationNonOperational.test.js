import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const sourceFiles = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  if (entry.isDirectory()) return sourceFiles(target);
  return /\.(?:js|jsx|mjs|html|json)$/.test(entry.name) ? [target] : [];
});

test('les anciennes marques ne sont présentes dans aucun chemin opérationnel', () => {
  assert.equal(existsSync('src/modules/BoviniaModule.jsx'), false);
  assert.equal(existsSync('src/modules/TallowModule.jsx'), false);
  assert.equal(existsSync('src/services/greenpreneurs/valorisationReadinessEngine.js'), false);
  assert.equal(existsSync('src/services/greenpreneurs/bovinCoproductWorkflow.js'), false);
  assert.equal(existsSync('src/components/greenpreneurs/ValorisationPhaseAdvisor.jsx'), false);

  const operationalFiles = [
    ...sourceFiles('src'),
    ...sourceFiles('scripts'),
    ...sourceFiles('public/demo'),
    'package.json',
  ];
  const forbidden = /\b(?:BOVINIA|Tallow(?:\s*&\s*Go)?)\b/i;
  const matches = operationalFiles.filter((file) => forbidden.test(readFileSync(file, 'utf8')));
  assert.deepEqual(matches, []);
});
