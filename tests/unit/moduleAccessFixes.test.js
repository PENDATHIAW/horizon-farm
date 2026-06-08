import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import { ACTIVITE_SUIVI_TABS, resolveActiviteSuiviTab } from '../../src/utils/commercialNavigation.js';

describe('Module access fixes — config onglets', () => {
  it('centre_ia inclut Recommandations, Historique et Annexe', () => {
    const tabs = MODULE_TARGET_TABS.centre_ia;
    assert.ok(tabs.includes('Recommandations'));
    assert.ok(tabs.includes('Historique'));
    assert.ok(tabs.includes('Annexe'));
    assert.ok(tabs.indexOf('Annexe') < tabs.indexOf('Graphiques'));
  });

  it('objectifs_croissance aligné sur les vrais onglets analytiques', () => {
    const tabs = MODULE_TARGET_TABS.objectifs_croissance;
    assert.ok(tabs.includes('Rentabilité Lot & Cycle'));
    assert.ok(tabs.includes('Efficacité Technique'));
    assert.ok(tabs.includes('Flux & Équilibres'));
    assert.ok(tabs.includes('Maraîchage & Diversification'));
    assert.ok(tabs.includes('Annexe'));
  });

  it('ACTIVITE_SUIVI_TABS défini et résolu', () => {
    assert.ok(Array.isArray(ACTIVITE_SUIVI_TABS));
    assert.equal(resolveActiviteSuiviTab('alertes'), 'Alertes');
    assert.equal(resolveActiviteSuiviTab('taches'), 'Tâches');
  });
});
