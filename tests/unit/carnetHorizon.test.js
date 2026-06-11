import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCarnetAttentionItems,
  buildCarnetTodayJournal,
  buildCarnetExploitationState,
  buildCarnetConseil,
  buildCarnetHorizonView,
} from '../../src/modules/dashboard/carnetHorizon.js';
import { buildDashboardSummary } from '../../src/modules/dashboard/dashboardMetrics.js';
import { buildDashboardPriorities } from '../../src/modules/dashboard/dashboardPilotage.js';

const today = new Date().toISOString().slice(0, 10);

test('buildCarnetHorizonView — quatre sections uniquement', () => {
  const summary = buildDashboardSummary({
    stocks: [{ id: 's1', produit: 'Aliment poulet', quantite: 2, seuil: 10, categorie: 'aliment' }],
    animaux: [{ id: 'a1', status: 'actif' }],
    lotsData: [{ id: 'l1', effectif_actuel: 100, type_lot: 'pondeuse', statut: 'actif' }],
    salesOrdersAll: [{ id: 'o1', montant: 5000, date: today }],
    paymentsAll: [],
    transactionsAll: [],
    productionLogs: [{ id: 'p1', date: today, oeufs_produits: 350 }],
    alimentationLogs: [{ quantite: 5 }],
    cultures: [{ record_type: 'parcelle', statut: 'actif', surface: 100 }],
    vaccins: [{ statut: 'retard' }],
    taches: [],
    alertes: [],
  });

  const priorities = buildDashboardPriorities(summary, {
    stocks: [{ id: 's1', produit: 'Aliment poulet', quantite: 2, seuil: 10, categorie: 'aliment' }],
    alimentationLogs: [{ quantite: 5 }],
    salesOrdersAll: [{ id: 'o1', montant: 5000, date: today }],
    paymentsAll: [],
    vaccins: [{ statut: 'retard' }],
    cultures: [],
    alertes: [],
    fournisseurs: [],
  }, { score: 80, findings: [] });

  const carnet = buildCarnetHorizonView({
    summary,
    priorities,
    props: {
      stocks: [{ id: 's1', produit: 'Aliment poulet', quantite: 2, seuil: 10, categorie: 'aliment' }],
      alimentationLogs: [{ quantite: 5 }],
      salesOrdersAll: [{ id: 'o1', montant: 5000, date: today }],
      paymentsAll: [],
      clients: [],
      productionLogs: [{ id: 'p1', date: today, oeufs_produits: 350 }],
      vaccins: [{ statut: 'retard' }],
      cultures: [],
      businessEvents: [],
    },
  });

  assert.ok(Array.isArray(carnet.attention) && carnet.attention.length > 0);
  assert.ok(Array.isArray(carnet.today) && carnet.today.length > 0);
  assert.equal(carnet.state.length, 4);
  assert.ok(carnet.conseil?.lines?.length >= 1 && carnet.conseil.lines.length <= 2);
});

test('buildCarnetTodayJournal — max 10 événements', () => {
  const events = Array.from({ length: 15 }, (_, index) => ({
    id: `e${index}`,
    title: `Événement ${index}`,
    event_date: today,
    module_source: 'stock',
  }));
  const journal = buildCarnetTodayJournal({ businessEvents: events });
  assert.equal(journal.length, 10);
});

test('buildCarnetConseil — un seul conseil aliment', () => {
  const conseil = buildCarnetConseil(
    { cashNet: 1000, receivable: 0, resultat: 100 },
    [],
    {
      stocks: [{ produit: 'Aliment', quantite: 1, seuil: 10, categorie: 'aliment' }],
      alimentationLogs: [{ quantite: 10 }],
    },
  );
  assert.equal(conseil.title, 'Conseil Horizon');
  assert.ok(conseil.lines[0].includes('aliment'));
  assert.ok(conseil.lines.length <= 2);
});

test('buildCarnetExploitationState — quatre domaines sans graphique', () => {
  const state = buildCarnetExploitationState(
    {
      cashNet: 50000,
      resultat: 1000,
      receivable: 0,
      headcount: { total: 243 },
      cultureSummary: { hasData: true, parcelCount: 12 },
      stockSummary: { lowStockCount: 0, totalProducts: 5 },
    },
    { cultures: [], vaccins: [] },
  );
  assert.equal(state.length, 4);
  assert.deepEqual(state.map((row) => row.id), ['elevage', 'cultures', 'stocks', 'finances']);
  assert.ok(state[0].value.includes('243'));
});

test('buildCarnetAttentionItems — lecture seule, pas de navigation', () => {
  const items = buildCarnetAttentionItems(
    { actions: [], receivable: 1000, startupMode: false },
    [{ id: 'receivables', title: '2 créances dépassent 30 jours' }],
    {
      salesOrdersAll: [{ id: 'o1', montant: 1000, date: '2020-01-01' }],
      paymentsAll: [],
      clients: [],
      stocks: [],
      alimentationLogs: [],
      vaccins: [{ statut: 'retard' }, { statut: 'retard' }],
      cultures: [{ record_type: 'culture', date_recolte_prevue: new Date(Date.now() + 86400000).toISOString().slice(0, 10) }],
    },
  );
  assert.ok(items.every((item) => typeof item.text === 'string' && !item.onClick));
  assert.ok(items.some((item) => item.text.includes('vacciner') || item.text.includes('créance') || item.text.includes('Récolte')));
});
