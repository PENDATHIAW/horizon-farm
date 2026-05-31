import test from 'node:test';
import assert from 'node:assert/strict';
import {
  gregorianToHijri,
  hijriToGregorian,
  computeSenegalMarketFestivals,
  getNextComputedFestivalDates,
} from '../../src/services/islamicCalendarEngine.js';
import {
  buildAllMarketEvents,
  getNextFestivals,
  getUpcomingMarketEvents,
  contextualizeSeasonalText,
} from '../../src/services/marketEventCalendar.js';

test('hijriToGregorian calcule Tabaski 1447', () => {
  assert.equal(hijriToGregorian(1447, 12, 10), '2026-05-27');
});

test('hijriToGregorian calcule Korité 1447', () => {
  assert.equal(hijriToGregorian(1447, 10, 1), '2026-03-20');
});

test('getNextComputedFestivalDates exclut Tabaski passé au 31/05/2026', () => {
  const ref = new Date('2026-05-31');
  const dates = getNextComputedFestivalDates(ref);
  assert.notEqual(dates.tabaski, '2026-05-27');
  assert.equal(dates.tabaski, '2027-05-17');
  assert.ok(dates.magal.startsWith('2026-'));
});

test('getUpcomingMarketEvents filtre les fêtes passées', () => {
  const ref = new Date('2026-05-31');
  const upcoming = getUpcomingMarketEvents(ref, {});
  const pastTabaski = upcoming.find((event) => event.key === 'tabaski' && event.date.toISOString().startsWith('2026-05'));
  assert.equal(pastTabaski, undefined);
  assert.ok(upcoming.some((event) => event.key === 'magal'));
});

test('getNextFestivals met Magal avant Tabaski suivant', () => {
  const ref = new Date('2026-05-31');
  const next = getNextFestivals(ref, {}, 3);
  assert.equal(next[0]?.key, 'magal');
  assert.ok(next.every((event) => event.date >= ref));
});

test('pilotage override remplace le calcul auto', () => {
  const ref = new Date('2026-05-31');
  const dataMap = {
    growth_settings: {
      festival_dates: { magal: '2026-09-01' },
    },
  };
  const events = buildAllMarketEvents(ref, dataMap);
  const magal = events.find((event) => event.key === 'magal' && event.date.toISOString().startsWith('2026-09'));
  assert.equal(magal?.source, 'pilotage');
});

test('contextualizeSeasonalText retire Tabaski passé', () => {
  const ref = new Date('2026-05-31');
  const upcoming = getUpcomingMarketEvents(ref, {}, { horizonDays: 200 });
  const text = contextualizeSeasonalText('Préparer Tabaski et pousser Magal avant la fête.', upcoming, ref);
  assert.match(text.toLowerCase(), /magal|prochaines fenêtres/);
  assert.doesNotMatch(text.toLowerCase(), /tabaski/);
});

test('computeSenegalMarketFestivals inclut fin d année', () => {
  const ref = new Date('2026-05-31');
  const festivals = computeSenegalMarketFestivals(ref);
  assert.ok(festivals.some((event) => event.key === 'fin_annee' && event.dateIso === '2026-12-24'));
});

test('gregorianToHijri convertit une date connue', () => {
  const h = gregorianToHijri(2026, 5, 27);
  assert.equal(h.hy, 1447);
  assert.equal(h.hm, 12);
});
