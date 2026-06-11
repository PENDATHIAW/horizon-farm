import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCarnetAttentionItems,
  buildCarnetTodayJournal,
  buildCarnetDomainCards,
  buildCarnetObjectifs,
  buildCarnetConseil,
  buildCarnetHorizonView,
  isHomeNoiseText,
  isAgriculturalHomeEvent,
  CARNET_JOURNAL_LIMIT,
} from '../../src/modules/dashboard/carnetHorizon.js';
import { buildDashboardSummary } from '../../src/modules/dashboard/dashboardMetrics.js';
import { buildDashboardPriorities } from '../../src/modules/dashboard/dashboardPilotage.js';

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

  const cultures = cards.find((c) => c.id === 'cultures');
  assert.ok(cultures.lines.some((l) => /hectare/i.test(l.text)));
  assert.ok(cultures.lines.some((l) => l.text === 'Maïs'));
});

test('buildCarnetObjectifs — CA mois et année', () => {
  const objectifs = buildCarnetObjectifs(
    {
      goal: {
        periodTarget: 1000000,
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
  assert.equal(objectifs.year.label, 'CA ANNÉE');
  assert.ok(objectifs.month.realized >= 0);
  assert.equal(objectifs.year.attainment, 50);
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
  assert.ok(Array.isArray(carnet.journal.items));
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
