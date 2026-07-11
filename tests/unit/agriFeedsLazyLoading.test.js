import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AGRI_FEEDS_TABLE_KEYS } from '../../src/modules/agriFeeds/hooks/useAgriFeedsData.js';
import { CRUD_KEYS } from '../../src/config/modules.config.js';

test('AGRI FEEDS — tables déclarées mais non chargées par le CRUD global', () => {
  assert.equal(AGRI_FEEDS_TABLE_KEYS.length, 11);
  AGRI_FEEDS_TABLE_KEYS.forEach((key) => assert.ok(CRUD_KEYS.includes(key), `${key} doit rester déclaré dans le registre`));

  const useCrudModulesSource = readFileSync('src/hooks/useCrudModules.js', 'utf8');
  AGRI_FEEDS_TABLE_KEYS.forEach((key) => {
    assert.equal(
      useCrudModulesSource.includes(`useCrudModule('${key}')`),
      false,
      `${key} ne doit pas être instancié au chargement global`,
    );
  });

  const appSource = readFileSync('src/App.jsx', 'utf8');
  AGRI_FEEDS_TABLE_KEYS.forEach((key) => {
    assert.equal(
      appSource.includes(`rows(c.${key})`),
      false,
      `${key} ne doit pas être lu depuis c.* dans App.jsx`,
    );
  });
});
