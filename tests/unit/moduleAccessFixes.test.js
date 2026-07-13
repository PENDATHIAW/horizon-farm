import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import { ACTIVITE_SUIVI_TABS, resolveActiviteSuiviTab } from '../../src/utils/commercialNavigation.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('Module access fixes — config onglets', () => {
  it('le Centre décisionnel expose les 5 onglets cibles', () => {
    const tabs = MODULE_TARGET_TABS.centre_decisionnel;
    assert.deepEqual(tabs, ['À traiter', 'Écarts', 'Risques', 'Décisions', 'Historique']);
    assert.deepEqual(MODULE_TARGET_TABS.centre_ia, tabs);
  });

  it('objectifs_croissance expose les 3 onglets canoniques', () => {
    const tabs = MODULE_TARGET_TABS.objectifs_croissance;
    assert.deepEqual(tabs, ['Objectifs', 'Scénarios', 'Historique']);
  });

  it('ACTIVITE_SUIVI_TABS défini et résolu', () => {
    assert.ok(Array.isArray(ACTIVITE_SUIVI_TABS));
    assert.equal(resolveActiviteSuiviTab('alertes'), 'ActiviteAlertsView');
    assert.equal(resolveActiviteSuiviTab('taches'), 'ActiviteTodoView');
    assert.equal(resolveActiviteSuiviTab('Résumé'), 'ActiviteAlertsView');
  });

  it('chaque ressource CRUD utilisée par App possède un gestionnaire', () => {
    const appSource = readFileSync(join(root, 'src/App.jsx'), 'utf8');
    const hookSource = readFileSync(join(root, 'src/hooks/useCrudModules.js'), 'utf8');
    const usedKeys = [...appSource.matchAll(/\bc\.([A-Za-z0-9_]+)/g)].map((match) => match[1]);
    const hookKeys = new Set([...hookSource.matchAll(/const\s+([A-Za-z0-9_]+)\s*=\s*useCrudModule/g)].map((match) => match[1]));
    const missing = [...new Set(usedKeys)].filter((key) => !hookKeys.has(key)).sort();
    assert.deepEqual(missing, []);
  });
});
