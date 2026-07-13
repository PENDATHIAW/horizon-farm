import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const source = readFileSync(join(root, 'src/context/AuthContext.jsx'), 'utf8');

test('l’aperçu local est limité au mode développement et à ?demo=1', () => {
  assert.match(source, /import\.meta\.env\.DEV/);
  assert.match(source, /get\('demo'\) === '1'/);
  assert.doesNotMatch(source, /VITE_[A-Z_]*BYPASS/);
});
