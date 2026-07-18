import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUnifiedAlerts,
  alertModuleFlags,
  alertModuleCounts,
  SEVERITY_RANK,
} from '../../src/utils/unifiedAlerts.js';

const baseDataMap = {
  alertes_center: [],
  sante: [{ id: 'S1', statut: 'retard', nom: 'Vaccin Newcastle' }],
  animaux: [{ id: 'A1', name: 'Vache 1', health_status: 'malade' }],
  avicole: [{ id: 'L1', name: 'Lot 1', initial_count: 100, mortality: 10 }],
  cultures: [{ id: 'C1', nom: 'Tomate', statut: 'perdu' }],
  stock: [{ id: 'ST1', produit: 'Maïs', quantite: 0, seuil: 50 }],
  equipements: [{ id: 'E1', nom: 'Tracteur', status: 'panne' }],
  finances: [
    { id: 'F1', libelle: 'Vente', montant: 5000, statut: 'impaye' },
    { id: 'F2', libelle: 'Carburant', montant: 20000, type: 'depense' },
  ],
  taches: [{ id: 'T1', title: 'Réparer', priority: 'critique', status: 'a_faire', due_date: '2020-01-01' }],
};

test('buildUnifiedAlerts — produit une liste normalisée et triée par gravité', () => {
  const alerts = buildUnifiedAlerts(baseDataMap, { online: true, weather: {} });
  assert.ok(alerts.length >= 7, `attendu >= 7 alertes, obtenu ${alerts.length}`);
  // Triées : la gravité ne décroît jamais.
  for (let i = 1; i < alerts.length; i += 1) {
    assert.ok(SEVERITY_RANK[alerts[i - 1].severity] <= SEVERITY_RANK[alerts[i].severity]);
  }
  // Chaque alerte a les champs de référence.
  alerts.forEach((a) => {
    assert.ok(a.id && a.type && a.issue_key && a.navModule);
    assert.ok(['urgence', 'critique', 'warning', 'info'].includes(a.severity));
  });
});

test('buildUnifiedAlerts — déduplique par issue_key (persisté gagne sur dérivé)', () => {
  const dataMap = {
    ...baseDataMap,
    alertes_center: [{
      id: 'PERSIST-1', code: 'stock_sous_seuil', entity_type: 'stock', entity_id: 'ST1',
      title: 'Alerte persistée', severity: 'urgence', status: 'nouvelle',
    }],
  };
  const alerts = buildUnifiedAlerts(dataMap, { online: true });
  const stockAlerts = alerts.filter((a) => a.entity_id === 'ST1' && a.code === 'stock_sous_seuil');
  assert.equal(stockAlerts.length, 1, 'le stock ST1 ne doit apparaître qu\'une fois');
  assert.equal(stockAlerts[0].source, 'persisted');
});

test('alertModuleFlags — la cloche et les pastilles lisent la même source', () => {
  const alerts = buildUnifiedAlerts(baseDataMap, { online: true });
  const flags = alertModuleFlags(alerts);
  const counts = alertModuleCounts(alerts);
  // Chaque module signalé a au moins une alerte dans la liste (cohérence).
  Object.keys(flags).forEach((mod) => {
    assert.equal(flags[mod], counts[mod] > 0);
  });
  // La somme des compteurs par module = total de la liste (aucune alerte perdue).
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  assert.equal(total, alerts.length);
  // Modules attendus présents.
  assert.ok(flags.elevage && flags.achats_stock && flags.finance_pilotage);
});

test('buildUnifiedAlerts — hors ligne ajoute une alerte système', () => {
  const offline = buildUnifiedAlerts({ alertes_center: [] }, { online: false });
  assert.ok(offline.some((a) => a.navModule === 'sync_activity'));
});

test('buildUnifiedAlerts — aucune donnée = aucune alerte', () => {
  const alerts = buildUnifiedAlerts({ alertes_center: [] }, { online: true, weather: {} });
  assert.equal(alerts.length, 0);
});
