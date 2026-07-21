import test from 'node:test';
import assert from 'node:assert/strict';
import {
  severityForHorizon,
  projectStockRuptures,
  projectSaleReadiness,
  projectReceivableAging,
  detectLayingDrop,
  buildPredictiveAlerts,
} from '../../src/services/predictiveAlerts.js';
import { buildTaskFromAlert } from '../../src/utils/taskWorkflows.js';

const REF = '2026-07-21';

test('sévérité selon horizon', () => {
  assert.equal(severityForHorizon(1), 'critique');
  assert.equal(severityForHorizon(5), 'haute');
  assert.equal(severityForHorizon(12), 'moyenne');
});

test('rupture de stock projetée depuis les logs de consommation', () => {
  const stocks = [{ id: 'S1', produit: 'Aliment ponte', quantite: 40 }];
  const logs = [{ stock_id: 'S1', quantite: 300, date: '2026-06-21' }]; // 10/j → 4 jours
  const alerts = projectStockRuptures(stocks, logs, { horizonDays: 7, referenceDate: REF });
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].horizon_days, 4);
  assert.equal(alerts[0].severity, 'haute');
  assert.equal(alerts[0].predicted_date, '2026-07-25');
  assert.match(alerts[0].action_recommandee, /Réapprovisionner/);
});

test('rupture : stock confortable = pas d\'alerte', () => {
  const alerts = projectStockRuptures(
    [{ id: 'S1', produit: 'Maïs', quantite: 1000 }],
    [{ stock_id: 'S1', quantite: 300, date: '2026-06-21' }],
    { horizonDays: 7, referenceDate: REF },
  );
  assert.equal(alerts.length, 0);
});

test('poids cible : atteint = alerte prête, bientôt = projetée via GMQ', () => {
  const animaux = [
    { id: 'B1', nom: 'Bœuf 1', poids: 450, poids_cible: 450, status: 'actif' },      // prêt
    { id: 'B2', nom: 'Bœuf 2', poids: 420, poids_cible: 450, gmq: 1.0, status: 'actif' }, // 30 j → hors horizon 10
    { id: 'B3', nom: 'Bœuf 3', poids: 445, poids_cible: 450, gmq: 1.0, status: 'actif' }, // 5 j → dans horizon
  ];
  const alerts = projectSaleReadiness(animaux, [], { horizonDays: 10, referenceDate: REF });
  const ids = alerts.map((a) => a.entity_id);
  assert.ok(ids.includes('B1'), 'prêt inclus');
  assert.ok(ids.includes('B3'), 'bientôt prêt inclus');
  assert.ok(!ids.includes('B2'), 'trop loin exclu');
  const ready = alerts.find((a) => a.entity_id === 'B1');
  assert.match(ready.title, /prêt à la vente/);
});

test('poids cible : lot chair prêt', () => {
  const lots = [{ id: 'HF-CH-003', nom: 'Chair 3', type: 'Chair', weight_avg: 1.52, poids_cible: 1.5, ready_to_sell: true, status: 'pret_vente' }];
  const alerts = projectSaleReadiness([], lots, { referenceDate: REF });
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].entity_type, 'lot_avicole');
});

test('créance sur le point de franchir J+30', () => {
  const orders = [
    { id: 'C1', montant_total: 100000, total_paye: 0, date: '2026-06-24' }, // 27 j → 3 j avant J+30
    { id: 'C2', montant_total: 50000, total_paye: 0, date: '2026-07-19' },  // 2 j → hors fenêtre
  ];
  const alerts = projectReceivableAging(orders, { referenceDate: REF, horizonDays: 5 });
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].entity_id, 'C1');
  assert.equal(alerts[0].horizon_days, 3);
});

test('décrochage de ponte détecté sur baisse récente', () => {
  const lots = [{ id: 'P1', nom: 'Pondeuses', type: 'Pondeuse' }];
  const logs = [
    { lot_id: 'P1', date: '2026-07-15', oeufs_produits: 3000 },
    { lot_id: 'P1', date: '2026-07-16', oeufs_produits: 3000 },
    { lot_id: 'P1', date: '2026-07-17', oeufs_produits: 3000 },
    { lot_id: 'P1', date: '2026-07-18', oeufs_produits: 2500 },
    { lot_id: 'P1', date: '2026-07-19', oeufs_produits: 2400 },
    { lot_id: 'P1', date: '2026-07-20', oeufs_produits: 2450 },
  ];
  const alerts = detectLayingDrop(lots, logs, { recentDays: 3, dropPct: 10, referenceDate: REF });
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, 'decrochage_ponte');
  assert.match(alerts[0].message, /baisse/);
});

test('ponte stable = pas d\'alerte', () => {
  const lots = [{ id: 'P1', type: 'Pondeuse' }];
  const logs = Array.from({ length: 6 }, (_, i) => ({ lot_id: 'P1', date: `2026-07-1${i}`, oeufs_produits: 3000 }));
  assert.equal(detectLayingDrop(lots, logs, { referenceDate: REF }).length, 0);
});

test('agrégat : trié par sévérité puis horizon, synthèse cohérente', () => {
  const data = {
    stock: [{ id: 'S1', produit: 'Aliment', quantite: 10 }],
    alimentation_logs: [{ stock_id: 'S1', quantite: 300, date: '2026-06-21' }], // 1 j → critique
    animaux: [{ id: 'B1', nom: 'Bœuf', poids: 450, poids_cible: 450, status: 'actif' }],
    sales_orders: [{ id: 'C1', montant_total: 100000, total_paye: 0, date: '2026-06-24' }],
    referenceDate: REF,
  };
  const { alerts, summary } = buildPredictiveAlerts(data, { referenceDate: REF });
  assert.ok(alerts.length >= 3);
  assert.equal(alerts[0].severity, 'critique', 'le plus urgent en tête');
  assert.equal(summary.total, alerts.length);
});

test('interop : une alerte prédictive alimente une tâche routée RACI', () => {
  const [alert] = projectStockRuptures(
    [{ id: 'S1', produit: 'Aliment', quantite: 10 }],
    [{ stock_id: 'S1', quantite: 300, date: '2026-06-21' }],
    { referenceDate: REF },
  );
  const people = [{ id: 'EMP1', nom: 'Awa', role: 'responsable_filiere', statut: 'actif' }];
  const { task } = buildTaskFromAlert(alert, [], REF, { people });
  assert.ok(task.raci_process, 'la tâche prédictive porte une gouvernance RACI');
  assert.ok(task.raci_owner_role, 'un rôle responsable est assigné');
  assert.ok(task.title.length > 0);
});
