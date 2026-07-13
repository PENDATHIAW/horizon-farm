import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import {
  navigateCulturesTab,
  navigationOptionsForFinding,
  resolveCulturesTab,
  resolveSearchNavigation,
} from '../../src/utils/commercialNavigation.js';
import {
  navigateCulturesTab as navigateFromCulturesNav,
  resolveCulturesSectionIntent,
} from '../../src/utils/culturesNavigation.js';
import { resolveAnnexeLink } from '../../src/services/annexeNavigation.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const moduleProjectionsSource = readFileSync(join(root, 'src/utils/moduleProjections.js'), 'utf8');

test('MODULE_TARGET_TABS.cultures expose les 7 onglets cibles', () => {
  assert.deepEqual(MODULE_TARGET_TABS.cultures, [
    'Parcelles',
    'Campagnes',
    'Irrigation',
    'Intrants & fertilisation',
    'Récoltes',
    'Coûts & marge',
    'Historique',
  ]);
});

test('resolveCulturesTab — alias legacy et Récoltes & stock', () => {
  assert.equal(resolveCulturesTab('Pilotage'), 'Parcelles cultures');
  assert.equal(resolveCulturesTab('Intrants & Météo'), 'Intrants & fertilisation cultures');
  assert.equal(resolveCulturesTab('Transformation'), 'Récoltes cultures');
  assert.equal(resolveCulturesTab('Récoltes & stock'), 'Récoltes cultures');
  assert.equal(resolveCulturesTab('Graphiques'), 'Historique cultures');
});

test('resolveCulturesSectionIntent — sections repliables', () => {
  assert.deepEqual(resolveCulturesSectionIntent('Intrants & Météo'), {
    tab: 'Intrants & fertilisation cultures',
    section: 'intrants',
  });
  assert.deepEqual(resolveCulturesSectionIntent('Santé & Protection'), {
    tab: 'Intrants & fertilisation cultures',
    section: 'sante',
  });
  assert.deepEqual(resolveCulturesSectionIntent('Transformation'), {
    tab: 'Récoltes cultures',
    section: 'transformation',
  });
  assert.deepEqual(resolveCulturesSectionIntent('Graphiques'), {
    tab: 'Historique cultures',
    section: 'graphiques',
  });
});

test('navigateCulturesTab — conserve alias brut pour deep-link', () => {
  const calls = [];
  const resolved = navigateCulturesTab((module, opts) => calls.push({ module, ...opts }), 'Intrants & Météo');
  assert.equal(resolved, 'Intrants & fertilisation cultures');
  assert.deepEqual(calls, [{ module: 'cultures', tab: 'Intrants & Météo' }]);
  assert.equal(
    navigateFromCulturesNav((module, opts) => calls.push({ module, ...opts }), 'Transformation'),
    'Récoltes cultures',
  );
  assert.equal(calls[1].tab, 'Transformation');
});

test('navigationOptionsForFinding — alias cultures conservé', () => {
  const nav = navigationOptionsForFinding({ module: 'cultures', tab: 'Intrants & Météo' });
  assert.equal(nav.module, 'cultures');
  assert.equal(nav.tab, 'Intrants & Météo');
});

test('resolveSearchNavigation — table cultures', () => {
  assert.deepEqual(resolveSearchNavigation('cultures'), {
    module: 'cultures',
    tab: 'Parcelles & campagnes',
  });
});

test('resolveAnnexeLink — parcelle vers module Cultures', () => {
  const link = resolveAnnexeLink('Voir la parcelle tomates');
  assert.equal(link?.module, 'cultures');
  assert.equal(link?.tab, 'Parcelles & campagnes');
});

test('moduleProjections — lien récoltes canonique', () => {
  assert.match(moduleProjectionsSource, /module: 'cultures', tab: 'Récoltes'/);
  assert.doesNotMatch(moduleProjectionsSource, /Récoltes & stock/);
});
