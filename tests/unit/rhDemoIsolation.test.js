import test from 'node:test';
import assert from 'node:assert/strict';
import { SIMULATED_DATA_MODE_KEY } from '../../src/utils/uiPreferences.js';
import {
  getRhDirectory,
  isDemoPerson,
  RH_DEFAULT_PEOPLE,
} from '../../src/utils/rhDirectory.js';

// localStorage minimal pour piloter le mode de données (démo vs réel).
function installStorage() {
  const store = new Map();
  const mock = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
  const prevLs = globalThis.localStorage;
  const prevWin = globalThis.window;
  globalThis.localStorage = mock;
  globalThis.window = undefined; // getRhDirectory passe par la branche sans window
  return {
    setSimulated(on) {
      if (on) store.set(SIMULATED_DATA_MODE_KEY, '1');
      else store.delete(SIMULATED_DATA_MODE_KEY);
    },
    restore() {
      globalThis.localStorage = prevLs;
      globalThis.window = prevWin;
    },
  };
}

test('isDemoPerson repère les identités fictives connues', () => {
  assert.equal(isDemoPerson({ id: 'RH-DEMO-COMM' }), true);
  assert.equal(isDemoPerson({ id: 'RH-X', source: 'simulation_bp_horizon_farm' }), true);
  assert.equal(isDemoPerson({ id: 'RH-Y', notes: 'Donnée RH fictive.' }), true);
  assert.equal(isDemoPerson({ id: 'RH-REEL-001', nom: 'Vrai employé' }), false);
});

test('HF-P0-001 — mode réel vide : aucun membre RH fictif', () => {
  const ctrl = installStorage();
  try {
    ctrl.setSimulated(false);
    const dir = getRhDirectory({ farmId: 'FARM-REEL' });
    assert.equal(dir.people.length, 0, 'aucune personne fictive en mode réel');
  } finally {
    ctrl.restore();
  }
});

test('HF-P0-001 — mode démonstration : le jeu RH fictif est présent', () => {
  const ctrl = installStorage();
  try {
    ctrl.setSimulated(true);
    const dir = getRhDirectory({ farmId: 'FARM-DEMO' });
    assert.ok(dir.people.length >= RH_DEFAULT_PEOPLE.length, 'jeu démo injecté');
    assert.ok(dir.people.every((p) => p.id), 'personnes valides');
    assert.ok(dir.people.some((p) => isDemoPerson(p)), 'au moins une personne démo');
  } finally {
    ctrl.restore();
  }
});

test('HF-P0-001 — le réel saisi survit, la démo persistée est purgée en mode réel', () => {
  const ctrl = installStorage();
  try {
    ctrl.setSimulated(false);
    // Simule une sauvegarde héritée mêlant réel + démo persistée.
    const mixed = {
      people: [
        { id: 'RH-REEL-1', nom: 'Aïssatou (réel)' },
        { id: 'RH-DEMO-COMM', nom: 'Ibrahima (démo)', notes: 'Donnée RH fictive.' },
      ],
    };
    globalThis.localStorage.setItem('horizon_farm_rh_directory_v1:FARM-REEL', JSON.stringify(mixed));
    globalThis.window = { localStorage: globalThis.localStorage };
    const dir = getRhDirectory({ farmId: 'FARM-REEL' });
    globalThis.window = undefined;
    const ids = dir.people.map((p) => p.id);
    assert.ok(ids.includes('RH-REEL-1'), 'la personne réelle est conservée');
    assert.ok(!ids.includes('RH-DEMO-COMM'), 'la personne démo persistée est purgée');
  } finally {
    ctrl.restore();
  }
});
