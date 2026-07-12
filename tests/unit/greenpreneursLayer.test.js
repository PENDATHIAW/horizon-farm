import test from 'node:test';
import assert from 'node:assert/strict';
import { DERFJ_GREENPRENEURS_PROFILE } from '../../src/config/derfjGreenpreneurs.config.js';
import { buildGreenpreneursReadinessScore } from '../../src/services/greenpreneurs/greenpreneursReadinessScore.js';
import { computeCircularEconomyMetrics } from '../../src/services/greenpreneurs/circularEconomyMetrics.js';
import { computeValorisationReadiness } from '../../src/services/greenpreneurs/valorisationReadinessEngine.js';
import {
  computeGreenpreneursMetrics,
  normalizeGreenpreneursDataMap,
  buildGreenpreneursCentreAlerts,
} from '../../src/services/greenpreneurs/greenpreneursMetrics.js';

test('DERFJ profile — critères sur 100', () => {
  const totalMax = DERFJ_GREENPRENEURS_PROFILE.criteria.reduce((s, c) => s + c.maxScore, 0);
  assert.equal(totalMax, 100);
});

test('readiness score — données vides avec simulation circularité', () => {
  const readiness = buildGreenpreneursReadinessScore({});
  assert.ok(readiness.total >= 0 && readiness.total <= 100);
  assert.ok(['pret_dossier', 'pret_renforcer', 'dossier_incomplet'].includes(readiness.status));
  assert.equal(readiness.maxTotal, 100);
});

test('readiness score — monte avec ventes et documents', () => {
  const empty = buildGreenpreneursReadinessScore({}).total;
  const rich = buildGreenpreneursReadinessScore({
    sales_orders: [{ total: 50000 }],
    payments: [{ montant: 40000 }],
    stocks: [{ produit: 'aliment', quantite: 10 }],
    finances: [{ montant: -10000, type: 'depense' }],
    clients: [{ nom: 'Client A' }],
    documents: [
      { title: 'Note descriptive projet' },
      { title: 'CNI Penda' },
      { title: 'Budget prévisionnel' },
    ],
    business_events: Array.from({ length: 6 }, (_, i) => ({ event_type: 'vente', id: i })),
    alertes_center: [{ title: 'Stock bas' }],
    taches: [{ titre: 'Tâche' }, { titre: 'Tâche 2' }],
  }).total;
  assert.ok(rich > empty);
});

test('circular economy — simulation sans données réelles', () => {
  const circular = computeCircularEconomyMetrics({});
  assert.equal(circular.hasRealData, false);
  assert.equal(circular.sourceLabel, 'Simulation / hypothèse');
  assert.ok(circular.fientesPondeuses.availableKg > 0);
  assert.ok(circular.fumierBovin.availableKg > 0);
  assert.ok(circular.engraisSavingsFcfa > 0);
});

test('circular economy — données réelles via business_events', () => {
  const circular = computeCircularEconomyMetrics({
    business_events: [
      { event_type: 'effluent_utilise_culture', quantity: 300, entity_id: 'p1' },
      { event_type: 'parcelle_fertilisee', quantity: 1, entity_id: 'p1' },
      { event_type: 'engrais_chimique_evite', estimated_savings_fcfa: 25000 },
    ],
    stocks: [{ categorie: 'fumier', quantite: 40 }],
  });
  assert.equal(circular.hasRealData, true);
  assert.equal(circular.sourceLabel, 'ERP réel');
  assert.ok(circular.parcellesFertilisees >= 1);
});

test('valorisation readiness — statuts sans date fixe', () => {
  const readiness = computeValorisationReadiness({});
  assert.ok(readiness.phase2_tallow_go.score >= 0);
  assert.ok(readiness.phase3_bovinia.score >= 0);
  assert.ok(['non_pret', 'a_preparer', 'pilote_possible', 'lancement_recommande'].includes(readiness.phase2_tallow_go.status));
  assert.match(readiness.roadmapNote, /date arbitraire/i);
  assert.match(readiness.phase2_tallow_go.bestMoment, /lorsque|phase 2/i);
});

test('valorisation — flux bovin améliore le score phase 2', () => {
  const low = computeValorisationReadiness({}).phase2_tallow_go.score;
  const high = computeValorisationReadiness({
    animaux: [
      { espece: 'bovin', statut: 'vendu', date_sortie: new Date().toISOString() },
      { espece: 'bovin', statut: 'abattu', date_sortie: new Date().toISOString() },
      { espece: 'bovin', statut: 'sorti', date_sortie: new Date().toISOString() },
    ],
    payments: [{ montant: 100000 }],
    finances: [{ montant: -20000, type: 'depense' }],
    business_events: [{ event_type: 'suif_collecte', quantity: 40 }],
    stocks: [{ categorie: 'suif', quantite: 20 }],
  }).phase2_tallow_go.score;
  assert.ok(high >= low);
});

test('computeGreenpreneursMetrics — agrège readiness, circular, valorisation', () => {
  const metrics = computeGreenpreneursMetrics({ documents: [{ title: 'BP' }] });
  assert.ok(metrics.readiness);
  assert.ok(metrics.circular);
  assert.ok(metrics.valorisation);
  assert.ok(Array.isArray(metrics.centreAlerts));
});

test('normalizeGreenpreneursDataMap — alias salesOrders et stocks', () => {
  const map = normalizeGreenpreneursDataMap({
    salesOrders: [{ id: 1 }],
    stock: [{ id: 2 }],
    lots: [{ id: 3 }],
  });
  assert.equal(map.sales_orders.length, 1);
  assert.equal(map.stocks.length, 1);
  assert.equal(map.avicole.length, 1);
});

test('centre alerts — fumier non valorisé (sans Orgaloop)', () => {
  const alerts = buildGreenpreneursCentreAlerts({
    circular: {
      orgaloopHybrid: false,
      orgaloopPrimary: false,
      fumierBovin: { availableKg: 500 },
      usedOnCulturesKg: 0,
      parcellesFertilisees: 0,
      fertilisantStockKg: 600,
      engraisSavingsFcfa: 10000,
      hasRealData: true,
    },
    valorisation: { phase2_tallow_go: { status: 'a_preparer', nextActions: ['Préparer conformité'], bestMoment: 'Après stabilisation' } },
  });
  assert.ok(alerts.some((a) => a.id === 'gp-fumier-non-valorise'));
});
