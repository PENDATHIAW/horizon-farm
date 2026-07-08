import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const srcRoot = path.join(root, 'src');

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (/\.(jsx?|tsx?)$/.test(entry)) files.push(full);
  }
  return files;
}

test('src — aucun window.prompt restant', () => {
  const offenders = [];
  for (const file of walk(srcRoot)) {
    const source = readFileSync(file, 'utf8');
    if (source.includes('window.prompt')) offenders.push(path.relative(root, file));
  }
  assert.deepEqual(offenders, []);
});

test('QuickInputModal — composant partagé présent', () => {
  const source = readFileSync(path.join(srcRoot, 'components/QuickInputModal.jsx'), 'utf8');
  assert.match(source, /BaseModal/);
  assert.match(source, /type === 'textarea'/);
  assert.match(source, /type === 'select'/);
});

test('CommercialDeliveriesPanel — utilise QuickInputModal', () => {
  const source = readFileSync(path.join(srcRoot, 'modules/commercial/CommercialDeliveriesPanel.jsx'), 'utf8');
  assert.match(source, /QuickInputModal/);
  assert.doesNotMatch(source, /window\.prompt/);
});

test('BpWizard — documenté comme orphelin', () => {
  const source = readFileSync(path.join(srcRoot, 'modules/BpWizard.jsx'), 'utf8');
  assert.match(source, /non monté/);
});
