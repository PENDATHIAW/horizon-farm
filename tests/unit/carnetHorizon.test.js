import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCarnetAttentionItems,
  buildCarnetTodayJournal,
  buildCarnetDomainCards,
  buildCarnetObjectifs,
  buildCarnetConseil,
  buildCarnetSensorStrip,
  buildCarnetHorizonView,
  buildCarnetProjections,
  isHomeNoiseText,
  isAgriculturalHomeEvent,
  CARNET_JOURNAL_LIMIT,
  CARNET_DOMAIN_NAVIGATION,
} from '../../src/modules/dashboard/carnetHorizon.js';
import { buildDashboardSummary } from '../../src/modules/dashboard/dashboardMetrics.js';
import { buildSensorDashboardSummary } from '../../src/utils/smartFarmSensorSummary.js';

const today = new Date().toISOString().slice(0, 10);

test('isHomeNoiseText — filtre tâches IA / BP / promoteur', () => {
  assert.equal(isHomeNoiseText('Financement bancaire BP'), true);
  assert.equal(isHomeNoiseText('Apport promoteur'), true);
  assert.equal(isHomeNoiseText('Achat 4000 pondeuses'), true);
  assert.equal(isHomeNoiseText('Récolte tomate enregistrée'), false);
});

test('isAgriculturalHomeEvent — rejette événements investisseur', () => {
  assert.equal(isAgriculturalHomeEvent({
    title: 'Achat bovins BP',
    event_type: 'business_plan',
    module_source: 'investisseur',
  }), false);
  assert.equal(isAgriculturalHomeEvent({
    title: 'Récolte maïs',
    event_type: 'recolte',
    module_source: 'cultures',
  }), true);
});

test('buildCarnetDomainCards — détail espèces et finance', () => {
  const cards = buildCarnetDomainCards(
    {
      cashNet: 120000,
      receivable: 45000,
      payables: 20000,
      headcount: { effectifPondeuses: 4000, effectifChair: 300, effectifAvicoleOther: 0 },
      cultureSummary: { hasData: true, parcelCount: 12, surfaceM2: 340000 },
      stockSummary: { totalProducts: 8 },
    },
    {
      animaux: [
        { status: 'actif', espece: 'bovin' },
        { status: 'actif', type: 'bovin' },
      ],
      cultures: [
        { record_type: 'culture', nom: 'Maïs', statut: 'actif' },
        { record_type: 'culture', nom: 'Tomate', statut: 'actif' },
        { record_type: 'culture', nom: 'Oignon', statut: 'actif' },
      ],
      stocks: [{ produit: 'Maïs', quantite: 0, seuil: 5, emplacement: 'Hangar A' }],
      vaccins: [],
      businessEvents: [],
      taches: [],
    },
  );

  const elevage = cards.find((c) => c.id === 'elevage');
  assert.ok(elevage.headline.includes('têtes'));
  assert.ok(elevage.lines.some((l) => l.text.includes('pondeuses')));
  assert.ok(elevage.lines.some((l) => l.text.includes('chair')));

  const finance = cards.find((c) => c.id === 'finances');
  assert.ok(finance.lines.some((l) => l.text.includes('Créances')));
  assert.ok(finance.lines.some((l) => l.text.includes('Dettes')));
  assert.equal(finance.navigate.module, CARNET_DOMAIN_NAVIGATION.finances.module);
  assert.equal(finance.scopeLabel, 'Cumul');

  const elevageNav = cards.find((c) => c.id === 'elevage');
  assert.equal(elevageNav.navigate.tab, 'Lots & bandes');

  const cultures = cards.find((c) => c.id === 'cultures');
  assert.ok(cultures.lines.some((l) => /hectare/i.test(l.text)));
  assert.ok(cultures.lines.some((l) => l.text === 'Maïs'));
});

test('buildCarnetObjectifs — CA mois et année', () => {
  const objectifs = buildCarnetObjectifs(
    {
      goal: {
        periodTarget: 1000000,
        periodRealized: 750000,
        periodAttainment: 75,
        annualTarget: 12000000,
        annualRealized: 6000000,
        annualAttainment: 50,
      },
      periodScope: { mode: 'month' },
    },
    {
      salesOrders: [{ id: 'o1', montant: 750000, date: today }],
      salesOrdersAll: [{ id: 'o1', montant: 750000, date: today }],
      paymentsAll: [],
      clients: [],
      lots: [],
      animaux: [],
      cultures: [],
      stocks: [],
    },
  );

  assert.equal(objectifs.month.label, 'CA MOIS');
  assert.equal(objectifs.month.realized, 750000);
  assert.equal(objectifs.month.scopeLabel, 'Période');
  assert.equal(objectifs.month.navigate.module, 'commercial');
  assert.equal(objectifs.year.label, 'CA ANNÉE');
  assert.equal(objectifs.year.attainment, 50);
  assert.equal(objectifs.year.scopeLabel, 'Cumul');
});

test('buildCarnetTodayJournal — max 10, sans bruit IA', () => {
  const events = [
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `ag-${i}`,
      title: `Récolte culture ${i}`,
      event_date: today,
      module_source: 'cultures',
      event_type: 'recolte',
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `ia-${i}`,
      title: `Financement bancaire BP ${i}`,
      event_date: today,
      module_source: 'investisseur',
      event_type: 'business_plan',
    })),
  ];
  const journal = buildCarnetTodayJournal({ businessEvents: events });
  assert.ok(journal.items.length <= CARNET_JOURNAL_LIMIT);
  assert.ok(journal.items.length >= 8);
  assert.ok(journal.items.every((row) => !isHomeNoiseText(row.text)));
});

test('buildCarnetConseil — situation, cause, action', () => {
  const conseil = buildCarnetConseil(
    { cashNet: 1000, receivable: 0, resultat: 100 },
    [],
    {
      stocks: [{ produit: 'Maïs', quantite: 1, seuil: 10, categorie: 'aliment' }],
      alimentationLogs: [{ quantite: 10 }],
    },
  );
  assert.ok(conseil.situation);
  assert.ok(conseil.cause);
  assert.ok(conseil.action);
});

test('buildCarnetHorizonView — sections dirigeant', () => {
  const summary = buildDashboardSummary({
    stocks: [],
    animaux: [],
    lotsData: [],
    salesOrdersAll: [],
    paymentsAll: [],
    transactionsAll: [],
    productionLogs: [],
    cultures: [],
    vaccins: [],
    taches: [],
    alertes: [],
  });
  const carnet = buildCarnetHorizonView({
    summary,
    priorities: [],
    props: { stocks: [], animaux: [], cultures: [], businessEvents: [] },
  });
  assert.equal(carnet.domains.length, 4);
  assert.ok(carnet.objectifs?.month);
  assert.ok(carnet.conseil?.action);
  assert.equal(Object.hasOwn(carnet, 'journal'), false);
  assert.ok(carnet.capteurs);
  assert.equal(carnet.capteurs.navigate.module, 'smartfarm');
});

test('buildCarnetSensorStrip — température et alertes capteurs', () => {
  const strip = buildCarnetSensorStrip({
    sensorDevices: [
      { id: 'tc1', type: 'temperature', name: 'Poulailler A', value: 28, status: 'online' },
      { id: 'hum1', type: 'humidite', name: 'Serre', value: 62, status: 'online' },
    ],
    cameraDevices: [{ id: 'cam1' }],
    meteo: { temp: 30 },
  });
  assert.ok(strip.headline.includes('28'));
  assert.ok(strip.lines.some((l) => /Température/i.test(l.text)));
  assert.equal(strip.navigate.tab, 'Flux temps réel');
});

test('buildSensorDashboardSummary — sans capteur utilise météo', () => {
  const summary = buildSensorDashboardSummary([], [], { temp: 31 });
  assert.equal(summary.tempDisplay, 31);
  assert.equal(summary.headline, '31°C');
});

test('buildCarnetDomainCards — pas d’icône emoji sur les cartes', () => {
  const cards = buildCarnetDomainCards({ cashNet: 0, headcount: {}, cultureSummary: {}, stockSummary: {} }, { stocks: [], animaux: [], cultures: [] });
  cards.forEach((card) => {
    assert.equal(card.icon, undefined);
  });
});

test('buildCarnetAttentionItems — alertes terrain uniquement', () => {
  const items = buildCarnetAttentionItems(
    { cashNet: 0, receivable: 0, payables: 0, headcount: {}, cultureSummary: {}, stockSummary: {} },
    [],
    {
      vaccins: [{ statut: 'retard' }],
      stocks: [{ produit: 'Aliment', quantite: 0, seuil: 10 }],
      animaux: [],
      cultures: [],
      businessEvents: [],
      taches: [],
    },
  );
  assert.ok(items.length > 0);
  assert.ok(items.every((item) => !isHomeNoiseText(item.text)));
});

test('buildCarnetTodayJournal — priorise les événements du jour', () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = yesterday.toISOString().slice(0, 10);
  const journal = buildCarnetTodayJournal({
    businessEvents: [
      { id: 'old', title: 'Récolte maïs', event_date: yesterdayIso, module_source: 'cultures', event_type: 'recolte' },
      { id: 'today', title: 'Récolte tomate', event_date: today, module_source: 'cultures', event_type: 'recolte' },
    ],
  });
  assert.equal(journal.scope, 'today');
  assert.ok(journal.items.some((row) => /tomate/i.test(row.text)));
  assert.ok(journal.items.every((row) => !/maïs/i.test(row.text)));
});

test('buildCarnetConseil — navigation vers module métier', () => {
  const conseil = buildCarnetConseil(
    { cashNet: -1000, receivable: 0, resultat: -100 },
    [],
    { stocks: [], alimentationLogs: [] },
  );
  assert.equal(conseil.navigate.module, 'finance_pilotage');
  assert.equal(conseil.navigate.tab, 'Trésorerie');
});

test('buildCarnetHorizonView — priorités et investisseur', () => {
  const summary = buildDashboardSummary({
    stocks: [],
    animaux: [],
    lotsData: [],
    salesOrdersAll: [],
    paymentsAll: [],
    transactionsAll: [],
    productionLogs: [],
    cultures: [],
    vaccins: [],
    taches: [],
    alertes: [],
  });
  const carnet = buildCarnetHorizonView({
    summary,
    priorities: [{ id: 'stock', title: 'Stock bas', moduleKey: 'achats_stock', tab: 'Inventaire', tone: 'amber' }],
    investorReadiness: { score: 72, label: 'En progression', checks: [], gaps: [] },
    props: { stocks: [], animaux: [], cultures: [], businessEvents: [] },
  });
  assert.equal(carnet.priorities.length, 1);
  assert.equal(carnet.investorReadiness.score, 72);
});

test('buildCarnetProjections — œufs vers Lots & bandes', () => {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const projections = buildCarnetProjections(
    {
      receivable: 50000,
      goal: { periodTarget: 500000, periodRealized: 120000 },
      periodScope: { mode: 'month', monthKey: month },
    },
    {
      salesOrders: [
        { id: '1', date: `${month}-05`, montant: 80000, montant_total: 80000 },
        { id: '2', date: `${month}-10`, montant: 40000, montant_total: 40000 },
      ],
      payments: [{ id: 'p1', montant: 30000, date: `${month}-08` }],
      transactions: [{ id: 'f1', type: 'entree', montant: 100000 }],
      stocks: [{ produit: 'Aliment', quantite: 0, seuil: 5 }],
      productionLogs: [
        { oeufs_produits: 700, date: new Date().toISOString().slice(0, 10) },
      ],
    },
  );
  assert.equal(projections.hasData, true);
  assert.ok(projections.items.some((i) => i.id === 'ca-projection'));
  assert.ok(projections.items.some((i) => i.id === 'stock-rupture'));
  const eggs = projections.items.find((i) => i.id === 'eggs-projection');
  if (eggs) {
    assert.equal(eggs.navigate.tab, 'Lots & bandes');
  }
});

test('buildCarnetProjections — CA et trésorerie projetés', () => {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const projections = buildCarnetProjections(
    {
      receivable: 50000,
      goal: { periodTarget: 500000, periodRealized: 120000 },
      periodScope: { mode: 'month', monthKey: month },
    },
    {
      salesOrders: [
        { id: '1', date: `${month}-05`, montant: 80000, montant_total: 80000 },
        { id: '2', date: `${month}-10`, montant: 40000, montant_total: 40000 },
      ],
      payments: [{ id: 'p1', montant: 30000, date: `${month}-08` }],
      transactions: [{ id: 'f1', type: 'entree', montant: 100000 }],
      stocks: [{ produit: 'Aliment', quantite: 0, seuil: 5 }],
      productionLogs: [
        { oeufs_produits: 700, date: new Date().toISOString().slice(0, 10) },
      ],
    },
  );
  assert.equal(projections.hasData, true);
  assert.ok(projections.items.some((i) => i.id === 'ca-projection'));
  assert.ok(projections.items.some((i) => i.id === 'stock-rupture'));
});
