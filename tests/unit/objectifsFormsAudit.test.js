import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('ObjectifsSandboxTab — erreur campagne via toast', () => {
  const source = readFileSync(path.join(root, 'src/modules/objectifs/ObjectifsSandboxTab.jsx'), 'utf8');
  assert.match(source, /import toast from 'react-hot-toast'/);
  assert.match(source, /toast\.error/);
  assert.doesNotMatch(source, /console\.warn\('\[ObjectifsSandboxTab\] launch campaign'/);
});
