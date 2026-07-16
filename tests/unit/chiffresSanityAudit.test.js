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

const dataMap = buildInvestorDemoDataMap();

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
