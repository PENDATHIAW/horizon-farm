import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIssueGroups, summarizeIssueGroups } from '../../src/services/issueGroupingService.js';
import { buildEquipmentSmartFarmSummary, orphanSmartFarmDevices } from '../../src/services/equipmentSmartFarmBridge.js';
import { auditRhPayrollFinanceGaps } from '../../src/services/rhPayrollFinanceSyncService.js';

test('buildIssueGroups regroupe alerte et tâche par issue_key', () => {
  const key = 'finances:finances:TRX-1:impaye';
  const groups = buildIssueGroups({
    alertes: [{ id: 'A1', issue_key: key, title: 'Impayé client', status: 'nouvelle', source_module: 'finances', source_record_id: 'TRX-1' }],
    taches: [{ id: 'T1', issue_key: key, title: 'Relancer client', status: 'ouverte', source_module: 'finances', source_record_id: 'TRX-1' }],
  });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].itemCount, 2);
  assert.equal(summarizeIssueGroups(groups).open, 1);
});

test('buildEquipmentSmartFarmSummary lie capteur par equipment_id', () => {
  const summary = buildEquipmentSmartFarmSummary(
    [{ id: 'EQ-1', name: 'Pompe', zone: 'serre' }],
    [{ id: 'S1', equipment_id: 'EQ-1', name: 'Humidité' }],
    [],
  );
  assert.equal(summary[0].totalDevices, 1);
  assert.equal(orphanSmartFarmDevices([{ id: 'EQ-1' }], [{ id: 'S2' }], []).length, 1);
});

test('auditRhPayrollFinanceGaps détecte salaire sans finance', () => {
  const audit = auditRhPayrollFinanceGaps({
    rh: [{ id: 'EMP-1', nom: 'Awa', statut: 'actif', salaire_mensuel: 85000 }],
    transactions: [],
  });
  assert.equal(audit.gaps.length, 1);
});
