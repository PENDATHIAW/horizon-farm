import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterRealOpenAlerts,
  filterRealOpenTasks,
  isObsoleteOperationalRecord,
} from '../../src/utils/healthFindingLabels.js';
import { valeurKpi } from '../../src/config/catalogueKpi.js';

const referenceDate = new Date('2026-07-16T12:00:00Z');

test('retire des priorités les diagnostics techniques internes', () => {
  const tasks = [
    { id: 'UX-1', title: 'Récursion UX formulaire : stock:stock_purchase', status: 'a_faire' },
    { id: 'UX-2', title: 'Doublons fonctionnels : elevage', status: 'a_faire' },
    { id: 'UX-3', title: 'Contrôle technique', category: 'interne', entity_type: 'audit_erp', status: 'a_faire' },
    { id: 'REAL-1', title: 'Vacciner le lot A', status: 'a_faire' },
  ];

  assert.deepEqual(filterRealOpenTasks(tasks).map((task) => task.id), ['REAL-1']);
});

test('une fête passée est obsolète mais une prochaine fête reste active', () => {
  const past = { title: 'Tabaski', due_date: '2026-06-08', status: 'a_faire' };
  const future = { title: 'Préparer Magal', target_date: '2026-08-04', status: 'a_faire' };

  assert.equal(isObsoleteOperationalRecord(past, referenceDate), true);
  assert.equal(isObsoleteOperationalRecord(future, referenceDate), false);
});

test('archive une ancienne fausse alerte BFR mais conserve une tâche métier en retard', () => {
  const tasks = [
    { id: 'BFR', title: 'Lancement suspendu - trésorerie insuffisante', due_date: '2026-06-10', assigned_to: 'TEAM-FERME', module_lie: 'centre_decisionnel', status: 'a_faire' },
    { id: 'REAL', title: 'Réparer la pompe', due_date: '2026-06-10', assigned_to: 'Awa', module_lie: 'equipements', status: 'a_faire' },
  ];

  assert.equal(isObsoleteOperationalRecord(tasks[0], referenceDate), true);
  assert.equal(isObsoleteOperationalRecord(tasks[1], referenceDate), false);
});

test('filtre aussi les alertes saisonnières expirées', () => {
  const alerts = [
    { id: 'A1', title: 'Tabaski', expires_at: '2026-05-27', status: 'nouvelle' },
    { id: 'A2', title: 'Mortalité lot A', status: 'nouvelle' },
  ];

  const visible = alerts.filter((alert) => !isObsoleteOperationalRecord(alert, referenceDate));
  assert.deepEqual(visible.map((alert) => alert.id), ['A2']);
  assert.deepEqual(filterRealOpenAlerts([{ ...alerts[0], status: 'resolue' }, alerts[1]]).map((alert) => alert.id), ['A2']);
});

test('les KPI de tâches et alertes ne comptent que les éléments métier actifs', () => {
  const data = {
    taches: [
      { id: 'UX', title: 'Doublons fonctionnels : elevage', status: 'a_faire' },
      { id: 'T1', title: 'Réparer pompe', status: 'a_faire' },
    ],
    alertes_center: [
      { id: 'A-OLD', title: 'Tabaski', expires_at: '2026-05-27', severity: 'critique', status: 'nouvelle' },
      { id: 'A1', title: 'Mortalité', severity: 'critique', status: 'nouvelle' },
    ],
  };

  assert.equal(valeurKpi('taches_ouvertes', data).valeur, 1);
  assert.equal(valeurKpi('alertes_urgentes', data).valeur, 1);
});
