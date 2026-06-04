import test from 'node:test';
import assert from 'node:assert/strict';

import { composeDecisionDataMap } from '../../src/services/moduleDataComposer.js';
import {
  buildHeyHorizonCoreDataMap,
  getFarmSummary,
  getFinancialSummary,
  getInventorySummary,
  getInvestorReadySummary,
  getLivestockSummary,
  getPoultrySummary,
  getRiskSummary,
  getSalesSummary,
  HEY_HORIZON_CORE_SOURCE,
} from '../../src/services/heyHorizonCore/index.js';

const emptyMap = composeDecisionDataMap({ crud: {}, dataMap: {} });

test('Hey Horizon Core — dataMap vide retourne des zéros ou Non renseigné', () => {
  const farm = getFarmSummary(emptyMap);
  assert.equal(farm.source, HEY_HORIZON_CORE_SOURCE);
  assert.equal(farm.headcount.total, 0);
  assert.equal(farm.farm_name, 'Non renseigné');
  assert.equal(farm.meteo, null);

  const finance = getFinancialSummary(emptyMap);
  assert.equal(finance.treasury.encaissements, 0);
  assert.equal(finance.transactions.count, 0);

  const sales = getSalesSummary(emptyMap);
  assert.equal(sales.ventes.commandes_total, 0);
  assert.equal(sales.creances.montant_total, 0);
});

test('getPoultrySummary calcule effectifs depuis lots réels', () => {
  const dataMap = {
    ...emptyMap,
    avicole: [
      { id: 'L1', type: 'Poulets chair', initial_count: 500, mortality: 10, statut: 'actif' },
      { id: 'L2', type: 'Pondeuses', initial_count: 3000, mortality: 0, statut: 'actif' },
    ],
  };
  const poultry = getPoultrySummary(dataMap);
  assert.equal(poultry.lots.total, 2);
  assert.equal(poultry.lots.actifs, 2);
  assert.ok(poultry.lots.effectif_actif_total > 0);
  assert.ok(poultry.lots.effectif_chair >= 490);
  assert.ok(poultry.lots.effectif_pondeuses >= 3000);
});

test('getLivestockSummary sépare animaux actifs et clos', () => {
  const dataMap = {
    ...emptyMap,
    animaux: [
      { id: 'A1', type: 'bovin', statut: 'actif' },
      { id: 'A2', type: 'bovin', statut: 'vendu' },
    ],
  };
  const livestock = getLivestockSummary(dataMap);
  assert.equal(livestock.effectifs.total_fiches, 2);
  assert.equal(livestock.effectifs.actifs, 1);
  assert.equal(livestock.effectifs.clos, 1);
  assert.equal(livestock.effectifs.par_type.bovin, 1);
});

test('getInventorySummary repère stock sous seuil', () => {
  const dataMap = {
    ...emptyMap,
    stock: [
      { id: 'S1', produit: 'Aliment pondeuse', quantite: 2, seuil: 10, prix_unitaire: 18000 },
      { id: 'S2', produit: 'Litière', quantite: 50, seuil: 5, prix_unitaire: 2000 },
    ],
  };
  const inventory = getInventorySummary(dataMap);
  assert.equal(inventory.stock.produits_total, 2);
  assert.equal(inventory.stock.sous_seuil, 1);
  assert.ok(inventory.stock.valeur_estimee > 0);
  assert.equal(inventory.alertes_sous_seuil.length, 1);
});

test('getSalesSummary calcule créances depuis commandes et paiements', () => {
  const dataMap = {
    ...emptyMap,
    sales_orders: [{ id: 'CMD1', montant_total: 100000, montant_paye: 40000 }],
    payments: [{ id: 'PAI1', order_id: 'CMD1', montant: 10000 }],
  };
  const sales = getSalesSummary(dataMap);
  assert.equal(sales.ventes.ca_cumul, 100000);
  assert.equal(sales.creances.montant_total, 50000);
  assert.equal(sales.creances.commandes_impayees, 1);
});

test('getFinancialSummary agrège trésorerie sans inventer', () => {
  const dataMap = {
    ...emptyMap,
    payments: [{ id: 'P1', montant_paye: 50000, date: '2026-01-15' }],
    finances: [
      { id: 'T1', type: 'sortie', montant: 20000, date: '2026-01-10' },
      { id: 'T2', type: 'entree', montant: 5000, date: '2026-01-12', document_id: 'DOC1' },
    ],
  };
  const finance = getFinancialSummary(dataMap);
  assert.equal(finance.treasury.encaissements, 50000);
  assert.ok(finance.treasury.depenses >= 20000);
  assert.equal(finance.transactions.count, 2);
  assert.equal(finance.transactions.sans_justificatif, 1);
});

test('getRiskSummary expose score ERP Health sans crash', () => {
  const risk = getRiskSummary(emptyMap);
  assert.ok(typeof risk.health_score === 'number');
  assert.ok(Array.isArray(risk.top_findings));
  assert.ok(risk.counts.findings_total >= 0);
});

test('buildHeyHorizonCoreDataMap fusionne composeDecisionDataMap et composeReportData', () => {
  const crud = {
    animaux: { rows: [{ id: 'A1', statut: 'actif', type: 'bovin' }] },
    stock: { rows: [{ id: 'S1', produit: 'Maïs', quantite: 3, seuil: 1, prix_unitaire: 1000 }] },
  };
  const merged = buildHeyHorizonCoreDataMap({ crud, dataMap: { periodLabel: 'Janvier 2026' } });
  assert.equal(merged.animaux.length, 1);
  assert.equal(merged.stocks.length, 1);
  assert.equal(merged.periodLabel, 'Janvier 2026');
});

test('getInvestorReadySummary agrège sections et gaps', () => {
  const summary = getInvestorReadySummary(emptyMap);
  assert.ok(summary.readiness_score >= 0 && summary.readiness_score <= 100);
  assert.ok(Array.isArray(summary.gaps));
  assert.ok(summary.gaps.includes('Aucun business plan enregistré'));
  assert.ok(summary.sections.farm);
  assert.ok(summary.sections.finance);
  assert.ok(summary.sections.risk);
});
