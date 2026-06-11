import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveUltraShortIntent } from '../../src/services/assistantUltraShortIntents.js';

const ultraCases = [
  ['ventes?', 'ventes', 'COMMERCIAL'],
  ['stock', 'stock_overview', 'STOCK'],
  ['clients?', 'commercial_summary', 'COMMERCIAL'],
  ['lots', 'lots_overview', 'ELEVAGE'],
  ['animaux', 'my_animals', 'ELEVAGE'],
  ['parcelles', 'parcelles_status', 'CULTURES'],
  ['objectifs', 'progress_status', 'OBJECTIFS'],
  ['tresorerie', 'treasury', 'FINANCE'],
  ['rapports', 'documents_summary', 'DECISION'],
  ['personnel', 'rh_personnel', 'DECISION'],
  ['mes ventes', 'ventes', 'COMMERCIAL'],
  ['mes animaux', 'my_animals', 'ELEVAGE'],
  ['mes lots', 'lots_overview', 'ELEVAGE'],
  ['quoi vendre', 'sell_today', 'DECISION'],
];

for (const [query, intent, family] of ultraCases) {
  test(`ultra-short: ${query}`, () => {
    const hit = resolveUltraShortIntent(query);
    assert.ok(hit, `expected match for ${query}`);
    assert.equal(hit.intent, intent);
    assert.equal(hit.family, family);
  });
}
