import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DATA_MODE_CHOICE_KEY,
  SIMULATED_DATA_MODE_KEY,
  applyDefaultDataModeForRole,
  getDataModeChoice,
  hasExplicitDataModeChoice,
  isSimulatedDataModeEnabled,
  setSimulatedDataMode,
} from '../../src/utils/uiPreferences.js';
import { setupTestStorage } from './helpers/moduleTabTestHarness.js';

setupTestStorage();

if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}
if (typeof globalThis.window.dispatchEvent !== 'function') {
  globalThis.window.dispatchEvent = () => {};
}

test('choix réel persiste après désactivation du mode simulé', () => {
  setSimulatedDataMode(false);
  assert.equal(getDataModeChoice(), 'real');
  assert.equal(hasExplicitDataModeChoice(), true);
  assert.equal(isSimulatedDataModeEnabled(), false);
  assert.equal(globalThis.localStorage.getItem(SIMULATED_DATA_MODE_KEY), null);
});

test('applyDefaultDataModeForRole respecte le choix explicite', () => {
  setSimulatedDataMode(false);
  applyDefaultDataModeForRole('employe');
  assert.equal(isSimulatedDataModeEnabled(), false);
  assert.equal(getDataModeChoice(), 'real');
});

test('applyDefaultDataModeForRole applique le défaut par rôle sans choix explicite', () => {
  globalThis.localStorage.removeItem(DATA_MODE_CHOICE_KEY);
  globalThis.localStorage.removeItem(SIMULATED_DATA_MODE_KEY);
  applyDefaultDataModeForRole('admin');
  assert.equal(isSimulatedDataModeEnabled(), false);
  assert.equal(getDataModeChoice(), 'real');

  globalThis.localStorage.removeItem(DATA_MODE_CHOICE_KEY);
  globalThis.localStorage.removeItem(SIMULATED_DATA_MODE_KEY);
  applyDefaultDataModeForRole('employe');
  assert.equal(isSimulatedDataModeEnabled(), true);
  assert.equal(getDataModeChoice(), 'simulated');
});
