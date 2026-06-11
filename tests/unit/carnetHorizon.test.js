import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCarnetAttentionItems,
  buildCarnetTodayJournal,
  buildCarnetDomainCards,
  buildCarnetConseil,
  buildCarnetHorizonView,
  isHomeNoiseText,
  isAgriculturalHomeEvent,
  CARNET_JOURNAL_LIMIT,
} from '../../src/modules/dashboard/carnetHorizon.js';
import { buildDashboardSummary } from '../../src/modules/dashboard/dashboardMetrics.js';
import { buildDashboardPriorities } from '../../src/modules/dashboard/dashboardPilotage.js';

const today = new Date().toISOString().slice(0, 10);

test('isHomeNoiseText — filtre tâches IA / BP', () => {
  assert.equal(isHomeNoiseText('Financement bancaire BP'), true);
  assert.equal(isHomeNoiseText('Achat 4000 pondeuses BP'), true);
  assert.equal(isHomeNoiseText('Récolte tomate enregistrée'), false);
  assert.equal(isHomeNoiseText('Paiement reçu client'), false);
});

test('isAgriculturalHomeEvent — rejette événements investisseur', () => {
  assert.equal(isAgriculturalHomeEvent({
    title: 'Achat bovins BP',
    event_type: 'business_plan',
    module_source: 'investisseur',
    event_date: today,
  }), false);
  assert.equal(isAgriculturalHomeEvent({
    title: 'Récolte maïs',
    event_type: 'recolte',
    module_source: 'cultures',
    event_date: today,
  }), true);
});

test('buildCarnetHorizonView — structure V2 compacte', () => {
  const summary = buildDashboardSummary({
    stocks: [{ id: 's1', produit: 'Aliment poulet', quantite: 2, seuil: 10, categorie: 'aliment' }],
    animaux: [{ id: 'a1', status: 'actif' }],
    lotsData: [{ id: 'l1', effectif_actuel: 4500, type_lot: 'pondeuse', statut: 'actif' }],
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
      lotsData: [{ id: 'l1', effectif_actuel: 4500, type_lot: 'pondeuse', statut: 'actif' }],
    },
  });

  assert.equal(carnet.domains.length, 4);
  assert.ok(!carnet.domains[0].value.includes('4520'), 'pas de total animaux absurde');
  assert.ok(carnet.journal?.items?.length <= CARNET_JOURNAL_LIMIT);
  assert.ok(typeof carnet.conseil.text === 'string');
  assert.ok(!carnet.conseil.lines);
});

test('buildCarnetTodayJournal — max 5 événements agricoles', () => {
  const events = Array.from({ length: 12 }, (_, index) => ({
    id: `e${index}`,
    title: index % 2 ? `Récolte culture ${index}` : `Financement bancaire BP ${index}`,
    event_date: today,
    module_source: index % 2 ? 'cultures' : 'investisseur',
    event_type: index % 2 ? 'recolte' : 'business_plan',
  }));
  const journal = buildCarnetTodayJournal({ businessEvents: events });
  assert.equal(journal.items.length, CARNET_JOURNAL_LIMIT);
  assert.ok(journal.items.every((row) => !isHomeNoiseText(row.text)));
});

test('buildCarnetConseil — une seule phrase', () => {
  const conseil = buildCarnetConseil(
    { cashNet: 1000, receivable: 0, resultat: 100 },
    [],
    {
      stocks: [{ produit: 'Maïs', quantite: 1, seuil: 10, categorie: 'aliment' }],
      alimentationLogs: [{ quantite: 10 }],
    },
  );
  assert.equal(conseil.title, 'Conseil Horizon');
  assert.ok(conseil.text.includes('jour'));
  assert.ok(!Array.isArray(conseil.lines));
});

test('buildCarnetDomainCards — lecture bandes, pas total brut', () => {
  const cards = buildCarnetDomainCards(
    {
      cashNet: 50000,
      receivable: 0,
      headcount: {
        total: 4520,
        activeLots: 3,
        effectifPondeuses: 4500,
        activeAnimals: 20,
      },
      cultureSummary: { hasData: true, parcelCount: 12 },
      stockSummary: { lowStockCount: 2, totalProducts: 5 },
    },
    { cultures: [], vaccins: [], stocks: [], salesOrdersAll: [], paymentsAll: [], clients: [] },
  );
  assert.equal(cards.length, 4);
  assert.ok(cards[0].value.includes('bande'));
  assert.ok(!cards[0].value.includes('4520'));
});

test('buildCarnetAttentionItems — sans bruit IA', () => {
  const items = buildCarnetAttentionItems(
    {
      actions: [
        { title: 'Achat caprins BP', iconKey: 'stock' },
        { title: '1 créance en retard', iconKey: 'money' },
      ],
      receivable: 1000,
      startupMode: false,
    },
    [{ id: 'goal-late', title: 'Objectif mensuel atteint à 40 %' }],
    {
      salesOrdersAll: [{ id: 'o1', montant: 1000, date: '2020-01-01' }],
      paymentsAll: [],
      clients: [],
      stocks: [],
      alimentationLogs: [],
      vaccins: [{ statut: 'retard' }],
      cultures: [],
    },
  );
  assert.ok(items.every((item) => !isHomeNoiseText(item.text)));
  assert.ok(items.some((item) => /créance|vacciner/i.test(item.text)));
});
