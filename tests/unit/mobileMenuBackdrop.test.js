import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/layouts/AppLayout.jsx', import.meta.url), 'utf8');

test('le bouton de fermeture mobile reste cliquable hors du tiroir', () => {
  assert.match(source, /aria-label="Fermer le menu"/);
  assert.match(source, /inset-y-0 left-80 right-0/);
  assert.doesNotMatch(source, /aria-label="Fermer le menu"[^>]*fixed inset-0/);
});
