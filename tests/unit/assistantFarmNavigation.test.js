import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FARM_NAV_SECTIONS,
  resolveFarmModuleNavigation,
} from '../../src/services/assistantFarmNavigation.js';

test('maps sidebar sections to module ids', () => {
  assert.deepEqual(FARM_NAV_SECTIONS.pilotage.modules, [
    'dashboard', 'assistant_erp', 'centre_decisionnel', 'objectifs_croissance', 'financements',
  ]);
  assert.deepEqual(FARM_NAV_SECTIONS.production.modules, ['elevage', 'cultures']);
});

test('resolves natural language module navigation', () => {
  assert.equal(resolveFarmModuleNavigation('ouvre le commercial')?.moduleId, 'commercial');
  assert.equal(resolveFarmModuleNavigation('va en élevage')?.moduleId, 'elevage');
  assert.equal(resolveFarmModuleNavigation('montre mes ventes')?.moduleId, 'commercial');
  assert.equal(resolveFarmModuleNavigation('montre mes animaux')?.moduleId, 'elevage');
  assert.equal(resolveFarmModuleNavigation('ouvre les objectifs')?.moduleId, 'objectifs_croissance');
  assert.equal(resolveFarmModuleNavigation('ouvre le centre IA')?.moduleId, 'centre_decisionnel');
  assert.equal(resolveFarmModuleNavigation('ouvre RH')?.moduleId, 'equipe');
  assert.equal(resolveFarmModuleNavigation('ouvre sync erp')?.moduleId, 'gestion_systeme');
  assert.equal(resolveFarmModuleNavigation('va dans les cultures')?.moduleId, 'cultures');
  assert.equal(resolveFarmModuleNavigation('combien de ventes ce mois'), null);
});
