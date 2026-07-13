import test from 'node:test';
import assert from 'node:assert/strict';
import { applyInvestorRoomDefaults } from '../../src/services/investorForums/investorRoomDefaults.js';

test('applyInvestorRoomDefaults normalise why_invest string corrompu', () => {
  const normalized = applyInvestorRoomDefaults({ why_invest: 'texte invalide' });
  assert.ok(Array.isArray(normalized.why_invest));
  assert.ok(normalized.why_invest.length > 0);
});

test('applyInvestorRoomDefaults normalise une timeline incomplète', () => {
  const normalized = applyInvestorRoomDefaults({ timeline: [{ year: '2026' }] });
  assert.ok(Array.isArray(normalized.timeline));
  assert.ok(normalized.timeline.length > 0);
});
