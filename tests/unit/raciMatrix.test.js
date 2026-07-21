import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RACI_MATRIX,
  RACI_ROLES,
  responsibleRoles,
  accountableRole,
  consultedRoles,
  rolesToNotify,
  canApprove,
  raciRoleFor,
  raciProcesses,
  validateRaciMatrix,
} from '../../src/config/raci.config.js';

test('intégrité RACI : un et un seul approbateur par processus, au moins un responsable', () => {
  const { ok, errors } = validateRaciMatrix();
  assert.deepEqual(errors, [], errors.join('\n'));
  assert.equal(ok, true);
});

test('tous les rôles cités existent dans la liste officielle', () => {
  Object.values(RACI_MATRIX).forEach((map) => {
    Object.keys(map).forEach((role) => assert.ok(RACI_ROLES.includes(role), `rôle inconnu : ${role}`));
  });
});

test('helpers : responsable / approbateur / consulté / notifiés', () => {
  assert.deepEqual(responsibleRoles('vente'), ['responsable_filiere']);
  assert.equal(accountableRole('vente'), 'promotrice_direction');
  assert.deepEqual(consultedRoles('soin_sante'), ['responsable_filiere']);
  // Les notifiés incluent les Informés et l'Approbateur.
  const notify = rolesToNotify('vente');
  assert.ok(notify.includes('promotrice_direction') && notify.includes('finance') && notify.includes('terrain'));
});

test('permission : seul l\'approbateur peut valider', () => {
  assert.equal(canApprove('promotrice_direction', 'vente'), true);
  assert.equal(canApprove('terrain', 'vente'), false);
  assert.equal(canApprove('veterinaire', 'soin_sante'), true);
  assert.equal(canApprove('terrain', 'soin_sante'), false);
});

test('part RACI d\'un rôle sur un processus', () => {
  assert.equal(raciRoleFor('terrain', 'soin_sante'), 'R');
  assert.equal(raciRoleFor('veterinaire', 'soin_sante'), 'A');
  assert.equal(raciRoleFor('finance', 'soin_sante'), null);
});

test('le vétérinaire est l\'approbateur des actes vétérinaires, pas des ventes', () => {
  assert.equal(accountableRole('vaccination'), 'veterinaire');
  assert.equal(accountableRole('soin_sante'), 'veterinaire');
  assert.notEqual(accountableRole('vente'), 'veterinaire');
  assert.notEqual(accountableRole('encaissement'), 'veterinaire');
});

test('la finance porte l\'encaissement et les dépenses', () => {
  assert.ok(responsibleRoles('encaissement').includes('finance'));
  assert.ok(responsibleRoles('depense_charge').includes('finance'));
  assert.equal(raciProcesses().length, Object.keys(RACI_MATRIX).length);
});
