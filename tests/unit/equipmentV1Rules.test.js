import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEquipmentPurchaseWorkflow, buildValidatedEquipmentRepairWorkflow, equipmentFinanceCosts, validateEquipmentRecommission } from '../../src/utils/equipmentWorkflows.js';

test('la remise en service exige validation, résultat, date et responsable', () => {
  assert.equal(validateEquipmentRecommission({}).ok, false);
  assert.equal(validateEquipmentRecommission({ validated: true, result: 'Test OK', date: '2026-07-12' }).ok, false);
  const valid = validateEquipmentRecommission({ validated: true, result: 'Test OK', date: '2026-07-12', responsible: 'EMP-1' });
  assert.equal(valid.ok, true);
});

test('la réparation ne recopie aucun coût local dans la fiche équipement', () => {
  const workflow = buildValidatedEquipmentRepairWorkflow({ equipment: { id: 'EQP-1', name: 'Pompe' }, cost: 25000, result: 'Pression contrôlée', date: '2026-07-12', responsible: 'EMP-1', validated: true });
  assert.equal(workflow.ok, true);
  assert.equal(workflow.equipmentPatch.repair_cost, undefined);
  assert.equal(workflow.equipmentPatch.cout_reparation, undefined);
  assert.equal(workflow.financeTransaction.montant, 25000);
  assert.equal(workflow.equipmentPatch.recommissioned_by, 'EMP-1');
});

test('les coûts équipement sont lus uniquement depuis Finance', () => {
  const total = equipmentFinanceCosts([{ id: 'F-1', type: 'sortie', related_id: 'EQP-1', montant: 10000 }, { id: 'F-2', type: 'entree', related_id: 'EQP-1', montant: 5000 }, { id: 'F-3', type: 'sortie', related_id: 'EQP-2', montant: 90000 }], 'EQP-1');
  assert.equal(total, 10000);
});

test('une acquisition prépare une dépense validée et une preuve unique', () => {
  const workflow = buildEquipmentPurchaseWorkflow({ payload: { id: 'EQP-1', name: 'Pompe', purchase_cost: 150000, justificatif_url: 'https://example.test/preuve.pdf' }, date: '2026-07-12' });
  assert.equal(workflow.equipment.id, 'EQP-1');
  assert.equal(workflow.financeTransaction.status, 'validee');
  assert.equal(workflow.financeTransaction.cash_effect, false);
  assert.equal(workflow.document.file_url, 'https://example.test/preuve.pdf');
  assert.equal(workflow.document.transaction_id, workflow.financeTransaction.id);
});
