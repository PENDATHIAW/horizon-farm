/**
 * Lot E (i18n) : garde-fou de rendu du panneau des coûts ferme migré vers le
 * dictionnaire. Vérifie le rendu (compact et complet) et l'absence de clé non
 * résolue ou de tiret long.
 *
 * Exécution : npx vite-node tests/unit/farmCostSettingsRender.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import FarmCostSettingsPanel from '../../src/components/FarmCostSettingsPanel.jsx';

test('FarmCostSettingsPanel (complet) se rend avec les libellés du dictionnaire', () => {
  const html = renderToString(React.createElement(FarmCostSettingsPanel, { compact: false }));
  assert.match(html, /Rations et prix par défaut/);
  assert.match(html, /Rations journalières par espèce ou type/);
  assert.match(html, /Enregistrer les paramètres/);
  assert.doesNotMatch(html, /coutsFerme\.[a-z]/, 'clé de dictionnaire non résolue');
  assert.doesNotMatch(html, /—/, 'tiret long interdit');
});

test('FarmCostSettingsPanel (compact) se rend sans erreur', () => {
  const html = renderToString(React.createElement(FarmCostSettingsPanel, { compact: true }));
  assert.doesNotMatch(html, /coutsFerme\.[a-z]/);
  assert.doesNotMatch(html, /ERREUR|is not defined/i);
});
