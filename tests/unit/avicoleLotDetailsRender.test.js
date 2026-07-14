/**
 * Lot E (i18n) : garde-fou de rendu de la fiche lot avicole migrée vers le
 * dictionnaire. Vérifie les deux branches (pondeuses et poulets de chair),
 * l'absence de clé non résolue, de tiret long et du mot interdit « IA ».
 *
 * Exécution : npx vite-node tests/unit/avicoleLotDetailsRender.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import AvicoleLotDetailsModal from '../../src/components/AvicoleLotDetailsModal.jsx';
import { MOTIF_IA_VISIBLE } from '../../src/i18n/charte.js';

const lotChair = {
  id: 'LOT-1',
  name: 'Bande A',
  type: 'Poulets de chair',
  status: 'actif',
  effectif_initial: 100,
  nb_morts: 3,
};
const lotPondeuses = { id: 'LOT-2', name: 'Bande B', type: 'Pondeuses', status: 'actif' };

test('AvicoleLotDetailsModal (sans lot) affiche l\'état vide du dictionnaire', () => {
  const html = renderToString(React.createElement(AvicoleLotDetailsModal, { open: true, lot: null }));
  assert.match(html, /Aucun lot sélectionné/);
  assert.doesNotMatch(html, /avicoleLot\.[a-z]/, 'clé de dictionnaire non résolue');
});

test('AvicoleLotDetailsModal (poulets de chair) se rend avec les libellés du dictionnaire', () => {
  const html = renderToString(React.createElement(AvicoleLotDetailsModal, { open: true, lot: lotChair }));
  assert.match(html, /Situation/);
  assert.doesNotMatch(html, /avicoleLot\.[a-z]/, 'clé de dictionnaire non résolue');
  assert.doesNotMatch(html, /—/, 'tiret long interdit');
  assert.doesNotMatch(html, MOTIF_IA_VISIBLE, 'mot « IA » interdit à l\'écran');
});

test('AvicoleLotDetailsModal (pondeuses) se rend sans clé non résolue', () => {
  const html = renderToString(React.createElement(AvicoleLotDetailsModal, { open: true, lot: lotPondeuses }));
  assert.doesNotMatch(html, /avicoleLot\.[a-z]/);
  assert.doesNotMatch(html, /ERREUR|is not defined/i);
});
