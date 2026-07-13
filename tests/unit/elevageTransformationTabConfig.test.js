/**
 * Correctif Élevage · Restauration de l'onglet Transformation.
 *
 * La barre d'onglets (ModuleTabsBar) lit la configuration unique
 * (moduleTabs.config.js). Ces tests verrouillent le fait que la configuration
 * Élevage reste alignée sur les onglets réellement rendus par le module,
 * Transformation compris, et que la navigation résout bien Transformation.
 *
 * Exécution : npx vite-node tests/unit/elevageTransformationTabConfig.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MODULE_TABS_CONFIG, MODULE_TABS_LABELS } from '../../src/config/moduleTabs.config.js';
import { ELEVAGE_TABS, resolveElevageTab } from '../../src/utils/commercialNavigation.js';
import ModuleTabsBar from '../../src/components/module/ModuleTabsBar.jsx';

test('la configuration Élevage expose Transformation dans la structure cible', () => {
  const libelles = MODULE_TABS_LABELS.elevage;
  assert.ok(libelles.includes('Transformation'), 'Transformation doit être visible');
  assert.deepEqual(libelles, [
    'Vue d’ensemble',
    'Lots & animaux',
    'Alimentation',
    'Production',
    'Santé & Biosécurité',
    'Transformation',
    'Coûts & performance',
    'Historique',
  ]);
  assert.ok(ELEVAGE_TABS.includes('Transformation'));
});

test('la barre d\'onglets Élevage affiche l\'onglet Transformation', () => {
  const html = renderToString(
    React.createElement(ModuleTabsBar, { moduleId: 'elevage', active: 'Lots & bandes', onChange: () => {} }),
  );
  assert.match(html, /Transformation/);
  assert.match(html, /Lots &(amp;)? animaux/);
  assert.match(html, /Santé &(amp;)? Biosécurité/);
  assert.match(html, /role="tablist"/);
  assert.match(html, /role="tab"/);
  assert.match(html, /aria-label="Transformation"/);
  assert.match(html, /aria-selected="true"/);
});

test('les alias Transformation et transformation résolvent vers l\'onglet', () => {
  assert.equal(resolveElevageTab('Transformation'), 'Transformation');
  assert.equal(resolveElevageTab('transformation'), 'Transformation');
});

test('un initialTab Transformation ne retombe pas sur Lots & bandes', () => {
  assert.equal(resolveElevageTab('Transformation'), 'Transformation');
  assert.notEqual(resolveElevageTab('Transformation'), 'Lots & bandes');
});

test('le composant de rendu Transformation est déclaré dans la configuration', () => {
  const entree = MODULE_TABS_CONFIG.elevage.onglets.find((o) => o.libelle === 'Transformation');
  assert.ok(entree, 'entrée Transformation présente');
  assert.equal(entree.composant, 'Transformation');
});

test('financeur_externe ne voit pas Transformation via un accès Élevage restreint', () => {
  // Élevage n'est pas exposé au rôle financeur_externe : ses onglets ne sont
  // pas rendus pour ce rôle (aucune entrée financeur_externe dans la config).
  const html = renderToString(
    React.createElement(ModuleTabsBar, { moduleId: 'elevage', active: 'Lots & bandes', onChange: () => {}, role: 'financeur_externe' }),
  );
  assert.doesNotMatch(html, /Transformation/);
});
