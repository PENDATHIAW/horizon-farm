import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLifecycleHistory } from '../../src/services/lifecycleHistoryService.js';

const lot = { id: 'LOT-1', name: 'Lot chair 1', initial_count: 100, current_count: 96, date_entree: '2026-01-01' };

test('carnet de vie: santé, pesée et alimentation apparaissent dans la frise (delta 0)', () => {
  const history = buildLifecycleHistory({
    mode: 'avicole',
    target: lot,
    sante: [
      { id: 'S1', lot_id: 'LOT-1', type_soin: 'Vaccination Newcastle', produit: 'Vaccin ND', date: '2026-01-05', cout: 5000 },
      { id: 'S2', lot_id: 'LOT-1', title: 'Pesée', poids: 1.8, date: '2026-01-20' },
      { id: 'S3', lot_id: 'LOT-1', title: 'Désinfection bâtiment', date: '2026-01-10' },
    ],
    alimentationLogs: [
      { id: 'A1', lot_id: 'LOT-1', quantite: 3, unite: 'sacs', date: '2026-01-07', cout: 45000 },
    ],
  });

  const types = history.events.map((e) => e.type);
  assert.ok(types.includes('vaccination'), 'la vaccination doit figurer');
  assert.ok(types.includes('pesée'), 'la pesée doit figurer');
  assert.ok(types.includes('biosécurité'), 'la biosécurité doit figurer');
  assert.ok(types.includes('alimentation'), 'l’alimentation doit figurer');

  // Les événements carnet de vie n'impactent pas l'effectif (delta 0).
  const carnet = history.events.filter((e) => ['vaccination', 'pesée', 'biosécurité', 'alimentation', 'soin'].includes(e.type));
  carnet.forEach((e) => assert.equal(e.delta, 0, `${e.type} ne doit pas modifier l'effectif`));

  // L'effectif reste cohérent (initial 100, actif 96).
  assert.equal(history.initial, 100);
  assert.equal(history.active, 96);
});

test('carnet de vie: rétrocompatible — sans santé/alimentation, comportement inchangé', () => {
  const base = buildLifecycleHistory({ mode: 'avicole', target: lot });
  const withEmpty = buildLifecycleHistory({ mode: 'avicole', target: lot, sante: [], alimentationLogs: [], weighings: [] });
  assert.equal(base.events.length, withEmpty.events.length);
  assert.equal(base.active, withEmpty.active);
});
