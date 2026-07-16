import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMarketEvents } from '../../src/services/growthDecisionEngine.js';
import {
  buildStrategicDecisionPlan,
  validateCycleBfrCoverage,
} from '../../src/services/strategicDecisionEngine.js';

test('un compte réel vide ne déclenche pas un faux blocage de trésorerie', () => {
  const bfr = validateCycleBfrCoverage({}, {});
  assert.equal(bfr.evaluable, false);
  assert.equal(bfr.blocked, false);
  assert.equal(bfr.coveragePct, null);

  const plan = buildStrategicDecisionPlan({}, { referenceDate: '2026-07-16' });
  assert.equal(plan.bfr.blocked, false);
  assert.equal(plan.recommendations.some((item) => item.id === 'bfr-block'), false);
});

test('le BFR est calculé dès que la prochaine bande est configurée', () => {
  const bfr = validateCycleBfrCoverage({
    growth_settings: { pilotage_configured: true, next_band_size: 500 },
  });

  assert.equal(bfr.evaluable, true);
  assert.equal(bfr.plannedHeadcount, 500);
  assert.equal(bfr.blocked, true);
  assert.equal(Number.isFinite(bfr.coveragePct), true);
});

test('une ancienne date manuelle de Tabaski ne masque pas la prochaine occurrence', () => {
  const reference = new Date('2026-07-16T12:00:00Z');
  const events = buildMarketEvents(reference, {
    market_calendar_events: [
      { id: 'TABASKI-2026', label: 'Tabaski', date: '2026-05-27' },
    ],
  });

  assert.equal(events.some((event) => event.id === 'TABASKI-2026'), false);
  assert.equal(events.some((event) => event.key === 'tabaski' && event.date > reference), true);
});

test('le calendrier stratégique ne renvoie jamais une fête passée', () => {
  const reference = new Date('2026-07-16T12:00:00Z');
  const events = buildMarketEvents(reference, {});

  assert.ok(events.length > 0);
  assert.ok(events.every((event) => event.date >= new Date('2026-07-16T00:00:00Z')));
  assert.equal(events.some((event) => event.key === 'tabaski' && event.date.getFullYear() === 2026), false);
});

test('un événement marché sans date valide ne devient pas artificiellement un événement du jour', () => {
  const events = buildMarketEvents(new Date('2026-07-16T12:00:00Z'), {
    market_calendar_events: [
      { id: 'INVALID-1', label: 'Événement incomplet' },
      { id: 'INVALID-2', label: 'Événement invalide', date: 'pas-une-date' },
    ],
  });

  assert.equal(events.some((event) => event.id === 'INVALID-1' || event.id === 'INVALID-2'), false);
});
