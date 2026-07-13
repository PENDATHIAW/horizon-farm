import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getRhDirectory, RH_STORAGE_KEY } from '../../src/utils/rhDirectory.js';

test('isole l annuaire RH local de chaque ferme', () => {
  const records = new Map([
    [`${RH_STORAGE_KEY}:farm-a`, JSON.stringify({ people: [{ id: 'A', nom: 'Ferme A' }], absences: [{ id: 'ABS-A' }] })],
    [`${RH_STORAGE_KEY}:farm-b`, JSON.stringify({ people: [{ id: 'B', nom: 'Ferme B' }] })],
  ]);
  const previousWindow = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: (key) => records.get(key) ?? null,
    },
  };

  try {
    const farmA = getRhDirectory({ farmId: 'farm-a' });
    const farmB = getRhDirectory({ farmId: 'farm-b' });
    assert.equal(farmA.people[0].id, 'A');
    assert.equal(farmA.absences[0].id, 'ABS-A');
    assert.equal(farmB.people[0].id, 'B');
    assert.equal(farmB.absences.length, 0);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('garde le service RH Supabase en chargement differe', () => {
  const appSource = readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8');
  const equipeSource = readFileSync(new URL('../../src/modules/EquipeV1Module.jsx', import.meta.url), 'utf8');
  const utilitySource = readFileSync(new URL('../../src/utils/rhDirectory.js', import.meta.url), 'utf8');

  assert.doesNotMatch(appSource, /from ['"].*rhDirectoryService/);
  assert.doesNotMatch(equipeSource, /from ['"].*rhDirectoryService/);
  assert.match(utilitySource, /import\(['"]\.\.\/services\/rhDirectoryService\.js['"]\)/);
});
