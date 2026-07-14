/**
 * Lot E (i18n) : garde-fou de rendu du panneau de réglages migré vers le
 * dictionnaire. Vérifie que SettingsPanel se rend sans erreur et affiche des
 * libellés du dictionnaire (pas la clé brute), en ligne comme hors ligne.
 *
 * Exécution : npx vite-node tests/unit/settingsPanelRender.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import SettingsPanel from '../../src/components/SettingsPanel.jsx';
import { t } from '../../src/i18n/fr/index.js';

const baseProps = {
  open: true,
  onClose: () => {},
  user: { user_metadata: { role: 'terrain' } },
  displayUser: 'Awa',
  online: true,
  meteo: { temp: 30, apparentTemp: 32, condition: 'Ensoleillé', precipitationProbability: 10 },
  sidebarOpen: true,
  setSidebarOpen: () => {},
  setActive: () => {},
  onSignOut: () => {},
};

test('SettingsPanel se rend et affiche les libellés du dictionnaire', () => {
  const html = renderToString(React.createElement(SettingsPanel, baseProps));
  assert.match(html, new RegExp(t('reglages.titre')));
  assert.match(html, /Niveau de détail/);
  assert.match(html, /Automatisations ferme/);
  // Aucune clé de dictionnaire non résolue propre au panneau (les données du
  // hook d'automatisations ne sont pas concernées par ce lot).
  assert.doesNotMatch(html, /reglages\.[a-z]/, 'une clé de dictionnaire non résolue est affichée');
});

test('SettingsPanel hors ligne se rend sans erreur', () => {
  const html = renderToString(React.createElement(SettingsPanel, { ...baseProps, online: false }));
  assert.match(html, new RegExp(t('reglages.connexion.horsLigne')));
});

test('SettingsPanel fermé ne rend rien', () => {
  const html = renderToString(React.createElement(SettingsPanel, { ...baseProps, open: false }));
  assert.equal(html, '');
});
