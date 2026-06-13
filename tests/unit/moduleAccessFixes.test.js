import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import { ACTIVITE_SUIVI_TABS, resolveActiviteSuiviTab } from '../../src/utils/commercialNavigation.js';

describe('Module access fixes — config onglets', () => {
  it('centre_ia exposes 3 target tabs', () => {
    const tabs = MODULE_TARGET_TABS.centre_ia;
    assert.ok(tabs.includes('Urgences & risques'));
    assert.ok(tabs.includes('Croissance & opportunités'));
    assert.ok(tabs.includes('Saisons & marchés'));
  });

  it('objectifs_croissance aligné sur 4 onglets stratégiques', () => {
    const tabs = MODULE_TARGET_TABS.objectifs_croissance;
    assert.ok(tabs.includes('Suivi du Business Plan'));
    assert.ok(tabs.includes('Efficacité Technique & Zootechnique'));
    assert.ok(tabs.includes('Simulateur Sandbox'));
    assert.ok(tabs.includes('Sécurisation des Flux'));
    assert.equal(tabs.length, 4);
  });

  it('ACTIVITE_SUIVI_TABS défini et résolu', () => {
    assert.ok(Array.isArray(ACTIVITE_SUIVI_TABS));
    assert.equal(resolveActiviteSuiviTab('alertes'), 'Alertes');
    assert.equal(resolveActiviteSuiviTab('taches'), 'Tâches');
  });
});
