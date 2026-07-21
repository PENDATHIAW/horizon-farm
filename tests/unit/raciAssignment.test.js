import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inferRaciProcess,
  enrichWithRaci,
  taskOwnerForProcess,
} from '../../src/config/raciAssignment.js';
import { RACI_MATRIX, accountableRole } from '../../src/config/raci.config.js';

test('inferRaciProcess : déduit le processus depuis le vocabulaire ERP', () => {
  assert.equal(inferRaciProcess({ title: 'Relance créance client X' }), 'relance_creance');
  assert.equal(inferRaciProcess({ type: 'encaissement paiement' }), 'encaissement');
  assert.equal(inferRaciProcess({ module_lie: 'abattage lot chair' }), 'abattage_transformation');
  assert.equal(inferRaciProcess({ decision_key: 'reforme_pondeuses' }), 'reforme');
  assert.equal(inferRaciProcess({ title: 'Mortalité constatée' }), 'mortalite');
  assert.equal(inferRaciProcess({ type: 'vaccination newcastle' }), 'vaccination');
  assert.equal(inferRaciProcess({ title: 'Distribution aliment matin' }), 'distribution_aliment');
  assert.equal(inferRaciProcess({ title: 'Pesée hebdomadaire' }), 'pesee');
  assert.equal(inferRaciProcess({ module_lie: 'réception commande fournisseur' }), 'achat_reception');
  assert.equal(inferRaciProcess({ type: 'investissement matériel' }), 'investissement');
  assert.equal(inferRaciProcess({ title: 'Vente 3 têtes' }), 'vente');
});

test('inferRaciProcess : un raci_process explicite et valide est respecté', () => {
  assert.equal(inferRaciProcess({ raci_process: 'biosecurite' }), 'biosecurite');
});

test('inferRaciProcess : indéterminé → null', () => {
  assert.equal(inferRaciProcess({ title: 'note libre sans mot-clé' }), null);
  assert.equal(inferRaciProcess({}), null);
});

test('enrichWithRaci : additif et non destructif', () => {
  const record = { id: 'T1', title: 'Relance créance', montant: 1000, statut: 'ouvert' };
  const out = enrichWithRaci(record);
  // Champs d'origine préservés
  assert.equal(out.id, 'T1');
  assert.equal(out.montant, 1000);
  assert.equal(out.statut, 'ouvert');
  // Champs RACI ajoutés
  assert.equal(out.raci_process, 'relance_creance');
  assert.equal(out.raci_owner_role, 'finance');
  assert.deepEqual(out.raci_owner_roles, ['finance']);
  assert.equal(out.raci_accountable_role, 'responsable_filiere');
  assert.ok(Array.isArray(out.raci_notify_roles));
  // Cohérence avec la matrice source
  assert.equal(out.raci_accountable_role, accountableRole('relance_creance'));
});

test('enrichWithRaci : processus explicite prioritaire sur l\'inférence', () => {
  const out = enrichWithRaci({ title: 'note vague' }, 'vaccination');
  assert.equal(out.raci_process, 'vaccination');
  assert.equal(out.raci_accountable_role, 'veterinaire');
});

test('enrichWithRaci : sans processus déductible = enregistrement inchangé', () => {
  const record = { id: 'X', title: 'blabla' };
  const out = enrichWithRaci(record);
  assert.equal(out, record);
  assert.equal('raci_process' in out, false);
});

test('taskOwnerForProcess : renvoie le premier Responsable', () => {
  assert.equal(taskOwnerForProcess('soin_sante'), 'terrain');
  assert.equal(taskOwnerForProcess('vente'), 'responsable_filiere');
  assert.equal(taskOwnerForProcess('inexistant'), null);
});

test('chaque processus de la matrice est adressable via enrichWithRaci', () => {
  for (const process of Object.keys(RACI_MATRIX)) {
    const out = enrichWithRaci({}, process);
    assert.equal(out.raci_process, process);
    assert.ok(out.raci_owner_role, `${process} a un responsable`);
    assert.ok(out.raci_accountable_role, `${process} a un approbateur`);
  }
});
