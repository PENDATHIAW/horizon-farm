import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAbsenceSignal, normalizeTeamDirectory, sanitizeTeamMember } from '../../src/utils/teamDirectory.js';

test('la fiche membre exclut paie, pointage et données médicales', () => {
  const member = sanitizeTeamMember({ id: 'EMP-1', nom: 'Awa', salaire_mensuel: 1000, pointage: [], medical_notes: 'secret', user_id: 'USR-1' });
  assert.equal(member.salaire_mensuel, undefined);
  assert.equal(member.pointage, undefined);
  assert.equal(member.medical_notes, undefined);
  assert.equal(member.user_id, 'USR-1');
  assert.equal(normalizeTeamDirectory({ people: [member] }).people.length, 1);
});

test('une absence signale les tâches concernées sans les réaffecter', () => {
  const tasks = [{ id: 'TSK-1', assigned_to: 'EMP-1', status: 'a_faire' }, { id: 'TSK-2', assigned_to: 'EMP-2', status: 'a_faire' }];
  const before = structuredClone(tasks);
  const result = buildAbsenceSignal({ payload: { member_id: 'EMP-1', start_date: '2026-07-12', end_date: '2026-07-14' }, people: [{ id: 'EMP-1', nom: 'Awa' }], tasks });
  assert.equal(result.ok, true);
  assert.deepEqual(result.absence.affected_task_ids, ['TSK-1']);
  assert.deepEqual(result.taskPatches, []);
  assert.deepEqual(tasks, before);
  assert.match(result.alert.message, /sans réaffectation automatique/i);
});
