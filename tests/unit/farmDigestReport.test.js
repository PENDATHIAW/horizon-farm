import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFarmDigest,
  renderDigestText,
  renderDigestEmail,
} from '../../src/services/farmDigestReport.js';
import seed from '../../src/utils/horizonFarmSimulationSeed.js';

test('digest : sections et synthèse construites depuis le seed', () => {
  const digest = buildFarmDigest(seed, { period: 'hebdo', referenceDate: '2026-07-21' });
  assert.equal(digest.period, 'hebdo');
  assert.equal(digest.periodLabel, 'Cette semaine');
  assert.ok(digest.sections.finance);
  assert.ok(digest.sections.pilotage);
  assert.ok(digest.sections.predictions);
  assert.ok(digest.sections.actions);
  assert.ok(digest.summary.indicators > 0);
  // les points d'attention ne contiennent que des indicateurs non verts
  digest.sections.pilotage.items.forEach((a) => assert.ok(a.tone === 'bad' || a.tone === 'warn'));
});

test('digest : prochaines actions dédupliquées et bornées', () => {
  const digest = buildFarmDigest(seed, { referenceDate: '2026-07-21' });
  const texts = digest.sections.actions.items.map((a) => a.text);
  assert.equal(new Set(texts).size, texts.length, 'pas de doublon');
  assert.ok(texts.length <= 8);
});

test('rendu texte : format WhatsApp lisible avec repères couleur', () => {
  const digest = buildFarmDigest(seed, { period: 'mensuel', referenceDate: '2026-07-21' });
  const text = renderDigestText(digest);
  assert.match(text, /Horizon Farm - Rapport Ce mois/);
  assert.ok(text.length > 40);
  // au moins un marqueur couleur présent
  assert.ok(/🟢|🟠|🔴|⚪/.test(text));
});

test('rendu e-mail : sujet mentionne le nombre de points d\'attention', () => {
  const digest = buildFarmDigest(seed, { period: 'hebdo', referenceDate: '2026-07-21' });
  const email = renderDigestEmail(digest);
  assert.match(email.subject, /Horizon Farm/);
  assert.match(email.subject, /point\(s\) d'attention/);
  assert.equal(email.body, renderDigestText(digest));
});

test('robustesse : données vides = digest minimal sans crash', () => {
  const digest = buildFarmDigest({}, { period: 'jour' });
  assert.equal(digest.summary.indicators, 0);
  const text = renderDigestText(digest);
  assert.match(text, /Horizon Farm/);
});
