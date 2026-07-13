import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIssueGroups, summarizeIssueGroups } from '../../src/services/issueGroupingService.js';
import { buildSmartFarmDeviceFollowUp } from '../../src/utils/smartFarmWorkflows.js';
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

test('buildSmartFarmDeviceFollowUp prépare le suivi d’un capteur critique', () => {
  const followUp = buildSmartFarmDeviceFollowUp({
    device: { id: 'S1', name: 'Humidité', status: 'offline', zone: 'serre' },
  });
  assert.equal(followUp.alert.entity_id, 'S1');
  assert.equal(followUp.task.source_record_id, 'S1');
  assert.equal(followUp.event.event_type, 'smartfarm_signal_critique');
});

test('auditRhPayrollFinanceGaps détecte salaire sans finance', () => {
  const audit = auditRhPayrollFinanceGaps({
    rh: [{ id: 'EMP-1', nom: 'Awa', statut: 'actif', salaire_mensuel: 85000 }],
    transactions: [],
  });
  assert.equal(audit.gaps.length, 1);
});
