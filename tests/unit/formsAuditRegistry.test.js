import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_FORM_FIELDS } from '../../src/utils/constants.js';
import { governFormFields } from '../../src/utils/formFieldGovernance.js';
import {
  formSimulationScenarios,
  formSimulationModules,
} from '../../src/audit/formSimulationScenarios.js';

const REGISTRY_KEYS = Object.keys(MODULE_FORM_FIELDS);

test('MODULE_FORM_FIELDS contient les modules commerce critiques', () => {
  const required = ['sales_orders', 'payments', 'clients', 'stock', 'finances', 'animaux', 'avicole'];
  required.forEach((key) => assert.ok(MODULE_FORM_FIELDS[key], `missing registry key: ${key}`));
});

test('chaque entrée registry a au moins un champ avec key et label', () => {
  REGISTRY_KEYS.forEach((moduleKey) => {
    const fields = MODULE_FORM_FIELDS[moduleKey];
    assert.ok(Array.isArray(fields) && fields.length > 0, `${moduleKey} empty`);
    fields.forEach((field, index) => {
      if (field.type === 'section') return;
      assert.ok(field.key, `${moduleKey} field ${index} missing key`);
      assert.ok(field.label, `${moduleKey} field ${field.key} missing label`);
    });
  });
});

test('animaux utilise showWhen pour champs conditionnels métier', () => {
  const animaux = MODULE_FORM_FIELDS.animaux;
  const conditional = animaux.filter((f) => f.showWhen);
  assert.ok(conditional.length >= 10, 'animaux should have many conditional fields');
  const venduVisible = animaux.filter((f) => f.showWhen?.({ status: 'vendu' }));
  assert.ok(venduVisible.length >= 3, 'expected several fields visible when animal is sold');
});

test('sante registry est minimal vs attentes audit adaptatif', () => {
  const sante = MODULE_FORM_FIELDS.sante;
  assert.ok(sante.length <= 12, 'legacy sante registry should stay small — adaptive form is SanteV6');
  assert.ok(!sante.some((f) => f.key === 'type_intervention'), 'type_intervention belongs to SanteV6 not constants');
});

test('formFieldGovernance renforce stock et finances', () => {
  const stock = governFormFields('stock', MODULE_FORM_FIELDS.stock);
  const categorie = stock.find((f) => f.key === 'categorie');
  assert.equal(categorie?.type, 'select');
  assert.equal(categorie?.required, true);

  const finances = governFormFields('finances', MODULE_FORM_FIELDS.finances);
  const moduleLie = finances.find((f) => f.key === 'module_lie');
  assert.equal(moduleLie?.type, 'select');
});

test('formSimulationScenarios modules sont documentés', () => {
  assert.ok(formSimulationModules.length >= 8);
  formSimulationScenarios.forEach((moduleBlock) => {
    assert.ok(moduleBlock.module, 'scenario block needs module name');
    assert.ok(moduleBlock.scenarios?.length > 0, `${moduleBlock.module} needs scenarios`);
    moduleBlock.scenarios.forEach((scenario) => {
      assert.ok(scenario.id, `${moduleBlock.module} scenario needs id`);
      assert.ok(scenario.requiredFields?.length > 0, `${scenario.id} needs requiredFields`);
    });
  });
});

test('ventes et sales_orders coexistent — documenter double schéma', () => {
  assert.ok(MODULE_FORM_FIELDS.ventes);
  assert.ok(MODULE_FORM_FIELDS.sales_orders);
  const ventesKeys = MODULE_FORM_FIELDS.ventes.map((f) => f.key);
  const orderKeys = MODULE_FORM_FIELDS.sales_orders.map((f) => f.key);
  assert.notDeepEqual(ventesKeys, orderKeys, 'ventes and sales_orders should differ — audit tracks canonical path');
});
