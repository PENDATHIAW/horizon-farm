import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFormPrefill,
  resolveRuleKey,
  applyDraftPrefill,
} from '../../src/utils/formPrefill.js';
import { buildWeighingDraft } from '../../src/utils/elevageWeighingNavigation.js';
import { buildPaymentDraft } from '../../src/utils/commercialPaymentNavigation.js';
import seed from '../../src/utils/horizonFarmSimulationSeed.js';

test('vocabulaire ERP : pesée et encaissement résolus vers leurs règles', () => {
  assert.equal(resolveRuleKey('pesee'), 'weighing');
  assert.equal(resolveRuleKey('animal_weighing'), 'weighing');
  assert.equal(resolveRuleKey('encaissement'), 'payment_record');
  assert.equal(resolveRuleKey('sale_payment'), 'payment_record');
});

test('pesée : hérite espèce/boucle/poids courant → poids précédent, sans le nouveau poids', () => {
  const bovin = seed.animaux.find((a) => a.id === 'HF-BOV-003');
  const pf = buildFormPrefill({ formType: 'weighing', subject: bovin, context: { farmId: 'HF' } });
  assert.equal(pf.values.animal_id, 'HF-BOV-003');
  assert.equal(pf.values.espece, bovin.espece || bovin.type);
  const attenduPoidsPrecedent = bovin.poids_actuel ?? bovin.poids;
  if (attenduPoidsPrecedent != null) assert.equal(pf.values.poids_precedent, attenduPoidsPrecedent);
  assert.equal('poids' in pf.values, false, 'le nouveau poids reste à saisir');
  assert.ok(pf.values.date, 'date préremplie');
});

test('pilote pesée : le brouillon reprend la fiche animal', () => {
  const bovin = seed.animaux.find((a) => a.id === 'HF-BOV-003');
  const draft = buildWeighingDraft({ animalId: bovin.id, subject: bovin });
  assert.equal(draft.animal_id, bovin.id);
  assert.equal(draft.espece, bovin.espece || bovin.type);
  assert.ok(Array.isArray(draft.prefill_applied) && draft.prefill_applied.length > 0);
});

test('pilote pesée : rétrocompatible sans sujet', () => {
  const draft = buildWeighingDraft({ animalId: 'A1' });
  assert.equal(draft.animal_id, 'A1');
  assert.equal('espece' in draft, false);
  assert.equal('prefill_applied' in draft, false);
});

test('encaissement : hérite client/facture/ferme et propose le reste à payer', () => {
  const order = { id: 'HF-CMD-050', client_id: 'HF-CLI-004', client_label: 'Restaurant Teranga', invoice_id: 'HF-FAC-050', farm_id: 'HF' };
  const pf = buildFormPrefill({ formType: 'payment_record', subject: order, context: { remaining: 125000, method: 'wave' } });
  assert.equal(pf.values.order_id, 'HF-CMD-050');
  assert.equal(pf.values.client_id, 'HF-CLI-004');
  assert.equal(pf.values.client_nom, 'Restaurant Teranga');
  assert.equal(pf.values.invoice_id, 'HF-FAC-050');
  assert.equal(pf.values.montant, 125000);
  assert.equal(pf.values.moyen_paiement, 'wave');
});

test('encaissement : moyen de paiement par défaut = espèces si rien de connu', () => {
  const pf = buildFormPrefill({ formType: 'payment_record', subject: { id: 'X', client_id: 'C1' } });
  assert.equal(pf.values.moyen_paiement, 'especes');
  assert.equal(pf.provenance.moyen_paiement, 'default');
});

test('pilote encaissement : le brouillon reprend la commande, montant = reste à payer', () => {
  const order = { id: 'HF-CMD-051', client_id: 'HF-CLI-004', farm_id: 'HF' };
  const draft = buildPaymentDraft({ subject: order, remaining: 90000, method: 'orange_money' });
  assert.equal(draft.order_id, 'HF-CMD-051');
  assert.equal(draft.montant, 90000);
  assert.equal(draft.moyen_paiement, 'orange_money');
  assert.ok(draft.prefill_applied.includes('order_id'));
});

test('pilote encaissement : rétrocompatible sans sujet', () => {
  const draft = buildPaymentDraft({ remaining: 1000 });
  assert.equal('order_id' in draft, false);
  assert.equal('prefill_applied' in draft, false);
});

test('central : openFormModal-like applyDraftPrefill couvre pesée et encaissement', () => {
  const bovin = seed.animaux.find((a) => a.id === 'HF-BOV-003');
  const weigh = applyDraftPrefill({ form_type: 'pesee', subject: bovin, draft_fields: {} });
  assert.ok(weigh.draft_fields.espece, 'pesée enrichie au passage central');

  const order = { id: 'HF-CMD-052', client_id: 'HF-CLI-004', farm_id: 'HF' };
  const pay = applyDraftPrefill({ form_type: 'encaissement', subject: order, context: { remaining: 42000 }, draft_fields: {} });
  assert.equal(pay.draft_fields.order_id, 'HF-CMD-052');
  assert.equal(pay.draft_fields.montant, 42000);
});

test('central : ne réécrit jamais une saisie déjà présente', () => {
  const order = { id: 'HF-CMD-053', client_id: 'C', farm_id: 'HF' };
  const pay = applyDraftPrefill({ form_type: 'encaissement', subject: order, context: { remaining: 42000 }, draft_fields: { montant: 30000 } });
  assert.equal(pay.draft_fields.montant, 30000, 'le montant saisi est préservé');
});
