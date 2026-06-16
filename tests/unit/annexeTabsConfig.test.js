import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';

/** Modules avec un onglet Annexe dédié dans la barre d'onglets. */
const MODULES_WITH_ANNEXE_TAB = [
  'objectifs_croissance',
  'centre_ia',
  'elevage',
  'achats_stock',
  'finance_pilotage',
  'smartfarm',
];

for (const moduleId of MODULES_WITH_ANNEXE_TAB) {
  test(`onglet Annexe présent pour ${moduleId}`, () => {
    const tabs = MODULE_TARGET_TABS[moduleId] || [];
    assert.ok(tabs.includes('Annexe'), `${moduleId} doit inclure l'onglet Annexe (tabs=${tabs.join(', ')})`);
    assert.ok(tabs.indexOf('Annexe') < tabs.indexOf('Graphiques'), `${moduleId}: Annexe doit précéder Graphiques`);
  });
}

test('Commercial — Annexe intégrée dans Pilotage (pas d\'onglet séparé)', () => {
  const tabs = MODULE_TARGET_TABS.commercial || [];
  assert.ok(!tabs.includes('Annexe'), 'Commercial n\'a plus d\'onglet Annexe dédié');
  assert.ok(tabs.includes('Pilotage'));
});

test('finance_pilotage inclut Échéancier avant Investissements', () => {
  const tabs = MODULE_TARGET_TABS.finance_pilotage;
  assert.ok(tabs.includes('Échéancier'));
  assert.ok(tabs.indexOf('Échéancier') < tabs.indexOf('Investissements'));
});
