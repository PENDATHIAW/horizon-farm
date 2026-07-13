import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  resolveCarteKpi,
  selectJournalEvenements,
  selectListeAlertes,
  selectListeTaches,
} from '../../src/components/shared/dataFilters.js';

test('JournalEvenements filtre la ferme et le module puis déduplique event_key', () => {
  const events = [
    { id: 'e1', event_key: 'egg:f1:2026-07-12', farm_id: 'f1', module_source: 'elevage', event_type: 'ponte', entity_type: 'lot', entity_id: 'l1', event_date: '2026-07-12', title: 'Ponte' },
    { id: 'e2', event_key: 'egg:f1:2026-07-12', farm_id: 'f1', module_source: 'elevage', event_type: 'ponte', entity_type: 'lot', entity_id: 'l1', event_date: '2026-07-12', title: 'Rejeu' },
    { id: 'e3', event_key: 'egg:f2:2026-07-12', farm_id: 'f2', module_source: 'elevage', event_type: 'ponte', entity_type: 'lot', entity_id: 'l1', event_date: '2026-07-12' },
    { id: 'e4', farm_id: 'f1', module_source: 'cultures', event_type: 'recolte', entity_type: 'parcelle', entity_id: 'p1', event_date: '2026-07-12' },
  ];
  const selected = selectJournalEvenements({ events, farmId: 'f1', module: 'elevage', recordType: 'lot', recordId: 'l1' });
  assert.equal(selected.length, 1);
  assert.equal(selected[0].event_key, 'egg:f1:2026-07-12');
});

test('ListeTaches applique affectation, liaison alerte et déduplication métier', () => {
  const tasks = [
    { id: 't1', task_dedupe_key: 'alert:a1', farm_id: 'f1', assigned_to: 'u1', alert_id: 'a1', status: 'a_faire' },
    { id: 't2', task_dedupe_key: 'alert:a1', farm_id: 'f1', assigned_to: 'u1', alert_id: 'a1', status: 'a_faire' },
    { id: 't3', farm_id: 'f1', assigned_to: 'u2', alert_id: 'a1', status: 'a_faire' },
    { id: 't4', farm_id: 'f2', assigned_to: 'u1', alert_id: 'a1', status: 'a_faire' },
  ];
  const selected = selectListeTaches({ tasks, farmId: 'f1', assignedTo: 'u1', alertId: 'a1', statuses: ['a_faire'] });
  assert.equal(selected.length, 1);
  assert.equal(selected[0].task_dedupe_key, 'alert:a1');
});

test('ListeTaches place les priorités hautes et les échéances proches en premier', () => {
  const selected = selectListeTaches({ tasks: [
    { id: 'normal', priority: 'normale', due_date: '2026-07-12' },
    { id: 'late-high', priority: 'haute', due_date: '2026-07-15' },
    { id: 'early-high', priority: 'haute', due_date: '2026-07-13' },
  ] });
  assert.deepEqual(selected.map((task) => task.id), ['early-high', 'late-high', 'normal']);
});

test('ListeAlertes respecte code, gravité, statut, ferme et clé de déduplication', () => {
  const alerts = [
    { id: 'a1', alert_dedupe_key: 'stock:f1:p1', farm_id: 'f1', module_source: 'stock', code: 'stock_bas', severity: 'critique', status: 'nouvelle' },
    { id: 'a2', alert_dedupe_key: 'stock:f1:p1', farm_id: 'f1', module_source: 'stock', code: 'stock_bas', severity: 'critique', status: 'nouvelle' },
    { id: 'a3', farm_id: 'f1', module_source: 'stock', code: 'stock_bas', severity: 'info', status: 'nouvelle' },
    { id: 'a4', farm_id: 'f2', module_source: 'stock', code: 'stock_bas', severity: 'critique', status: 'nouvelle' },
  ];
  const selected = selectListeAlertes({ alerts, farmId: 'f1', module: 'achats_stock', codes: ['stock_bas'], severities: ['critique'], statuses: ['nouvelle'] });
  assert.equal(selected.length, 1);
  assert.equal(selected[0].alert_dedupe_key, 'stock:f1:p1');
});

test('CarteKPI lit valeur et provenance sans recalcul local', () => {
  const selected = resolveCarteKpi({
    code: 'ca',
    farmId: 'f1',
    period: 'Juillet 2026',
    catalog: [{ code: 'ca', label: 'Chiffre affaires', owner_module: 'commercial', unit: 'FCFA' }],
    values: [{ code: 'ca', farm_id: 'f1', period: 'Juillet 2026', value: 125000, source: 'Ventes validées' }],
  });
  assert.deepEqual(selected, {
    code: 'ca',
    label: 'Chiffre affaires',
    owner_module: 'commercial',
    unit: 'FCFA',
    farm_id: 'f1',
    period: 'Juillet 2026',
    value: 125000,
    source: 'Ventes validées',
  });
});

test('les cinq consommateurs utilisent les composants partagés sans listes locales actives', () => {
  const sources = {
    accueil: fs.readFileSync('src/modules/dashboard/AccueilConforme.jsx', 'utf8'),
    activiteTasks: fs.readFileSync('src/modules/activiteSuivi/tabs/ATraiterMaintenantTab.jsx', 'utf8'),
    activiteAlerts: fs.readFileSync('src/modules/activiteSuivi/tabs/AlertesLieesTab.jsx', 'utf8'),
    activiteJournal: fs.readFileSync('src/modules/activiteSuivi/tabs/RegistreTracabiliteTab.jsx', 'utf8'),
    elevage: fs.readFileSync('src/modules/ElevageRecoveredModule.jsx', 'utf8'),
    cultures: fs.readFileSync('src/modules/CulturesRecoveredModule.jsx', 'utf8'),
    centre: fs.readFileSync('src/modules/centre/CentreDecisionModule.jsx', 'utf8'),
  };
  assert.match(sources.accueil, /CarteKPI/);
  assert.match(sources.accueil, /JournalEvenements/);
  assert.match(sources.accueil, /ListeTaches/);
  assert.match(sources.accueil, /ListeAlertes/);
  assert.match(sources.activiteTasks, /ListeTaches/);
  assert.doesNotMatch(sources.activiteTasks, /TachesV3/);
  assert.match(sources.activiteAlerts, /ListeAlertes/);
  assert.doesNotMatch(sources.activiteAlerts, /AlertesCenterV3|AlertTaskBridgePanel/);
  assert.match(sources.activiteJournal, /JournalEvenements/);
  assert.doesNotMatch(sources.activiteJournal, /TracabiliteV2/);
  assert.match(sources.elevage, /JournalEvenements/);
  assert.doesNotMatch(sources.elevage, /function ElevageHistory/);
  assert.match(sources.cultures, /JournalEvenements/);
  assert.doesNotMatch(sources.cultures, /function CulturesHistory/);
  assert.match(sources.centre, /ListeAlertes/);
  assert.match(sources.centre, /ListeTaches/);
});
