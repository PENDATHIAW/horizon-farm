import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dedupeProse,
  resolveClientDisplayName,
  isGenericEntityLabel,
} from '../../src/services/assistantEntityLabels.js';

test('dedupeProse removes repeated trend phrases', () => {
  const text = dedupeProse('Sur ce mois, en hausse en hausse, en hausse en hausse.');
  assert.doesNotMatch(text, /en hausse en hausse/i);
});

test('resolveClientDisplayName uses clients referential', () => {
  const name = resolveClientDisplayName(
    { id: 'HF-CMD-010', client_id: 'c1' },
    [{ id: 'c1', nom: 'Grossiste Dakar Œufs' }],
  );
  assert.equal(name, 'Grossiste Dakar Œufs');
});

test('resolveClientDisplayName avoids generic Client placeholder', () => {
  const name = resolveClientDisplayName(
    { id: 'HF-CMD-011', client_id: 'c9' },
    [{ id: 'c1', nom: 'Boutique Mbour Frais' }],
  );
  assert.doesNotMatch(name, /^Client$/i);
  assert.match(name, /HF-CMD-011|identifier/i);
});

test('isGenericEntityLabel flags placeholders', () => {
  assert.equal(isGenericEntityLabel('Client'), true);
  assert.equal(isGenericEntityLabel('Grossiste Dakar'), false);
});
