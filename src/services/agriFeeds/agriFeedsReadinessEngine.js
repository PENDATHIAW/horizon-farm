/**
 * AGRI FEEDS — readiness data-driven (Mode 1 / 2A / 2B).
 * Pattern aligné sur valorisationReadinessEngine (score + blockers + nextActions).
 */
import {
  AGRI_FEEDS_DEPLOYMENT_MODES,
  AGRI_FEEDS_READINESS_THRESHOLDS,
  DEFAULT_PLANNED_FACILITY_ZONES,
} from '../../config/agriFeeds.config.js';
import { toNumber } from '../../utils/format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));

function isFeedStock(row = {}) {
  const text = norm(`${row.categorie || ''} ${row.produit || ''} ${row.product_name || ''}`);
  return text.includes('aliment') || text.includes('feed') || text.includes('provende')
    || text.includes('matiere_premiere_aliment') || text.includes('aliment_agri');
}

function isMarketFeedStock(row = {}) {
  const cat = norm(row.categorie || '');
  return cat.includes('aliment_betail') || cat.includes('aliment_avicole')
    || (isFeedStock(row) && !cat.includes('aliment_agri') && !cat.includes('matiere_premiere'));
}

function scorePhase1Reference(dataMap = {}) {
  const logs = arr(dataMap.alimentation_logs);
  const stocks = arr(dataMap.stock || dataMap.stocks).filter(isMarketFeedStock);
  const lots = arr(dataMap.avicole || dataMap.lots);
  const animaux = arr(dataMap.animaux);
  const fournisseurs = arr(dataMap.fournisseurs);
  const finances = arr(dataMap.finances || dataMap.transactions);

  const feedFinance = finances.filter((r) => {
    const t = norm(`${r.categorie || ''} ${r.libelle || ''} ${r.module_lie || ''}`);
    return t.includes('aliment') || t.includes('stock');
  });

  let score = 0;
  const met = [];
  const missing = [];
  const blockers = [];

  if (logs.length >= 5) {
    score += 25;
    met.push(`${logs.length} distributions d’aliment enregistrées`);
  } else if (logs.length >= 1) {
    score += 12;
    met.push(`${logs.length} distribution(s) d’aliment`);
    missing.push('Atteindre au moins 5 distributions pour une référence solide');
  } else {
    missing.push('Aucune distribution d’aliment enregistrée');
    blockers.push('Collecter les distributions d’aliment Phase 1');
  }

  if (stocks.length >= 1) {
    score += 15;
    met.push(`${stocks.length} ligne(s) stock aliment marché`);
  } else {
    missing.push('Aucun stock aliment marché');
    blockers.push('Enregistrer les achats d’aliment du marché');
  }

  const lotsWithFeed = lots.filter((lot) => {
    const id = String(lot.id || '');
    return logs.some((l) => String(l.cible_id || l.lot_id || '') === id)
      || toNumber(lot.cout_aliment || lot.alimentation_calculee) > 0;
  });
  if (lotsWithFeed.length >= 2 || (lotsWithFeed.length >= 1 && animaux.length >= 1)) {
    score += 20;
    met.push('Lots / animaux reliés à l’alimentation');
  } else if (lots.length + animaux.length > 0) {
    score += 8;
    missing.push('Relier davantage de lots aux distributions d’aliment');
  } else {
    missing.push('Aucun lot ou animal pour rattacher les coûts alimentaires');
  }

  if (fournisseurs.length >= 1) {
    score += 10;
    met.push('Fournisseurs disponibles');
  } else {
    missing.push('Aucun fournisseur enregistré');
  }

  if (feedFinance.length >= 1 || logs.some((l) => toNumber(l.montant_total) > 0)) {
    score += 15;
    met.push('Coûts alimentaires tracés (finance ou logs)');
  } else {
    missing.push('Coûts alimentaires non encore tracés');
  }

  const zones = arr(dataMap.feed_facility_zones);
  const plannedZones = zones.length > 0 ? zones : DEFAULT_PLANNED_FACILITY_ZONES;
  if (plannedZones.length >= 4) {
    score += 15;
    met.push(`${plannedZones.length} zones AGRI FEEDS prévues / suivies`);
  } else {
    missing.push('Réserver les zones site AGRI FEEDS');
  }

  return {
    score: clamp(score),
    met,
    missing,
    blockers,
    metrics: {
      alimentationLogs: logs.length,
      marketFeedStocks: stocks.length,
      lotsWithFeed: lotsWithFeed.length,
      fournisseurs: fournisseurs.length,
      zonesPlanned: plannedZones.length,
    },
  };
}

function scorePilotInternal(dataMap = {}, phase1 = {}) {
  const formulas = arr(dataMap.feed_formulas);
  const versions = arr(dataMap.feed_formula_versions);
  const rawMaterials = arr(dataMap.feed_raw_materials);
  const rawBatches = arr(dataMap.feed_raw_batches);
  const orders = arr(dataMap.feed_production_orders);
  const finished = arr(dataMap.feed_finished_batches);
  const trials = arr(dataMap.feed_trials);

  let score = Math.min(40, Math.round(phase1.score * 0.4));
  const met = [];
  const missing = [];
  const blockers = [];

  if (phase1.score < 35) {
    blockers.push('Référence Phase 1 encore trop faible pour un pilote fiable');
  }

  if (rawMaterials.length >= 1 || rawBatches.length >= 1) {
    score += 15;
    met.push('Matières premières enregistrées');
  } else {
    missing.push('Aucune matière première AGRI FEEDS');
  }

  if (formulas.length >= 1 || versions.length >= 1) {
    score += 15;
    met.push('Formulation(s) créée(s)');
  } else {
    missing.push('Aucune formule créée');
  }

  if (orders.some((o) => norm(o.status).includes('complet')) || finished.length >= 1) {
    score += 15;
    met.push('Production pilote réalisée');
  } else if (orders.length >= 1) {
    score += 8;
    missing.push('Clôturer au moins un ordre de fabrication');
  } else {
    missing.push('Aucun ordre de fabrication');
  }

  if (trials.some((t) => t.end_date || t.decision)) {
    score += 15;
    met.push('Test interne clôturé');
  } else if (trials.length >= 1) {
    score += 8;
    missing.push('Clôturer un test interne avec KPI');
  } else {
    missing.push('Aucun test interne sur animaux');
  }

  return { score: clamp(score), met, missing, blockers };
}

function scoreProgressiveSales(dataMap = {}, pilot = {}) {
  const formulas = arr(dataMap.feed_formulas);
  const commercializable = formulas.filter((f) => norm(f.status) === 'commercializable');
  const validated = formulas.filter((f) => ['internally_validated', 'client_testing', 'commercializable'].includes(norm(f.status)));
  const trials = arr(dataMap.feed_trials).filter((t) => t.reviewed_by_human && ['validate', 'validated'].includes(norm(t.decision)));
  const finished = arr(dataMap.feed_finished_batches).filter((b) => norm(b.quality_status) !== 'rejected' && b.active !== false);
  const sales = arr(dataMap.sales_orders).filter((s) => {
    const t = norm(`${s.notes || ''} ${s.source || ''} ${s.created_from || ''}`);
    return t.includes('agri_feeds') || t.includes('agri feeds');
  });

  let score = Math.min(35, Math.round(pilot.score * 0.35));
  const met = [];
  const missing = [];
  const blockers = [];

  if (validated.length >= 1) {
    score += 20;
    met.push(`${validated.length} formule(s) validée(s) ou en test client`);
  } else {
    missing.push('Aucune formule validée en interne');
    blockers.push('Valider au moins une formule après test interne');
  }

  if (trials.length >= 1) {
    score += 15;
    met.push('Validation humaine d’un test enregistrée');
  } else {
    missing.push('Aucune décision de test validée par un humain');
    blockers.push('L’humain doit valider avant commercialisation');
  }

  if (finished.length >= 1) {
    score += 15;
    met.push('Lot(s) produit(s) disponibles');
  } else {
    missing.push('Aucun lot produit fini prêt');
  }

  if (commercializable.length >= 1) {
    score += 15;
    met.push('Formule commercialisable');
  } else {
    missing.push('Aucune formule au statut commercialisable');
  }

  if (sales.length >= 1) {
    score += 10;
    met.push(`${sales.length} vente(s) AGRI FEEDS tracée(s)`);
  }

  return { score: clamp(score), met, missing, blockers };
}

function resolveMode(phase1Score, pilotScore, salesScore, dataMap = {}) {
  const formulas = arr(dataMap.feed_formulas);
  const hasCommercializable = formulas.some((f) => norm(f.status) === 'commercializable');
  const hasProduction = arr(dataMap.feed_production_orders).length > 0
    || arr(dataMap.feed_finished_batches).length > 0
    || arr(dataMap.feed_formulas).length > 0;

  if (
    salesScore >= AGRI_FEEDS_READINESS_THRESHOLDS.progressive_sales_min
    && hasCommercializable
  ) {
    return AGRI_FEEDS_DEPLOYMENT_MODES.PROGRESSIVE_SALES;
  }
  if (
    pilotScore >= AGRI_FEEDS_READINESS_THRESHOLDS.pilot_internal_min
    || hasProduction
  ) {
    return AGRI_FEEDS_DEPLOYMENT_MODES.PILOT_INTERNAL;
  }
  return AGRI_FEEDS_DEPLOYMENT_MODES.REFERENCE;
}

function buildNextActions(mode, phase1, pilot, sales) {
  const actions = [];
  if (mode.id === 'REFERENCE') {
    actions.push(...phase1.missing.slice(0, 3).map((m) => `Référence : ${m}`));
    if (phase1.score >= 35) {
      actions.push('Préparer les matières premières et la première formule (Mode 2A)');
    }
  } else if (mode.id === 'PILOT_INTERNAL') {
    actions.push(...pilot.missing.slice(0, 3).map((m) => `Pilote : ${m}`));
    if (pilot.score >= 60) {
      actions.push('Après validation humaine, envisager le statut commercialisable');
    }
  } else {
    actions.push(...sales.missing.slice(0, 3).map((m) => `Vente : ${m}`));
    actions.push('Suivre réachats clients et retours qualité');
  }
  return [...new Set(actions)].slice(0, 6);
}

/**
 * @param {object} dataMap — collections ERP (+ collections AGRI FEEDS si présentes)
 * @returns {object} readiness
 */
export function computeAgriFeedsReadiness(dataMap = {}) {
  const phase1 = scorePhase1Reference(dataMap);
  const pilot = scorePilotInternal(dataMap, phase1);
  const sales = scoreProgressiveSales(dataMap, pilot);
  const mode = resolveMode(phase1.score, pilot.score, sales.score, dataMap);

  const readinessScore = mode.id === 'REFERENCE'
    ? phase1.score
    : mode.id === 'PILOT_INTERNAL'
      ? Math.round((phase1.score * 0.35) + (pilot.score * 0.65))
      : Math.round((pilot.score * 0.4) + (sales.score * 0.6));

  const conditionsMet = [
    ...(mode.id === 'REFERENCE' ? phase1.met : []),
    ...(mode.id === 'PILOT_INTERNAL' ? [...phase1.met.slice(0, 2), ...pilot.met] : []),
    ...(mode.id === 'PROGRESSIVE_SALES' ? [...pilot.met.slice(0, 2), ...sales.met] : []),
  ];
  const conditionsMissing = [
    ...(mode.id === 'REFERENCE' ? phase1.missing : []),
    ...(mode.id === 'PILOT_INTERNAL' ? pilot.missing : []),
    ...(mode.id === 'PROGRESSIVE_SALES' ? sales.missing : []),
  ];
  const blockers = [
    ...(mode.id === 'REFERENCE' ? phase1.blockers : []),
    ...(mode.id === 'PILOT_INTERNAL' ? [...phase1.blockers.slice(0, 1), ...pilot.blockers] : []),
    ...(mode.id === 'PROGRESSIVE_SALES' ? sales.blockers : []),
  ];

  return {
    mode: mode.id,
    modeLabel: mode.label,
    modeShortLabel: mode.shortLabel,
    modeFlags: {
      allowsProduction: mode.allowsProduction,
      allowsSales: mode.allowsSales,
      allowsFormulas: mode.allowsFormulas,
      allowsRawMaterials: mode.allowsRawMaterials,
    },
    readiness_score: clamp(readinessScore),
    scores: {
      phase1_reference: phase1.score,
      pilot_internal: pilot.score,
      progressive_sales: sales.score,
    },
    conditions_met: [...new Set(conditionsMet)].slice(0, 8),
    conditions_missing: [...new Set(conditionsMissing)].slice(0, 8),
    blockers: [...new Set(blockers)].slice(0, 6),
    next_actions: buildNextActions(mode, phase1, pilot, sales),
    metrics: phase1.metrics,
    note: 'Le passage de mode dépend des données ERP (distributions, coûts, formules, tests, validation humaine), pas d’une date fixe.',
  };
}

export function normalizeAgriFeedsDataMap(dataMap = {}) {
  return {
    ...dataMap,
    alimentation_logs: arr(dataMap.alimentation_logs),
    stock: arr(dataMap.stock || dataMap.stocks),
    stocks: arr(dataMap.stocks || dataMap.stock),
    avicole: arr(dataMap.avicole || dataMap.lots),
    lots: arr(dataMap.lots || dataMap.avicole),
    animaux: arr(dataMap.animaux),
    fournisseurs: arr(dataMap.fournisseurs),
    finances: arr(dataMap.finances || dataMap.transactions),
    transactions: arr(dataMap.transactions || dataMap.finances),
    clients: arr(dataMap.clients),
    sales_orders: arr(dataMap.sales_orders),
    production_oeufs_logs: arr(dataMap.production_oeufs_logs || dataMap.productionLogs),
    feed_formulas: arr(dataMap.feed_formulas),
    feed_formula_versions: arr(dataMap.feed_formula_versions),
    feed_raw_materials: arr(dataMap.feed_raw_materials),
    feed_raw_batches: arr(dataMap.feed_raw_batches),
    feed_production_orders: arr(dataMap.feed_production_orders),
    feed_finished_batches: arr(dataMap.feed_finished_batches),
    feed_trials: arr(dataMap.feed_trials),
    feed_facility_zones: arr(dataMap.feed_facility_zones),
  };
}
