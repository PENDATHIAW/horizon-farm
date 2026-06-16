import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolveElevageTab } from '../../src/utils/commercialNavigation.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const appSrc = readFileSync(join(root, 'src/App.jsx'), 'utf8');
const recoveredSrc = readFileSync(join(root, 'src/modules/ElevageRecoveredModule.jsx'), 'utf8');
const productionHubSrc = readFileSync(join(root, 'src/modules/elevage/ProductionHub.jsx'), 'utf8');
const graphiquesSrc = readFileSync(join(root, 'src/components/module/ModuleGraphiquesTab.jsx'), 'utf8');
const cyclesSrc = readFileSync(join(root, 'src/modules/elevage/ElevageCyclesPanel.jsx'), 'utf8');

test('resolveElevageTab — alias Cycles, Production, Graphiques, Résumé', () => {
  assert.equal(resolveElevageTab('cycles'), 'Cycles');
  assert.equal(resolveElevageTab('production'), 'Production');
  assert.equal(resolveElevageTab('graphiques'), 'Graphiques');
  assert.equal(resolveElevageTab('resume'), 'Résumé');
});

test('App — productionQuestion déclenché pour navigations Élevage', () => {
  const elevageBlock = appSrc.slice(appSrc.indexOf("if (resolved === 'elevage')"));
  assert.match(elevageBlock, /options\?\.productionQuestion/);
  assert.match(elevageBlock, /horizon-production-question/);
});

test('Résumé — parcours rapide vers Cycles, Production, Graphiques', () => {
  assert.match(recoveredSrc, /Parcours rapide/);
  assert.match(recoveredSrc, /setTab\('Cycles'\)/);
  assert.match(recoveredSrc, /setTab\('Production'\)/);
  assert.match(recoveredSrc, /setTab\('Graphiques'\)/);
});

test('Production — brouillons Hey Horizon et journal ponte', () => {
  assert.match(productionHubSrc, /HeyHorizonAnimalCard/);
  assert.match(productionHubSrc, /HeyHorizonAvicoleCard/);
  assert.match(productionHubSrc, /AvicoleJournalsBridge/);
  assert.match(recoveredSrc, /egg_production/);
});

test('Graphiques Élevage — sections structurées', () => {
  const elevageCase = graphiquesSrc.slice(graphiquesSrc.indexOf("case 'elevage'"));
  assert.match(elevageCase, /Graphiques Élevage/);
  assert.match(elevageCase, /AvicoleEvolution/);
  assert.match(elevageCase, /AnimauxEvolution/);
});

test('Cycles — préparer vente via Commercial', () => {
  assert.doesNotMatch(cyclesSrc, /onNavigate\?\.\('ventes'\)/);
  assert.match(cyclesSrc, /commercial.*Ventes/s);
});

test('Production — CTA transformation unique dans bloc dédié', () => {
  const chairBlock = productionHubSrc.slice(productionHubSrc.indexOf('Poulets de chair'), productionHubSrc.indexOf('Bovins / embouche'));
  const bovinsBlock = productionHubSrc.slice(productionHubSrc.indexOf('Bovins / embouche'), productionHubSrc.indexOf('Transformation / viande'));
  assert.doesNotMatch(chairBlock, /Voir transformation/);
  assert.doesNotMatch(bovinsBlock, /Voir transformation/);
  assert.match(productionHubSrc, /Transformation \/ viande[\s\S]*Voir transformation/);
});

test('Annexe Élevage — liens contextuels Cycles et Production', () => {
  const annexeSrc = readFileSync(join(root, 'src/components/module/ModuleAnnexeTab.jsx'), 'utf8');
  assert.match(annexeSrc, /elevage:[\s\S]*Cycles & échéances/);
  assert.match(annexeSrc, /Production détaillée/);
});
