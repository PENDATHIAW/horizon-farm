import test from 'node:test';
import assert from 'node:assert/strict';
import { RH_TABS, resolveRhTab, resolveRhNavigation } from '../../src/utils/commercialNavigation.js';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';

test('equipe — 4 vues canoniques et 4 libellés cibles', () => {
  assert.deepEqual(RH_TABS, ['TeamOverviewView', 'TeamMembersView', 'TeamAssignmentsView', 'TeamAbsencesView']);
  assert.deepEqual(MODULE_TARGET_TABS.equipe, ['Vue d’ensemble', 'Membres', 'Affectations', 'Absences']);
});

test('resolveRhTab — aliases anciens onglets', () => {
  assert.equal(resolveRhTab('Résumé'), 'TeamOverviewView');
  assert.equal(resolveRhTab('Équipements'), 'TeamOverviewView');
  assert.equal(resolveRhTab('Maintenance'), 'TeamOverviewView');
  assert.equal(resolveRhTab('Affectations'), 'TeamAssignmentsView');
  assert.equal(resolveRhTab('Coûts'), 'TeamMembersView');
  assert.equal(resolveRhTab('Absences'), 'TeamAbsencesView');
  assert.equal(resolveRhNavigation('Maintenance').tab, 'TeamOverviewView');
});
