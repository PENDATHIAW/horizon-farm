import test from 'node:test';
import assert from 'node:assert/strict';

import labels from '../../src/i18n/fr/moduleTabs.js';
import {
  MODULE_TAB_CONFIGS,
  getModuleTabs,
  matchModuleTab,
} from '../../src/config/moduleTabs/index.js';
import { ERP_ROLES } from '../../src/config/moduleTabs/shared.js';

const EXPECTED = {
  dashboard: labels.dashboard,
  assistant_erp: labels.assistant_erp,
  centre_decisionnel: labels.centre_decisionnel,
  objectifs_croissance: labels.objectifs_croissance,
  elevage: labels.elevage,
  cultures: labels.cultures,
  commercial: labels.commercial,
  achats_stock: labels.achats_stock,
  finance_pilotage: labels.finance_pilotage,
  activite_suivi: labels.activite_suivi,
  documents_rapports: labels.documents_rapports,
  equipe: labels.equipe,
  equipements: labels.equipements,
  gestion_systeme: labels.gestion_systeme,
  agri_feeds: labels.agri_feeds,
  smartfarm: labels.smartfarm,
  financements: labels.financements.cockpit,
  financements_externe: labels.financements.externe,
};

test('les 17 modules et la face financeur exposent exactement les onglets cibles', () => {
  for (const [moduleId, expectedLabels] of Object.entries(EXPECTED)) {
    assert.deepEqual(getModuleTabs(moduleId).map((tab) => tab.label), expectedLabels, moduleId);
  }
});

test('chaque onglet définit id, libellé, composant, rôles, flag et ordre', () => {
  for (const [moduleId, tabs] of Object.entries(MODULE_TAB_CONFIGS)) {
    const ids = new Set();
    tabs.forEach((tab, index) => {
      assert.match(tab.id, /^[a-z0-9-]+$/, `${moduleId}: id`);
      assert.ok(tab.label, `${moduleId}: libellé`);
      assert.ok(tab.component, `${moduleId}: composant`);
      assert.equal(tab.order, index + 1, `${moduleId}: ordre`);
      assert.ok(Array.isArray(tab.requiredRoles) && tab.requiredRoles.length > 0, `${moduleId}: rôles`);
      assert.ok(tab.requiredRoles.every((role) => ERP_ROLES.includes(role)), `${moduleId}: rôle inconnu`);
      assert.equal(ids.has(tab.id), false, `${moduleId}: id dupliqué ${tab.id}`);
      ids.add(tab.id);
    });
  }
});

test('les anciens identifiants et libellés restent des alias de navigation', () => {
  assert.equal(getModuleTabs('centre_ia'), getModuleTabs('centre_decisionnel'));
  assert.equal(getModuleTabs('rh'), getModuleTabs('equipe'));
  assert.equal(matchModuleTab('commercial', 'Prospects')?.id, 'clients');
  assert.equal(matchModuleTab('documents_rapports', 'Modèles')?.id, 'rapports');
  assert.equal(matchModuleTab('smartfarm', 'Capteurs')?.id, 'dispositifs');
});

test('les modules optionnels portent leur flag sur chaque onglet', () => {
  for (const moduleId of ['assistant_erp', 'agri_feeds', 'smartfarm', 'financements']) {
    assert.ok(getModuleTabs(moduleId).every((tab) => tab.featureFlag === moduleId), moduleId);
  }
});
