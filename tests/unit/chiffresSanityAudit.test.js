/**
 * Audit de sûreté des chiffres calculés.
 *
 * Fait tourner le jeu de données de démonstration (seed Horizon Farm) à travers
 * le moteur de KPI, le catalogue de KPI et les principaux moteurs financiers,
 * puis vérifie qu'aucun nombre affichable n'est aberrant :
 *  - pas de NaN ni d'Infinity nulle part dans les sorties ;
 *  - les compteurs (têtes, produits, commandes...) ne sont jamais négatifs ;
 *  - les taux en pourcentage restent dans [0, 100] (ou nuls).
 *
 * But : garantir qu'aucun chiffre ne « part en vrille » sur des données réelles.
 *
 * Exécution : npx vite-node tests/unit/chiffresSanityAudit.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildInvestorDemoDataMap } from '../../src/services/investorForums/investorDemoOrchestrator.js';
import { CATALOGUE_KPI, valeurKpi } from '../../src/config/catalogueKpi.js';
import { runKpiEngine } from '../../src/services/kpiEngine/index.js';
import { buildConsolidatedCommercialKpis } from '../../src/utils/commercialKpiConsolidated.js';
import { summarizeSalesMargins } from '../../src/utils/salesMarginEngine.js';
import { buildElevageActivityPnl } from '../../src/utils/elevageActivityPnl.js';
import { summarizeAvicoleCosts, summarizeAnimalCosts } from '../../src/utils/costEngine.js';
import { buildProfitabilityView, buildOfficialTreasuryView } from '../../src/utils/financePilotageCore.js';
import { buildReproductionKpis } from '../../src/utils/reproductionMetrics.js';
import { buildDashboardSummary } from '../../src/modules/dashboard/dashboardMetrics.js';
import { buildProductionHubSnapshot } from '../../src/utils/productionHubMetrics.js';
import { buildCycleV1Kpis } from '../../src/utils/cycleMetrics.js';
import { buildCommercialPilotageBundle } from '../../src/utils/commercialPilotageMetrics.js';

const dataMap = buildInvestorDemoDataMap();

/** Props seed en camelCase, tels qu'attendus par les moteurs financiers/élevage. */
const seedProps = {
  transactions: dataMap.finances,
  salesOrders: dataMap.sales_orders,
  payments: dataMap.payments,
  fournisseurs: dataMap.fournisseurs,
  stocks: dataMap.stock,
  animaux: dataMap.animaux,
  lots: dataMap.avicole,
  cultures: dataMap.cultures,
  sante: dataMap.sante,
  alimentationLogs: dataMap.alimentation_logs,
  productionLogs: dataMap.production_oeufs_logs,
  investissements: dataMap.investissements,
  businessEvents: dataMap.business_events,
};

/** Repère récursivement tout nombre non fini (NaN, ±Infinity) dans une sortie. */
function nombresAberrants(valeur, chemin = '', vus = new Set(), fautes = []) {
  if (typeof valeur === 'number') {
    if (!Number.isFinite(valeur)) fautes.push(`${chemin} = ${valeur}`);
    return fautes;
  }
  if (!valeur || typeof valeur !== 'object' || vus.has(valeur)) return fautes;
  vus.add(valeur);
  for (const [cle, sousValeur] of Object.entries(valeur)) {
    nombresAberrants(sousValeur, chemin ? `${chemin}.${cle}` : cle, vus, fautes);
  }
  return fautes;
}

/** Unités de comptage : la valeur ne peut jamais être négative. */
const UNITES_COMPTEUR = new Set(['produits', 'commandes', 'fournisseurs', 'alertes', 'tâches', 'événements', 'documents', 'personnes', 'équipements', 'capteurs', 'opportunités', 'parcelles', 'têtes', 'œufs']);

test('catalogue KPI : aucune valeur NaN/Infinity, compteurs non négatifs (seed démo)', () => {
  const fautes = [];
  for (const code of Object.keys(CATALOGUE_KPI)) {
    const { valeur, entree } = valeurKpi(code, dataMap);
    if (valeur == null) continue; // non disponible : légitime
    if (typeof valeur !== 'number' || !Number.isFinite(valeur)) {
      fautes.push(`${code} = ${valeur} (attendu nombre fini ou null)`);
      continue;
    }
    if (UNITES_COMPTEUR.has(entree.unite) && valeur < 0) {
      fautes.push(`${code} = ${valeur} (compteur « ${entree.unite} » négatif)`);
    }
  }
  assert.deepEqual(fautes, [], `KPI aberrants :\n${fautes.join('\n')}`);
});

test('moteur KPI : aucune sortie NaN/Infinity sur le seed démo', () => {
  const sortie = runKpiEngine(dataMap, { module: 'dashboard' });
  const fautes = nombresAberrants(sortie);
  assert.deepEqual(fautes, [], `Nombres aberrants dans le moteur KPI :\n${fautes.join('\n')}`);
});

test('KPI commerciaux consolidés : totaux finis, taux dans [0,100]', () => {
  const kpis = buildConsolidatedCommercialKpis({
    salesOrders: dataMap.sales_orders,
    payments: dataMap.payments,
    clients: dataMap.clients,
    transactions: dataMap.finances,
  });
  const fautes = nombresAberrants(kpis);
  for (const champ of ['ca', 'collected', 'receivable', 'basketAvg']) {
    const v = kpis[champ];
    if (v != null && (!Number.isFinite(v) || v < 0)) fautes.push(`${champ} = ${v}`);
  }
  for (const taux of ['paymentRate', 'deliveryRate']) {
    const v = kpis[taux];
    if (v != null && (v < 0 || v > 100)) fautes.push(`${taux} = ${v} (hors [0,100])`);
  }
  // Invariant métier : on ne peut pas encaisser plus que le chiffre d'affaires
  // (un dépassement trahirait un double comptage des paiements).
  if (kpis.collected > kpis.ca + 1) fautes.push(`encaissé (${kpis.collected}) > CA (${kpis.ca})`);
  assert.deepEqual(fautes, [], `KPI commerciaux aberrants :\n${fautes.join('\n')}`);
});

test('marges ventes : totaux finis, taux de marge bornés', () => {
  const resume = summarizeSalesMargins(dataMap.sales_orders, {
    payments: dataMap.payments,
    stocks: dataMap.stock,
    avicole: dataMap.avicole,
    animaux: dataMap.animaux,
    cultures: dataMap.cultures,
  });
  const fautes = nombresAberrants({ ca: resume.ca, encaisse: resume.encaisse, directCost: resume.directCost, margin: resume.margin, marginRate: resume.marginRate });
  if (resume.marginRate != null && Math.abs(resume.marginRate) > 1000) fautes.push(`marginRate invraisemblable = ${resume.marginRate}`);
  assert.deepEqual(fautes, [], `Marges aberrantes :\n${fautes.join('\n')}`);
});

test('P&L élevage : aucune sortie NaN/Infinity sur le seed démo', () => {
  const pnl = buildElevageActivityPnl({
    lots: dataMap.avicole,
    animaux: dataMap.animaux,
    feedLogs: dataMap.alimentation_logs,
    productionLogs: dataMap.production_oeufs_logs,
    healthEvents: dataMap.sante,
    businessEvents: dataMap.business_events,
    salesOrders: dataMap.sales_orders,
  });
  assert.deepEqual(nombresAberrants(pnl), [], `Nombres aberrants dans le P&L élevage :\n${nombresAberrants(pnl).join('\n')}`);
});

test('coûts unifiés élevage/animaux : aucune sortie NaN/Infinity', () => {
  const avicole = summarizeAvicoleCosts({
    rows: dataMap.avicole,
    alimentationLogs: dataMap.alimentation_logs,
    productionLogs: dataMap.production_oeufs_logs,
    directCharges: dataMap.business_events,
    healthEvents: dataMap.sante,
  });
  const animaux = summarizeAnimalCosts({
    rows: dataMap.animaux,
    alimentationLogs: dataMap.alimentation_logs,
    vaccins: dataMap.sante,
    directCharges: dataMap.business_events,
    healthEvents: dataMap.sante,
  });
  const fautes = [...nombresAberrants(avicole, 'avicole'), ...nombresAberrants(animaux, 'animaux')];
  assert.deepEqual(fautes, [], `Nombres aberrants dans les coûts :\n${fautes.join('\n')}`);
});

test('finance pilotage (rentabilité + trésorerie) : aucune sortie NaN/Infinity', () => {
  const profit = buildProfitabilityView(seedProps);
  const treasury = buildOfficialTreasuryView(seedProps);
  const fautes = [...nombresAberrants(profit, 'profit'), ...nombresAberrants(treasury, 'treasury')];
  assert.deepEqual(fautes, [], `Nombres aberrants dans finance pilotage :\n${fautes.join('\n')}`);
});

test('reproduction : aucune sortie NaN/Infinity', () => {
  const repro = buildReproductionKpis({ animaux: dataMap.animaux, businessEvents: dataMap.business_events });
  assert.deepEqual(nombresAberrants(repro), [], `Nombres aberrants dans reproduction :\n${nombresAberrants(repro).join('\n')}`);
});

test('réconciliation trésorerie : Accueil = Finance officielle = tableau de bord', () => {
  const kpi = valeurKpi('tresorerie', dataMap).valeur;
  const officiel = buildOfficialTreasuryView(seedProps).treasuryAvailable;
  const dash = buildDashboardSummary(seedProps).cashNet;
  assert.equal(kpi, officiel, `Trésorerie Accueil (${kpi}) doit égaler la trésorerie officielle (${officiel})`);
  assert.equal(dash, officiel, `Trésorerie tableau de bord (${dash}) doit égaler la trésorerie officielle (${officiel})`);
});

test('hub production / cycles / pilotage commercial : aucune sortie NaN/Infinity', () => {
  const hub = buildProductionHubSnapshot({
    lots: dataMap.avicole,
    animaux: dataMap.animaux,
    productionLogs: dataMap.production_oeufs_logs,
    stocks: dataMap.stock,
    documents: dataMap.documents,
    opportunities: dataMap.sales_opportunities,
  });
  const cycles = buildCycleV1Kpis({
    lots: dataMap.avicole,
    animaux: dataMap.animaux,
    productionLogs: dataMap.production_oeufs_logs,
    dataMap,
  });
  const pilotage = buildCommercialPilotageBundle({
    orders: dataMap.sales_orders,
    payments: dataMap.payments,
    clients: dataMap.clients,
  });
  const fautes = [
    ...nombresAberrants(hub, 'hub'),
    ...nombresAberrants(cycles, 'cycles'),
    ...nombresAberrants(pilotage, 'pilotage'),
  ];
  assert.deepEqual(fautes, [], `Nombres aberrants (hub/cycles/pilotage) :\n${fautes.join('\n')}`);
});

test('réconciliation marge : taux de marge cohérent avec résultat / CA', () => {
  const { profit, marginRate } = buildProfitabilityView(seedProps);
  if (profit.caTotal > 0 && marginRate != null) {
    const attendu = Number(((profit.operatingResult / profit.caTotal) * 100).toFixed(1));
    assert.equal(marginRate, attendu, `taux de marge (${marginRate}) doit égaler résultat/CA (${attendu})`);
  }
});
