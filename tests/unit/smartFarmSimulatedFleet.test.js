import test from 'node:test';
import assert from 'node:assert/strict';
import { SMARTFARM_SIMULATED_FLEET, buildSimulatedFleetSummary } from '../../src/config/smartFarmSimulatedFleet.js';

test('parc simulé — 86 capteurs bien formés', () => {
  assert.equal(SMARTFARM_SIMULATED_FLEET.length, 86);
  SMARTFARM_SIMULATED_FLEET.forEach((d) => {
    assert.ok(d.id && d.name && d.categorie && d.zone && d.type, `champ manquant sur ${d.id}`);
    assert.ok(['ras', 'alerte', 'hors_ligne'].includes(d.etat));
    assert.ok(d.apport && d.apport.length > 10, 'chaque capteur a un apport décrit');
    if (d.etat === 'alerte') {
      assert.ok(['urgence', 'critique', 'warning'].includes(d.gravite));
      assert.ok(d.action, 'une alerte propose une action');
    }
  });
});

test('synthèse — compteurs cohérents', () => {
  const s = buildSimulatedFleetSummary();
  assert.equal(s.total, 86);
  assert.equal(s.actifs + s.horsLigne, 86);
  assert.equal(s.actions, s.alertes);
  assert.ok(s.alertes > 0 && s.alertes < 86, 'un mélange réaliste, pas tout en alerte');
  assert.ok(s.zonesCount >= 8, 'plusieurs zones de la ferme couvertes');
});

test('IDs uniques', () => {
  const ids = new Set(SMARTFARM_SIMULATED_FLEET.map((d) => d.id));
  assert.equal(ids.size, SMARTFARM_SIMULATED_FLEET.length);
});
