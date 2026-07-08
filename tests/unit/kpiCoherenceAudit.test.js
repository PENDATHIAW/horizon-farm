/**
 * KPI coherence — vérifie que CA / encaissé / créances sont identiques
 * entre Accueil (`buildDashboardSummary`), Hey Horizon Core (`getSalesSummary`)
 * et Investisseurs & Forums (`buildInvestorForumProfile.keyFigures`).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDashboardSummary } from '../../src/modules/dashboard/dashboardMetrics.js';
import { getSalesSummary } from '../../src/services/heyHorizonCore/salesSummaryService.js';
import { getFinancialSummary } from '../../src/services/heyHorizonCore/financeSummaryService.js';
import { buildInvestorForumProfile } from '../../src/services/investorForums/investorProfileService.js';
import { composeDecisionDataMap } from '../../src/services/moduleDataComposer.js';
import { buildConsolidatedCommercialKpis } from '../../src/utils/commercialKpiConsolidated.js';

const salesOrders = [
  { id: 'CMD-1', montant_total: 100000, montant_paye: 40000, client_id: 'CLI-A', statut: 'en_cours' },
  { id: 'CMD-2', montant_total: 50000, montant_paye: 50000, client_id: 'CLI-B', statut: 'termine' },
  { id: 'CMD-3', montant_total: 75000, client_id: 'CLI-C', statut: 'en_cours' },
  { id: 'DEVIS-1', montant_total: 200000, type_document: 'devis', client_id: 'CLI-D' },
];

const payments = [
  { id: 'PAY-1', order_id: 'CMD-1', montant: 40000, montant_paye: 40000 },
  { id: 'PAY-2', order_id: 'CMD-2', montant: 50000, montant_paye: 50000 },
];

const finances = [
  { id: 'TX-1', type: 'entree', montant: 90000, date: '2026-01-15' },
  { id: 'TX-2', type: 'sortie', montant: 20000, date: '2026-01-10' },
];

const stocks = [
  { id: 'STK-1', produit: 'Aliment', quantite: 100, seuil: 20, prix_unitaire: 500 },
];

const clients = [
  { id: 'CLI-A', nom: 'Client A', created_at: '2026-01-01' },
  { id: 'CLI-B', nom: 'Client B' },
  { id: 'CLI-C', nom: 'Client C' },
];

const crud = {
  sales_orders: { rows: salesOrders },
  payments: { rows: payments },
  finances: { rows: finances },
  stock: { rows: stocks },
  clients: { rows: clients },
  documents: { rows: [] },
  business_plans: { rows: [{ id: 'BP1', nom: 'Horizon Farm' }] },
};

const dashboardProps = {
  salesOrders,
  salesOrdersAll: salesOrders,
  payments,
  paymentsAll: payments,
  transactions: finances,
  transactionsAll: finances,
  stocks,
  clients,
  animaux: [],
  lots: [],
  cultures: [],
  productionLogs: [],
  taches: [],
  alertes: [],
};

test('CA unifié : Accueil = Hey Horizon Core = Commercial canon (devis exclus)', () => {
  const summary = buildDashboardSummary(dashboardProps, {});
  const salesSummary = getSalesSummary({ ...crud, sales_orders: salesOrders, payments });
  const canonical = buildConsolidatedCommercialKpis({ orders: salesOrders, payments, clients });

  // Attendu : 100 000 + 50 000 + 75 000 = 225 000 (devis exclu)
  assert.equal(canonical.ca, 225000);
  assert.equal(summary.ca, canonical.ca, 'Accueil CA doit égaler canon');
  assert.equal(salesSummary.ventes.ca_cumul, canonical.ca, 'Hey Horizon Core CA doit égaler canon');
});

test('Encaissé unifié : Accueil = Hey Horizon Core = Commercial canon (paidForOrder anti double-count)', () => {
  const summary = buildDashboardSummary(dashboardProps, {});
  const salesSummary = getSalesSummary({ ...crud, sales_orders: salesOrders, payments });
  const canonical = buildConsolidatedCommercialKpis({ orders: salesOrders, payments, clients });

  // Attendu : max(40k, 40k) + max(50k, 50k) = 90 000
  assert.equal(canonical.collected, 90000);
  assert.equal(summary.encaisse, canonical.collected, 'Accueil encaisse doit égaler canon');
  assert.equal(salesSummary.ventes.encaissements_lies, canonical.collected, 'Hey Horizon encaissements doit égaler canon');
});

test('Créances unifiées : Accueil = Hey Horizon Core = Commercial canon', () => {
  const summary = buildDashboardSummary(dashboardProps, {});
  const salesSummary = getSalesSummary({ ...crud, sales_orders: salesOrders, payments });
  const canonical = buildConsolidatedCommercialKpis({ orders: salesOrders, payments, clients });

  // Attendu : (100k - 40k) + (50k - 50k) + (75k - 0) = 135 000 (devis exclu)
  assert.equal(canonical.receivable, 135000);
  assert.equal(summary.receivable, canonical.receivable, 'Accueil receivable doit égaler canon');
  assert.equal(salesSummary.creances.montant_total, canonical.receivable, 'Hey Horizon creances doit égaler canon');
});

test('Finance treasury synchro : creances_clients = Commercial receivable', () => {
  const finance = getFinancialSummary({ ...crud, sales_orders: salesOrders, payments, finances });
  const canonical = buildConsolidatedCommercialKpis({ orders: salesOrders, payments, clients });

  assert.equal(finance.treasury.creances_clients, canonical.receivable);
  assert.equal(finance.sales_linked.ca_commandes, canonical.ca);
  assert.equal(finance.sales_linked.encaisse_ventes, canonical.collected);
});

test('Investisseurs & Forums keyFigures alignés sur canon Commercial', () => {
  const dataMap = composeDecisionDataMap({ crud, dataMap: {} });
  const profile = buildInvestorForumProfile({ crud, dataMap });
  const canonical = buildConsolidatedCommercialKpis({ orders: salesOrders, payments, clients });

  assert.equal(profile.keyFigures.ca_erp, canonical.ca);
  assert.equal(profile.keyFigures.creances, canonical.receivable);
});

test('Devis exclus des KPI CA/receivable/collected', () => {
  const canonical = buildConsolidatedCommercialKpis({ orders: salesOrders, payments, clients });

  // Le devis DEVIS-1 (200k) ne doit PAS être compté dans le CA
  assert.equal(canonical.ca, 225000, 'CA doit être 100k + 50k + 75k (devis exclu)');
  assert.equal(canonical.quoteCount, 1);
  assert.equal(canonical.orderCount, 3);
});
