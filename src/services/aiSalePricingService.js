import { buildPondeusesIntelligence } from './aiPondeusesService.js';
import { recommendAnimalSalePrice, recommendAvicoleLotPrice } from './salePricingEngine.js';
import { deriveSalesOpportunities, isOpenSalesOpportunity, salesOpportunityAmount } from '../utils/salesOpportunityDerivation.js';
import { avicoleActiveCount } from '../utils/avicoleMetrics.js';
import { toNumber } from '../utils/format';

const asRows = (rows) => (Array.isArray(rows) ? rows : []);

const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const isChairLot = (lot = {}) => {
  const type = normalizeText(`${lot.type || ''} ${lot.category || ''} ${lot.name || ''}`);
  return type.includes('chair') || type.includes('broiler') || type.includes('poulet');
};

const animalReadyForSale = (animal = {}) => {
  const status = normalizeText(animal.status || animal.statut || animal.sale_status);
  return Boolean(animal.id)
    && !['vendu', 'decede', 'sorti', 'annule', 'mort', 'vole'].includes(status)
    && Boolean(animal.pret_vente_confirme || animal.pret_a_la_vente || animal.ready_for_sale || animal.sale_ready
      || ['pret_a_la_vente', 'pret_a_vendre'].includes(status));
};

const lotReadyForSale = (lot = {}) => {
  const status = normalizeText(lot.status || lot.statut);
  return Boolean(lot.id)
    && avicoleActiveCount(lot) > 0
    && Boolean(lot.pret_vente_confirme || lot.pret_a_la_vente || lot.ready_for_sale || lot.sale_ready
      || ['pret_a_la_vente', 'pret_a_vendre', 'pret_a_vendre_reforme', 'a_reformer'].includes(status));
};

export const buildChairIntelligence = ({
  lots = [],
  alimentationLogs = [],
  productionLogs = [],
  marketPrices = [],
} = {}) => {
  const chairLots = asRows(lots).filter(isChairLot).filter(lotReadyForSale);
  const analyses = chairLots.map((lot) => {
    const pricing = recommendAvicoleLotPrice({ lot, alimentationLogs, productionLogs, marketPrices });
    const active = avicoleActiveCount(lot);
    const weight = toNumber(lot.weight_avg ?? lot.poids_moyen);
    const alerts = [...(pricing.alerts || [])];
    if (weight > 0 && weight < 1.5) alerts.push('Poids moyen sous 1,5 kg — fenêtre de vente à surveiller.');
    return {
      lot_id: lot.id,
      lot_name: lot.name || lot.nom || lot.id,
      current_count: active,
      weight_avg: weight,
      total_cost: pricing.totalCost,
      recommended_unit_price: pricing.recommendedUnitPrice,
      recommended_total_price: pricing.recommendedTotalPrice,
      minimum_unit_price: pricing.minimumUnitPrice,
      margin_rate: pricing.marginRate,
      market_price: pricing.marketPrice,
      alerts,
    };
  });

  const recommendations = analyses.flatMap((row) => {
    if (!row.alerts.length) return [];
    return [{
      type: 'prix',
      module_target: 'avicole',
      entity_type: 'lot_chair',
      entity_id: row.lot_id,
      priority: row.margin_rate < 0 ? 'critique' : 'haute',
      title: `Prix chair — ${row.lot_name}`,
      summary: row.alerts.join(' '),
      action_recommandee: row.margin_rate < 0
        ? 'Ne pas vendre sous le coût. Ajuster prix ou réduire charges alimentation.'
        : `Prix recommandé ${Math.round(row.recommended_unit_price)} FCFA/sujet (${activeLabel(row.current_count)}).`,
      confidence_score: 72,
    }];
  });

  return {
    generated_at: new Date().toISOString(),
    scope: 'chair',
    lots: analyses,
    recommendations,
  };
};

function activeLabel(count) {
  return `${count} sujet(s)`;
}

export const buildAnimauxSaleIntelligence = ({
  animaux = [],
  alimentationLogs = [],
  vaccins = [],
  marketPrices = [],
} = {}) => {
  const ready = asRows(animaux).filter(animalReadyForSale);
  const analyses = ready.map((animal) => {
    const pricing = recommendAnimalSalePrice({ animal, alimentationLogs, vaccins, marketPrices });
    return {
      animal_id: animal.id,
      animal_name: animal.name || animal.nom || animal.id,
      animal_type: animal.type || animal.espece || 'animal',
      total_cost: pricing.totalCost,
      recommended_price: pricing.recommendedPrice,
      minimum_price: pricing.minimumPrice,
      margin_rate: pricing.marginRate,
      market_price: pricing.marketPrice,
      readiness: pricing.readiness,
      alerts: pricing.alerts || [],
    };
  });

  const recommendations = analyses.flatMap((row) => {
    if (!row.alerts.length && row.readiness?.ready) {
      return [{
        type: 'vente',
        module_target: 'animaux',
        entity_type: 'animal',
        entity_id: row.animal_id,
        priority: 'moyenne',
        title: `Animal prêt — ${row.animal_name}`,
        summary: `Prix recommandé ${Math.round(row.recommended_price)} FCFA · marge ${row.margin_rate.toFixed(1)}%.`,
        action_recommandee: 'Confirmer opportunité de vente ou négocier au-dessus du plancher.',
        confidence_score: 68,
      }];
    }
    if (!row.alerts.length) return [];
    return [{
      type: 'prix',
      module_target: 'animaux',
      entity_type: 'animal',
      entity_id: row.animal_id,
      priority: row.margin_rate < 0 ? 'critique' : 'haute',
      title: `Prix animal — ${row.animal_name}`,
      summary: row.alerts.join(' '),
      action_recommandee: 'Revoir coûts alimentation/santé ou ajuster prix de vente cible.',
      confidence_score: 70,
    }];
  });

  return {
    generated_at: new Date().toISOString(),
    scope: 'animaux',
    animals: analyses,
    recommendations,
  };
};

export const buildVentesOpportunitiesIntelligence = ({
  opportunities = [],
  lots = [],
  animaux = [],
  cultures = [],
  stocks = [],
  alimentationLogs = [],
  productionLogs = [],
  vaccins = [],
  marketPrices = [],
} = {}) => {
  const unified = deriveSalesOpportunities({
    opportunities,
    lots,
    animaux,
    cultures,
    stocks,
    alimentationLogs,
    productionLogs,
    vaccins,
    marketPrices,
  }).filter(isOpenSalesOpportunity);

  const analyses = unified.map((opp) => {
    const total = salesOpportunityAmount(opp);
    const unit = toNumber(opp.unit_price ?? opp.prix_unitaire);
    const marginRate = toNumber(opp.pricing_margin_rate);
    return {
      opportunity_id: opp.id,
      opportunity_key: opp.opportunity_key,
      title: opp.title || opp.product_name || opp.id,
      source_module: opp.source_module || opp.created_from,
      unit_price: unit,
      estimated_amount: total,
      margin_rate: marginRate,
      pricing_alerts: opp.pricing_alerts || [],
      pricing_source: opp.pricing_source || null,
    };
  });

  const recommendations = analyses.flatMap((row) => {
    if (!row.pricing_alerts?.length) return [];
    return [{
      type: 'prix',
      module_target: 'ventes',
      entity_type: 'sales_opportunity',
      entity_id: row.opportunity_id,
      priority: row.margin_rate < 0 ? 'critique' : 'haute',
      title: `Opportunité à risque — ${row.title}`,
      summary: row.pricing_alerts.join(' '),
      action_recommandee: 'Recalculer marge avant conversion en commande.',
      confidence_score: 75,
    }];
  });

  return {
    generated_at: new Date().toISOString(),
    scope: 'ventes_opportunities',
    opportunities: analyses,
    recommendations,
  };
};

export const buildSalePricingIntelligence = ({
  lots = [],
  animaux = [],
  opportunities = [],
  cultures = [],
  stocks = [],
  alimentationLogs = [],
  productionLogs = [],
  vaccins = [],
  marketPrices = [],
  meteo = null,
} = {}) => {
  const pondeuses = buildPondeusesIntelligence({
    lots,
    productionLogs,
    alimentationLogs,
    stocks,
    marketPrices,
    meteo,
  });
  const chair = buildChairIntelligence({ lots, alimentationLogs, productionLogs, marketPrices });
  const animals = buildAnimauxSaleIntelligence({ animaux, alimentationLogs, vaccins, marketPrices });
  const ventes = buildVentesOpportunitiesIntelligence({
    opportunities,
    lots,
    animaux,
    cultures,
    stocks,
    alimentationLogs,
    productionLogs,
    vaccins,
    marketPrices,
  });

  const recommendations = [
    ...pondeuses.recommendations,
    ...chair.recommendations,
    ...animals.recommendations,
    ...ventes.recommendations,
  ];

  return {
    generated_at: new Date().toISOString(),
    scope: 'sale_pricing',
    pondeuses,
    chair,
    animals,
    ventes,
    recommendations,
    totals: {
      chair_lots: chair.lots.length,
      ready_animals: animals.animals.length,
      open_opportunities: ventes.opportunities.length,
      pricing_alerts: recommendations.filter((item) => item.type === 'prix').length,
    },
  };
};

export default buildSalePricingIntelligence;
