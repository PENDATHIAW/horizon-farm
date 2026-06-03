import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';

const MODULES_WITH_ANNEXE = [
  'dashboard',
  'objectifs_croissance',
  'centre_ia',
  'elevage',
  'commercial',
  'achats_stock',
  'finance_pilotage',
  'activite_suivi',
  'documents_rapports',
  'smartfarm',
];

for (const moduleId of MODULES_WITH_ANNEXE) {
  test(`onglet Annexe présent pour ${moduleId}`, () => {
    const tabs = MODULE_TARGET_TABS[moduleId] || [];
    assert.ok(tabs.includes('Annexe'), `${moduleId} doit inclure l'onglet Annexe (tabs=${tabs.join(', ')})`);
    if (moduleId !== 'dashboard') {
      assert.ok(tabs.indexOf('Annexe') < tabs.indexOf('Graphiques'), `${moduleId}: Annexe doit précéder Graphiques`);
    }
  });
}

test('finance_pilotage conserve Rapprochement', () => {
  assert.ok(MODULE_TARGET_TABS.finance_pilotage.includes('Rapprochement'));
});
