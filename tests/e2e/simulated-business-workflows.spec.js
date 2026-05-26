import { expect, test } from '@playwright/test';
import { readFileSync } from 'fs';
import { buildCalculatedCycleDates } from '../../src/services/productionCycleDates.js';
import { computeFinanceCash } from '../../src/utils/financeCash.js';
import { normalizeLot, normalizeProductionOeufsLog } from '../../src/utils/normalize.js';
import { avicoleActiveCount, avicoleSickCount } from '../../src/utils/avicoleMetrics.js';

const n = (value = 0) => Number(value || 0) || 0;
const today = () => '2026-01-01';
const paidOf = (sale, payments) => n(sale.montant_paye) || payments.filter((p) => p.order_id === sale.id).reduce((sum, p) => sum + n(p.montant), 0);
const totalOf = (sale) => n(sale.montant_total || sale.total || sale.total_amount || sale.amount || n(sale.quantity || sale.quantite) * n(sale.unit_price || sale.prix_unitaire));
const remainingOf = (sale, payments) => Math.max(0, totalOf(sale) - paidOf(sale, payments));
const isPaid = (sale, payments) => remainingOf(sale, payments) <= 0;

function animalReadyOpportunity(animal) {
  return {
    opportunity_key: `animal-sale:${animal.id}`,
    source_module: 'animaux',
    source_type: 'animal',
    source_id: animal.id,
    quantity: 1,
    unite: 'tête',
    statut: 'ouverte',
    montant_estime: n(animal.prix_vente_estime),
  };
}

function avicoleLotOpportunity(lot) {
  return {
    opportunity_key: `avicole-sale:${lot.id}`,
    source_module: 'avicole',
    source_type: lot.type === 'chair' ? 'poulets_chair' : 'lot_pondeuses',
    source_id: lot.id,
    quantity: n(lot.effectif_actuel),
    unite: 'tête',
    statut: 'ouverte',
  };
}

function eggOpportunity(lot, eggs, date = today()) {
  return {
    opportunity_key: `avicole-eggs:${lot.id}:${date}`,
    source_module: 'avicole',
    source_type: 'oeufs',
    source_id: lot.id,
    quantity: Math.floor(n(eggs) / 30),
    unite: 'tablette',
    eggs_count: n(eggs),
    statut: 'ouverte',
  };
}

function cultureHarvestSync(culture) {
  const qty = n(culture.quantite_recoltee);
  return {
    stock: {
      stock_key: `culture-stock:${culture.id}`,
      source_module: 'cultures',
      source_type: 'culture',
      source_id: culture.id,
      quantite: qty,
      unite: culture.unite_recolte || 'kg',
    },
    opportunity: {
      opportunity_key: `culture-sale:${culture.id}`,
      source_module: 'cultures',
      source_type: 'recolte_culture',
      source_id: culture.id,
      quantity: qty,
      unite: culture.unite_recolte || 'kg',
      statut: 'ouverte',
    },
  };
}

function normalizeClient(client, sales, payments) {
  const clientSales = sales.filter((sale) => sale.client_id === client.id || sale.client_label === client.nom);
  const debt = clientSales.reduce((sum, sale) => sum + remainingOf(sale, payments), 0);
  return { ...client, creance_reelle: debt, statut: debt > 0 ? 'a_relancer' : 'a_jour' };
}

function healthFollowUp(health) {
  const key = `health-action:${health.id}`;
  if (['retard', 'en_retard', 'overdue'].includes(health.statut)) {
    return {
      task: { task_dedupe_key: key, status: 'a_faire', module_lie: 'sante' },
      alert: { alert_dedupe_key: key, status: 'nouvelle', module_source: 'sante' },
    };
  }
  if (['fait', 'termine', 'realise', 'administre', 'ok'].includes(health.statut)) {
    return {
      task: { task_dedupe_key: key, status: 'termine', module_lie: 'sante' },
      alert: { alert_dedupe_key: key, status: 'resolue', module_source: 'sante' },
    };
  }
  return null;
}

test.describe('Audit métier avec données simulées Horizon Farm', () => {
  test('animal prêt à vendre crée une opportunité unique exploitable', () => {
    const animal = { id: 'BOV002', statut: 'pret_a_la_vente', prix_vente_estime: 450000 };
    const opportunity = animalReadyOpportunity(animal);
    expect(opportunity).toMatchObject({ opportunity_key: 'animal-sale:BOV002', source_module: 'animaux', source_id: 'BOV002', statut: 'ouverte', quantity: 1 });
    expect(opportunity.montant_estime).toBe(450000);
  });

  test('avicole prépare les ventes lot et œufs sans doublons métier', () => {
    const lot = { id: 'LOT-CHAIR-001', type: 'chair', effectif_actuel: 480 };
    const lotOpp = avicoleLotOpportunity(lot);
    const eggsOpp = eggOpportunity({ id: 'LOT-PONDEUSE-001' }, 300, today());
    expect(lotOpp).toMatchObject({ opportunity_key: 'avicole-sale:LOT-CHAIR-001', source_type: 'poulets_chair', quantity: 480, statut: 'ouverte' });
    expect(eggsOpp).toMatchObject({ opportunity_key: 'avicole-eggs:LOT-PONDEUSE-001:2026-01-01', source_type: 'oeufs', quantity: 10, eggs_count: 300, unite: 'tablette' });
  });

  test('récolte culture devient stock vendable et opportunité vente', () => {
    const culture = { id: 'CULT-TOMATE-001', nom: 'Tomates serre 1', quantite_recoltee: 120, unite_recolte: 'kg', prix_vente_estime: 900 };
    const result = cultureHarvestSync(culture);
    expect(result.stock).toMatchObject({ stock_key: 'culture-stock:CULT-TOMATE-001', source_module: 'cultures', quantite: 120, unite: 'kg' });
    expect(result.opportunity).toMatchObject({ opportunity_key: 'culture-sale:CULT-TOMATE-001', source_type: 'recolte_culture', quantity: 120, statut: 'ouverte' });
  });

  test('vente soldée bloque les encaissements supplémentaires', () => {
    const sale = { id: 'CMD001', montant_total: 100000, montant_paye: 100000, client_id: 'CLI001' };
    const payments = [];
    expect(remainingOf(sale, payments)).toBe(0);
    expect(isPaid(sale, payments)).toBe(true);
  });

  test('client payé ne reste pas à relancer', () => {
    const client = { id: 'CLI001', nom: 'Client test', statut: 'a_relancer' };
    const sales = [{ id: 'CMD001', client_id: 'CLI001', montant_total: 100000, montant_paye: 100000 }];
    const normalized = normalizeClient(client, sales, []);
    expect(normalized.creance_reelle).toBe(0);
    expect(normalized.statut).toBe('a_jour');
  });

  test('finance ne compte pas le reste à encaisser comme argent reçu', () => {
    const cash = computeFinanceCash({
      salesOrders: [{ id: 'CMD-CREDIT-001', montant_total: 100000 }],
      payments: [{ id: 'PAY-001', order_id: 'CMD-CREDIT-001', montant: 40000 }],
      transactions: [],
      fournisseurs: [{ id: 'FOU-001', dette: 15000 }],
    });
    expect(cash.cashIn).toBe(40000);
    expect(cash.receivables).toBe(60000);
    expect(cash.debts).toBe(15000);
    expect(cash.cashBalance).toBe(40000);
  });

  test('soin en retard ouvre tâche/alerte et soin fait les clôture', () => {
    const overdue = healthFollowUp({ id: 'VAC001', statut: 'retard' });
    const done = healthFollowUp({ id: 'VAC001', statut: 'fait' });
    expect(overdue.task).toMatchObject({ task_dedupe_key: 'health-action:VAC001', status: 'a_faire' });
    expect(overdue.alert).toMatchObject({ alert_dedupe_key: 'health-action:VAC001', status: 'nouvelle' });
    expect(done.task.status).toBe('termine');
    expect(done.alert.status).toBe('resolue');
  });

  test('ramassage œufs normalisé ne bloque pas et calcule les tablettes', () => {
    const log = normalizeProductionOeufsLog({
      id: 'PONTE-TERRAIN-001',
      lot_id: 'LOT-PONDEUSE-001',
      date: '2026-05-26',
      oeufs_produits: 300,
      oeufs_casses: 0,
      type_evenement: 'ramassage_oeufs',
    });
    expect(log).toMatchObject({ lot_id: 'LOT-PONDEUSE-001', oeufs_produits: 300, oeufs_vendables: 300, plateaux: 10 });
    expect(Math.floor(log.oeufs_vendables / 30)).toBe(10);
  });

  test('effectif actuel avicole exclut morts/vendus/sorties mais pas malades', () => {
    const lot = normalizeLot({
      id: 'LOT-EFFECTIF-001',
      type: 'Pondeuse',
      initial_count: 100,
      mortality: 5,
      vendus: 10,
      sorties: 0,
      malades: 3,
      current_count: 100,
    });
    expect(avicoleActiveCount(lot)).toBe(85);
    expect(lot.current_count).toBe(85);
    expect(lot.effectif_actuel).toBe(85);
    expect(avicoleSickCount(lot)).toBe(3);
  });

  test('cycles avicoles ne dupliquent pas les lots et ne classent pas les pondeuses en chair', () => {
    const cycles = buildCalculatedCycleDates({
      lots: [
        { id: 'LOT-CHAIR-001', type: 'Chair', name: 'Lot chair test', date_debut: '2026-05-01', initial_count: 100 },
        { id: 'LOT-PONDEUSE-001', type: 'Pondeuse', name: 'Lot pondeuses test', date_debut: '2026-05-01', initial_count: 100 },
      ],
    });
    expect(cycles.chairSales.map((row) => row.id)).toEqual(['LOT-CHAIR-001']);
    expect(cycles.layerReform.map((row) => row.id)).toEqual(['LOT-PONDEUSE-001']);
  });

  test('fiche animal complète affiche les champs terrain importants', () => {
    const source = readFileSync('src/modules/AnimauxSpeciesFocused.jsx', 'utf8');
    [
      'Identifiant / boucle',
      'Nom / repère',
      'Espèce',
      'Sexe',
      'Race',
      'Âge',
      'Date naissance',
      'Date entrée',
      'Origine',
      'Statut actuel',
      'État de santé',
      'Localisation',
      'Poids entrée',
      'Poids actuel',
      'Prix achat',
      'Coût cumulé',
      'Valeur estimée',
      'Documents / photos',
      'Historique de vie',
      'Notes terrain',
    ].forEach((label) => expect(source).toContain(label));
    expect(source).toContain('Non renseigné');
  });
});
