import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatHorizonAnswer,
  formatStrategicHorizonAnswer,
  formatDraftAssistantText,
} from '../../src/services/assistantResponseFormatter.js';

test('formatHorizonAnswer follows Situation/Cause/Action/Source', () => {
  const text = formatHorizonAnswer({
    situation: 'Créances élevées.',
    cause: '3 factures dépassent 30 jours.',
    action: 'Relancer Hôtel Terminus aujourd\'hui.',
    sources: ['Finance → Créances'],
  });
  assert.match(text, /Situation :/);
  assert.match(text, /Créances élevées\./);
  assert.match(text, /Cause :/);
  assert.match(text, /Action :/);
  assert.match(text, /Source ERP : Finance → Créances/);
});

test('formatStrategicHorizonAnswer uses structured payload', () => {
  const text = formatStrategicHorizonAnswer({
    situation: 'Trésorerie positive.',
    cause: 'Encaissements récents.',
    action: 'Sécuriser les achats critiques.',
    sources: ['consolidateFinance().cashNet'],
  });
  assert.match(text, /Trésorerie positive\./);
  assert.match(text, /consolidateFinance\(\)\.cashNet/);
});

test('formatDraftAssistantText mentions validation', () => {
  const text = formatDraftAssistantText({
    ui: { title: 'Vente à valider' },
    draft_fields: { product_name: 'poulet', quantity: 10 },
  });
  assert.match(text, /Résumé détecté/);
  assert.match(text, /validez/i);
});
