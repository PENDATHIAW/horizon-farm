import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildErpDeepLink,
  parseErpDeepLinkFromSearch,
  stripErpDeepLinkParamsFromUrl,
} from '../../src/utils/erpDeepLink.js';

test('buildErpDeepLink inclut demo, module et onglet', () => {
  const url = buildErpDeepLink({ module: 'commercial', tab: 'Ventes', demo: true });
  assert.equal(url, '/?demo=1&module=commercial&tab=Ventes');
});

test('buildErpDeepLink résout les alias legacy', () => {
  const url = buildErpDeepLink({ module: 'ventes', tab: 'Ventes' });
  assert.match(url, /module=commercial/);
});

test('parseErpDeepLinkFromSearch lit module et assistant', () => {
  const parsed = parseErpDeepLinkFromSearch('?demo=1&module=elevage&tab=Sant%C3%A9&hey=mortalit%C3%A9');
  assert.deepEqual(parsed, {
    module: 'elevage',
    tab: 'Santé',
    heyHorizon: 'mortalité',
    demo: true,
  });
});

test('stripErpDeepLinkParamsFromUrl conserve demo', () => {
  const next = stripErpDeepLinkParamsFromUrl('http://local/?demo=1&module=finance_pilotage&tab=R%C3%A9sum%C3%A9');
  assert.equal(next, '/?demo=1');
});
