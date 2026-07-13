import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import { ACTIVITE_SUIVI_TABS, resolveActiviteSuiviTab } from '../../src/utils/commercialNavigation.js';

describe('Module access fixes — config onglets', () => {
  it('le Centre décisionnel expose les 5 onglets cibles', () => {
    const tabs = MODULE_TARGET_TABS.centre_decisionnel;
    assert.deepEqual(tabs, ['À traiter', 'Écarts', 'Risques', 'Décisions', 'Historique']);
    assert.deepEqual(MODULE_TARGET_TABS.centre_ia, tabs);
  });

  it('objectifs_croissance aligné sur 4 onglets stratégiques', () => {
    const tabs = MODULE_TARGET_TABS.objectifs_croissance;
    assert.ok(tabs.includes('Suivi du Business Plan'));
    assert.ok(tabs.includes('Prévisionnel vs réel'));
    assert.ok(tabs.includes('Simulations'));
    assert.ok(tabs.includes('Capacité de remboursement'));
    assert.equal(tabs.length, 4);
  });

  it('ACTIVITE_SUIVI_TABS défini et résolu', () => {
    assert.ok(Array.isArray(ACTIVITE_SUIVI_TABS));
    assert.equal(resolveActiviteSuiviTab('alertes'), 'À traiter maintenant');
    assert.equal(resolveActiviteSuiviTab('taches'), 'À traiter maintenant');
    assert.equal(resolveActiviteSuiviTab('Résumé'), 'Cockpit & décisions');
  });
});
