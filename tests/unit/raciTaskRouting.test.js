import test from 'node:test';
import assert from 'node:assert/strict';
import {
  memberMatchesRole,
  raciAssigneeSuggestion,
  raciNotifyTargets,
  routeTaskWithRaci,
} from '../../src/utils/raciTaskRouting.js';
import { buildTaskFromAlert } from '../../src/utils/taskWorkflows.js';

const PEOPLE = [
  { id: 'EMP1', nom: 'Awa Ndiaye', role: 'terrain', statut: 'actif' },
  { id: 'EMP2', nom: 'Dr Sow', role: 'vétérinaire', statut: 'actif' },
  { id: 'EMP3', nom: 'Fatou Ba', role: 'finance', statut: 'actif' },
  { id: 'EMP4', nom: 'Ancien Berger', role: 'terrain', statut: 'inactif' },
];

test('memberMatchesRole : rôle exact, synonyme, déclaré, ou aucun', () => {
  assert.equal(memberMatchesRole({ role: 'terrain' }, 'terrain'), true);
  assert.equal(memberMatchesRole({ role: 'Soigneur' }, 'terrain'), true); // synonyme
  assert.equal(memberMatchesRole({ role: 'vétérinaire' }, 'veterinaire'), true); // accents
  assert.equal(memberMatchesRole({ role: 'x', raci_role: 'finance' }, 'finance'), true); // déclaré
  assert.equal(memberMatchesRole({ role: 'terrain' }, 'finance'), false);
  assert.equal(memberMatchesRole({ role: '' }, 'terrain'), false);
});

test('raciAssigneeSuggestion : premier membre actif du rôle Responsable', () => {
  const task = { title: 'Vaccination Newcastle', module_lie: 'sante' };
  const s = raciAssigneeSuggestion(task, PEOPLE); // vaccination → responsable = terrain
  assert.equal(s.role, 'terrain');
  assert.equal(s.member_id, 'EMP1', 'le membre inactif est ignoré');
});

test('raciAssigneeSuggestion : rôle connu mais aucun membre → member_id null', () => {
  const task = { title: 'Relance créance client', module_lie: 'commercial' };
  const s = raciAssigneeSuggestion(task, []); // relance → finance, aucun people
  assert.equal(s.role, 'finance');
  assert.equal(s.member_id, null);
});

test('raciAssigneeSuggestion : sans processus déductible → null', () => {
  assert.equal(raciAssigneeSuggestion({ title: 'note vague' }, PEOPLE), null);
});

test('raciNotifyTargets : Informés + Approbateur résolus, inactifs exclus, dédupliqués', () => {
  const task = { title: 'Vaccination', module_lie: 'sante' }; // notify = veterinaire (A) + responsable_filiere (I)
  const targets = raciNotifyTargets(task, PEOPLE);
  const ids = targets.map((t) => t.member_id);
  assert.ok(ids.includes('EMP2'), 'le vétérinaire (approbateur) est notifié');
  assert.equal(ids.filter((id) => id === 'EMP2').length, 1, 'pas de doublon');
});

test('routeTaskWithRaci : additif, ne touche pas assigned_to', () => {
  const task = { id: 'T1', title: 'Encaissement paiement', module_lie: 'ventes', assigned_to: 'TEAM-FERME' };
  const out = routeTaskWithRaci(task, PEOPLE);
  assert.equal(out.assigned_to, 'TEAM-FERME', 'assignation existante préservée');
  assert.equal(out.raci_process, 'encaissement');
  assert.equal(out.raci_owner_role, 'finance');
  assert.equal(out.raci_suggested_assignee_id, 'EMP3');
  assert.ok(Array.isArray(out.raci_notify_targets));
});

test('routeTaskWithRaci : tâche sans processus renvoyée inchangée', () => {
  const task = { id: 'T2', title: 'blabla' };
  const out = routeTaskWithRaci(task, PEOPLE);
  assert.equal(out, task);
  assert.equal('raci_process' in out, false);
});

test('buildTaskFromAlert : la tâche porte sa gouvernance RACI (additif, tout l\'ERP)', () => {
  const alert = { id: 'AL1', module: 'sante', title: 'Vaccination Newcastle lot HF-CH-003', severity: 'critique' };
  const { task } = buildTaskFromAlert(alert, [], '2026-07-21', { people: PEOPLE });
  assert.equal(task.raci_process, 'vaccination');
  assert.equal(task.raci_owner_role, 'terrain');
  assert.equal(task.raci_suggested_assignee_id, 'EMP1');
  assert.equal(task.assigned_to, 'TEAM-FERME', 'assignation par défaut inchangée');
});

test('buildTaskFromAlert : rétrocompatible sans annuaire (rôles seuls)', () => {
  const alert = { id: 'AL2', module: 'commercial', title: 'Relance créance', severity: 'haute' };
  const { task } = buildTaskFromAlert(alert, [], '2026-07-21');
  assert.equal(task.raci_process, 'relance_creance');
  assert.equal(task.raci_owner_role, 'finance');
  assert.equal(task.raci_suggested_assignee_id, null);
});
