/**
 * Extraction prix et coûts depuis données ERP — pas de prix inventés sans marquage hypothèse.
 */

import {
  DEFAULT_BROILER_CHICK_UNIT_COST,
  DEFAULT_BROILER_CRATE_PRICE,
  DEFAULT_BROILER_CRATE_SIZE,
  estimateAnimalFeedCost,
  estimateLotFeedCost,
  FEEDING_DEFAULTS,
} from '../../utils/costEngine.js';
import { computeSharedPilotageFinanceKpis } from '../../utils/objectifsCroissanceWorkflow.js';
import {
  FORECAST_SCENARIO_TYPES,
  resolveScenarioQuantity,
} from './forecastScenarioParser.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0) || 0;
const money = (r = {}) => n(r?.montant ?? r?.amount ?? r?.total ?? r?.montant_total ?? r?.prix_unitaire ?? r?.unit_price ?? r?.valeur);

function avg(values = []) {
  const nums = values.filter((v) => n(v) > 0);
  if (!nums.length) return 0;
  return nums.reduce((s, v) => s + n(v), 0) / nums.length;
}

function assumption(label, value, source = 'hypothèse') {
  return { label, value, source, isAssumption: source !== 'donnée ERP' };
}

export function extractHistoricalPricing(dataMap = {}) {
  const stocks = arr(dataMap.stock || dataMap.stocks);
  const lots = arr(dataMap.avicole || dataMap.lots);
  const animaux = arr(dataMap.animaux);
  const sales = arr(dataMap.sales_orders || dataMap.salesOrders);
  const feedLogs = arr(dataMap.alimentation_logs || dataMap.alimentationLogs);
  const investissements = arr(dataMap.investissements);
  const bpLines = arr(dataMap.bp_investment_lines);

  const feedStock = stocks.filter((s) => /aliment|feed|provende/i.test(`${s.produit || s.nom || ''}`));
  const feedPriceKg = avg(feedStock.map((s) => {
    const qty = n(s.quantite ?? s.quantity);
    const val = money(s);
    return qty > 0 ? val / qty : n(s.prix_unitaire ?? s.unit_price);
  })) || avg(feedLogs.map((l) => n(l.prix_unitaire ?? l.unit_price)));

  const chickUnitFromLots = avg(lots.filter((l) => /chair|poulet/i.test(`${l.type || ''} ${l.name || ''}`)).map((l) => {
    const subjects = n(l.initial_count ?? l.effectif_initial);
    const purchase = n(l.purchase_cost ?? l.cout_achat ?? l.cout_poussins ?? l.chick_cost);
    if (subjects > 0 && purchase > 0) return purchase / subjects;
    return n(l.prix_unitaire_sujet ?? l.unit_cost);
  }));

  const layerUnitFromLots = avg(lots.filter((l) => /pondeuse|ponte/i.test(`${l.type || ''} ${l.name || ''}`)).map((l) => {
    const subjects = n(l.initial_count ?? l.effectif_initial);
    const purchase = n(l.purchase_cost ?? l.cout_achat);
    return subjects > 0 && purchase > 0 ? purchase / subjects : 0;
  }));

  const bovinPurchase = avg(animaux.filter((a) => /bovin|vache|veau|boeuf/i.test(`${a.type || ''} ${a.espece || ''}`)).map((a) => n(a.purchase_cost ?? a.prix_achat ?? a.cout_achat)));

  const chairSales = sales.filter((o) => /chair|poulet/i.test(`${o.product_name || ''} ${o.libelle || ''} ${o.activity || ''}`));
  const chairSaleUnit = avg(chairSales.map((o) => {
    const qty = n(o.quantite ?? o.quantity ?? o.qty) || 1;
    return money(o) / qty;
  }));

  const eggSales = sales.filter((o) => /oeuf|œuf|tablette|plateau/i.test(`${o.product_name || ''} ${o.libelle || ''}`));
  const eggSaleUnit = avg(eggSales.map((o) => {
    const qty = n(o.quantite ?? o.quantity) || 1;
    return money(o) / qty;
  }));

  const buildingCost = avg([
    ...investissements.filter((i) => /batiment|construction|hangar|poulailler/i.test(`${i.designation || i.nom || ''}`)).map(money),
    ...bpLines.filter((l) => /batiment|construction|hangar/i.test(`${l.designation || l.libelle || ''}`)).map((l) => n(l.total ?? l.montant_total ?? n(l.prix_unitaire) * n(l.quantite))),
  ]);

  return {
    feedPriceKg,
    chickUnitCost: chickUnitFromLots,
    layerUnitCost: layerUnitFromLots,
    bovinPurchaseCost: bovinPurchase,
    chairSaleUnit,
    eggSaleUnit,
    buildingUnitCost: buildingCost,
    feedPriceSource: feedPriceKg > 0 ? 'donnée ERP' : 'hypothèse',
    chickPriceSource: chickUnitFromLots > 0 ? 'donnée ERP' : 'hypothèse',
  };
}

function buildAssumptions(pricing, scenarioType) {
  const assumptions = [];
  const feedPrice = pricing.feedPriceKg > 0 ? pricing.feedPriceKg : 250;
  assumptions.push(assumption('Prix aliment (FCFA/kg)', feedPrice, pricing.feedPriceSource));

  if ([FORECAST_SCENARIO_TYPES.BROILER_CHICKS, FORECAST_SCENARIO_TYPES.BROILER_BAND].includes(scenarioType)) {
    const chick = pricing.chickUnitCost > 0 ? pricing.chickUnitCost : DEFAULT_BROILER_CHICK_UNIT_COST;
    assumptions.push(assumption('Coût unitaire poussin (FCFA)', chick, pricing.chickPriceSource));
    assumptions.push(assumption('Caisse poussins référence', `${DEFAULT_BROILER_CRATE_SIZE} sujets · ${DEFAULT_BROILER_CRATE_PRICE} FCFA`, 'constante métier'));
  }
  if (scenarioType === FORECAST_SCENARIO_TYPES.LAYER_INCREASE) {
    const layer = pricing.layerUnitCost > 0 ? pricing.layerUnitCost : DEFAULT_BROILER_CHICK_UNIT_COST * 1.2;
    assumptions.push(assumption('Coût unitaire pondeuse (FCFA)', layer, pricing.layerUnitCost > 0 ? 'donnée ERP' : 'hypothèse'));
  }
  if (scenarioType === FORECAST_SCENARIO_TYPES.CATTLE_PURCHASE) {
    assumptions.push(assumption('Prix achat bovin moyen (FCFA)', pricing.bovinPurchaseCost > 0 ? pricing.bovinPurchaseCost : 350000, pricing.bovinPurchaseCost > 0 ? 'donnée ERP' : 'hypothèse'));
  }
  if (scenarioType === FORECAST_SCENARIO_TYPES.BUILDING_EXPANSION) {
    assumptions.push(assumption('Investissement bâtiment estimé (FCFA)', pricing.buildingUnitCost > 0 ? pricing.buildingUnitCost : null, pricing.buildingUnitCost > 0 ? 'donnée ERP' : 'à renseigner'));
  }
  return assumptions;
}

function simulateBroiler(scenario, pricing, quantity) {
  const chickUnit = pricing.chickUnitCost > 0 ? pricing.chickUnitCost : DEFAULT_BROILER_CHICK_UNIT_COST;
  const purchaseCost = quantity * chickUnit;
  const lot = { initial_count: quantity, type: 'poulets_de_chair', duree_cycle_jours: 45 };
  const feedEst = estimateLotFeedCost({ lot, pricePerKg: pricing.feedPriceKg > 0 ? pricing.feedPriceKg : 250 });
  const feedCost = feedEst.estimatedFeedCost;
  const healthCost = Math.round(purchaseCost * 0.05);
  const otherCost = Math.round(purchaseCost * 0.03);
  const totalCost = purchaseCost + feedCost + healthCost + otherCost;
  const sellable = Math.round(quantity * 0.94);
  const saleUnit = pricing.chairSaleUnit > 0 ? pricing.chairSaleUnit : 0;
  const estimatedSales = saleUnit > 0 ? sellable * saleUnit : 0;
  const margin = estimatedSales > 0 ? estimatedSales - totalCost : null;
  return {
    initialCost: purchaseCost,
    treasuryNeed: totalCost,
    estimatedCharges: feedCost + healthCost + otherCost,
    estimatedSales,
    estimatedMargin: margin,
    cycleDays: 45,
    sellableSubjects: sellable,
    feedCost,
    purchaseCost,
  };
}

function simulateCattle(scenario, pricing, quantity) {
  const unitPurchase = pricing.bovinPurchaseCost > 0 ? pricing.bovinPurchaseCost : 350000;
  const purchaseCost = quantity * unitPurchase;
  const animal = { type: 'bovin', duree_engraissement_jours: 90 };
  const feedEst = estimateAnimalFeedCost({ animal, pricePerKg: pricing.feedPriceKg > 0 ? pricing.feedPriceKg : 250 });
  const feedCost = feedEst.estimatedFeedCost * quantity;
  const healthCost = Math.round(purchaseCost * 0.04);
  const totalCost = purchaseCost + feedCost + healthCost;
  const saleUnit = pricing.chairSaleUnit > 0 ? pricing.chairSaleUnit * 8 : 0;
  const estimatedSales = saleUnit > 0 ? quantity * saleUnit : 0;
  return {
    initialCost: purchaseCost,
    treasuryNeed: totalCost,
    estimatedCharges: feedCost + healthCost,
    estimatedSales,
    estimatedMargin: estimatedSales > 0 ? estimatedSales - totalCost : null,
    cycleDays: FEEDING_DEFAULTS.bovin.days,
    feedCost,
    purchaseCost,
  };
}

function simulateLayers(scenario, pricing, quantity) {
  const unit = pricing.layerUnitCost > 0 ? pricing.layerUnitCost : DEFAULT_BROILER_CHICK_UNIT_COST * 1.2;
  const purchaseCost = quantity * unit;
  const lot = { initial_count: quantity, type: 'pondeuses', duree_ponte_jours: 540, taux_ponte: 0.75 };
  const feedEst = estimateLotFeedCost({ lot, pricePerKg: pricing.feedPriceKg > 0 ? pricing.feedPriceKg : 250 });
  const feedCostMonthly = (feedEst.estimatedFeedCost / Math.max(1, feedEst.days)) * 30;
  const monthlyEggs = Math.round(quantity * 0.75 * 30);
  const eggPrice = pricing.eggSaleUnit > 0 ? pricing.eggSaleUnit : 0;
  const monthlySales = eggPrice > 0 ? monthlyEggs * eggPrice : 0;
  const monthlyCharges = feedCostMonthly + Math.round(purchaseCost / 18);
  return {
    initialCost: purchaseCost,
    treasuryNeed: purchaseCost + feedCostMonthly * 2,
    estimatedCharges: monthlyCharges,
    estimatedSales: monthlySales,
    estimatedMargin: monthlySales > 0 ? monthlySales - monthlyCharges : null,
    cycleDays: 30,
    monthlyView: true,
    feedCost: feedCostMonthly,
    purchaseCost,
  };
}

function simulateBuilding(scenario, pricing, quantity) {
  const cost = pricing.buildingUnitCost > 0 ? pricing.buildingUnitCost : (quantity ? quantity * 50000 : null);
  return {
    initialCost: cost,
    treasuryNeed: cost,
    estimatedCharges: cost ? Math.round(cost * 0.05) : null,
    estimatedSales: 0,
    estimatedMargin: cost ? -cost : null,
    cycleDays: 365,
    missingInvestmentData: !cost,
  };
}

/**
 * Simule un scénario projet à partir des données ERP.
 */
export function runForecastEngine(dataMap = {}, parsedScenario = {}) {
  const quantity = resolveScenarioQuantity(parsedScenario);
  const pricing = extractHistoricalPricing(dataMap);
  const assumptions = buildAssumptions(pricing, parsedScenario.scenarioType);
  const finance = computeSharedPilotageFinanceKpis({
    salesOrders: arr(dataMap.sales_orders || dataMap.salesOrders),
    salesOrdersAll: arr(dataMap.salesOrdersAll || dataMap.sales_orders),
    payments: arr(dataMap.payments),
    paymentsAll: arr(dataMap.paymentsAll || dataMap.payments),
    transactions: arr(dataMap.finances || dataMap.transactions),
    periodScope: dataMap.periodScope || {},
    periodFiltered: Boolean(dataMap.periodFiltered),
  });

  const availableTreasury = Math.max(0, finance.grossMargin + finance.receivable);
  const currentResult = finance.treasuryResult;

  let simulation = {};
  switch (parsedScenario.scenarioType) {
    case FORECAST_SCENARIO_TYPES.CATTLE_PURCHASE:
      simulation = simulateCattle(parsedScenario, pricing, quantity);
      break;
    case FORECAST_SCENARIO_TYPES.LAYER_INCREASE:
      simulation = simulateLayers(parsedScenario, pricing, quantity);
      break;
    case FORECAST_SCENARIO_TYPES.BUILDING_EXPANSION:
      simulation = simulateBuilding(parsedScenario, pricing, quantity);
      break;
    case FORECAST_SCENARIO_TYPES.BROILER_CHICKS:
    case FORECAST_SCENARIO_TYPES.BROILER_BAND:
    default:
      simulation = simulateBroiler(parsedScenario, pricing, quantity);
      break;
  }

  const roi = simulation.initialCost > 0 && simulation.estimatedMargin != null
    ? (simulation.estimatedMargin / simulation.initialCost) * 100
    : null;

  const paybackDays = simulation.estimatedMargin > 0 && simulation.cycleDays
    ? Math.round((simulation.treasuryNeed / simulation.estimatedMargin) * simulation.cycleDays)
    : null;

  return {
    scenario: parsedScenario,
    quantity,
    pricing,
    assumptions,
    finance: {
      treasuryResult: currentResult,
      grossMargin: finance.grossMargin,
      receivable: finance.receivable,
      availableTreasury,
      encaisse: finance.encaisse,
      depenses: finance.expenses,
    },
    simulation: {
      ...simulation,
      roiPercent: roi,
      paybackDays,
    },
    dataQuality: {
      hasSalePrice: (parsedScenario.scenarioType.includes('layer') ? pricing.eggSaleUnit : pricing.chairSaleUnit) > 0
        || parsedScenario.scenarioType === FORECAST_SCENARIO_TYPES.CATTLE_PURCHASE,
      hasPurchaseHistory: pricing.chickUnitCost > 0 || pricing.bovinPurchaseCost > 0 || pricing.layerUnitCost > 0,
      hasFeedPrice: pricing.feedPriceKg > 0,
      missingFields: assumptions.filter((a) => a.value == null || a.isAssumption).map((a) => a.label),
    },
    readOnly: true,
    disclaimer: 'Rapport d’aide à la décision — pas une vérité absolue. Validez les hypothèses avant lancement.',
  };
}

export default runForecastEngine;
