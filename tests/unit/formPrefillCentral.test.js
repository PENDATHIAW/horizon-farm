import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDraftPrefill,
  resolveRuleKey,
} from '../../src/utils/formPrefill.js';
import { openFormModal } from '../../src/services/formModalManager.js';
import seed from '../../src/utils/horizonFarmSimulationSeed.js';

test('résolution du vocabulaire ERP → règle d\'héritage', () => {
  assert.equal(resolveRuleKey('health_action'), 'sante_intervention');
  assert.equal(resolveRuleKey('purchase_stock'), 'purchase_reception');
  assert.equal(resolveRuleKey('supplier_invoice'), 'purchase_reception');
  assert.equal(resolveRuleKey('finance_entry'), 'finance_entry');
  assert.equal(resolveRuleKey('abattage'), 'transformation_slaughter');
  assert.equal(resolveRuleKey('inconnu'), null);
});

test('central : un formulaire santé (module élevage) hérite du sujet', () => {
  const bovin = seed.animaux.find((a) => a.id === 'HF-BOV-003');
  const draft = { form_type: 'health_action', subject: bovin, draft_fields: {} };
  const out = applyDraftPrefill(draft);
  assert.equal(out.draft_fields.espece, bovin.espece || bovin.type);
  assert.equal(out.draft_fields.poids, bovin.poids);
  assert.ok(out.prefill_applied.includes('espece'));
});

test('central : un formulaire achat (module achats/stock) hérite du produit stock', () => {
  const stock = seed.stock.find((s) => /aliment/i.test(s.produit || ''));
  const draft = { form_type: 'purchase_stock', subject: stock, draft_fields: {} };
  const out = applyDraftPrefill(draft);
  assert.equal(out.draft_fields.produit, stock.produit);
  assert.equal(out.draft_fields.stock_id, stock.id);
});

test('central : un formulaire finance (module finance) hérite du contexte', () => {
  const draft = { form_type: 'finance_entry', subject: { id: 'X', farm_id: 'HF' }, context: { activite: 'bovins', sens: 'sortie' }, draft_fields: {} };
  const out = applyDraftPrefill(draft);
  assert.equal(out.draft_fields.activite, 'bovins');
  assert.equal(out.draft_fields.type, 'sortie');
  assert.equal(out.draft_fields.related_id, 'X');
});

test('central : sans sujet ou form_type inconnu = brouillon inchangé', () => {
  const noSubject = applyDraftPrefill({ form_type: 'health_action', draft_fields: { a: 1 } });
  assert.equal('prefill_applied' in noSubject, false);
  const unknown = applyDraftPrefill({ form_type: 'zzz', subject: { id: 'X' }, draft_fields: {} });
  assert.equal('prefill_applied' in unknown, false);
});

test('central : ne réécrit pas un champ déjà saisi', () => {
  const bovin = seed.animaux.find((a) => a.id === 'HF-BOV-003');
  const draft = { form_type: 'health_action', subject: bovin, draft_fields: { poids: 999 } };
  const out = applyDraftPrefill(draft);
  assert.equal(out.draft_fields.poids, 999, 'la saisie existante est préservée');
});

test('openFormModal applique l\'héritage au passage (tout l\'ERP)', () => {
  const bovin = seed.animaux.find((a) => a.id === 'HF-BOV-003');
  const detail = openFormModal({ module: 'elevage', draft: { form_type: 'health_action', subject: bovin, draft_fields: {} } });
  assert.ok(detail.draft.draft_fields.espece, 'le brouillon émis est déjà enrichi');
  assert.ok(Array.isArray(detail.draft.prefill_applied));
});
