import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectRiskSignals,
  collectPriorityActions,
  buildRisquesAnswer,
  buildOpportunitesAnswer,
  buildTendancesAnswer,
} from '../../src/services/assistantFarmAdvisor.js';
import { resolveDirectorIntent, DIRECTOR_INTENTS } from '../../src/services/assistantDirectorEngines.js';

const baseSnap = {
  finance: { cashNet: -50000, payablesTotal: 200000, dettesFournisseurs: 200000 },
  commercial: { ca: 7157450, collected: 4528700, receivable: 2628750, unpaidOrders: 4 },
  monthPct: 6,
  monthTarget: 12000000,
  monthRealized: 720000,
  elevageAlerts: [{ text: 'Lot A-12 sous surveillance sanitaire' }],
  stockSummary: { lowStockCount: 0 },
  growth: { alertCounts: { zootechnie: 0, economie: 0 } },
  receivableRows: [{ clientName: 'Client A', amount: 1000, orderId: 'CMD-1' }],
  relanceRows: [],
  comparisons: [{
    key: 'month',
    ready: true,
    metrics: [
      {
        id: 'sales', label: 'Ventes', trend: 'up', currentLabel: '7 157 450 FCFA', previousLabel: '5 000 000 FCFA', current: 7157450, previous: 5000000, delta: 2157450,
      },
    ],
  }],
  dynamics: {
    ready: true,
    label: 'En progression',
    status: 'up',
    periodLabel: 'Ce mois vs mois précédent',
    reasons: ['Ventes en hausse'],
  },
  opportunities: [{
    title: 'Œufs frais — 500 plateaux',
    estimated_value: 350000,
    urgency: 'haute',
    reason: 'Stock disponible',
    recommendation: 'Contactez vos clients grossistes aujourd\'hui.',
  }],
};

test('collectRiskSignals ranks treasury and receivables', () => {
  const risks = collectRiskSignals(baseSnap);
  assert.ok(risks.length >= 2);
  assert.match(risks[0].text, /trésorerie|créances/i);
});

test('collectPriorityActions returns top 3 ranked actions', () => {
  const priorities = collectPriorityActions(baseSnap);
  assert.equal(priorities.length, 3);
  assert.match(priorities[0].text, /créance/i);
});

test('buildRisquesAnswer uses conversational tone not ERP', () => {
  const answer = buildRisquesAnswer({});
  assert.ok(answer.situation);
  assert.doesNotMatch(answer.situation, /CA ·/);
  assert.doesNotMatch(answer.situation, /consolidateFinance/i);
});

test('buildOpportunitesAnswer with empty data stays advisory', () => {
  const answer = buildOpportunitesAnswer({});
  assert.match(answer.situation, /opportunité/i);
  assert.doesNotMatch(answer.situation, /buildAuto/i);
});

test('resolveDirectorIntent detects V7 advisory questions', () => {
  assert.equal(resolveDirectorIntent('quels risques ?'), DIRECTOR_INTENTS.RISQUES);
  assert.equal(resolveDirectorIntent('comment évolue la situation ?'), DIRECTOR_INTENTS.TENDANCES);
  assert.equal(resolveDirectorIntent('par rapport au mois dernier ?'), DIRECTOR_INTENTS.COMPARAISONS);
  assert.equal(resolveDirectorIntent('quoi vendre cette semaine ?'), DIRECTOR_INTENTS.OPPORTUNITES);
});

test('buildTendancesAnswer weaves trend into prose', () => {
  const answer = buildTendancesAnswer({
    salesOrdersAll: [{ id: 'o1', montant_total: 5000, date: new Date().toISOString().slice(0, 10) }],
    paymentsAll: [],
    clients: [{ id: 'c1', nom: 'Client' }],
    stocks: [{ produit: 'Aliment', quantite: 10, seuil: 2 }],
    animaux: [{ status: 'actif' }],
    lots: [{ effectif: 50, statut: 'actif' }],
    cultures: [],
  });
  assert.ok(answer.situation);
  assert.doesNotMatch(answer.situation, /API|ERP|moteur/i);
});
