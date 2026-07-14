import { buildBroilerLotDecision, buildLayerLotDecision } from '../services/avicoleDecisionEngine.js';
import { calculateUnifiedAnimalCost, calculateUnifiedLotCost } from '../services/unifiedCostService.js';
import { avicoleHasActiveBirds } from './avicoleMetrics.js';
import {
  buildBovinKpis,
  buildChairKpis,
  buildPondeuseKpis,
  isBovinAnimal,
  isCaprinAnimal,
  isChairLot,
  isOvinAnimal,
  isPondeuseLot,
  revenueOfAnimal,
  revenueOfLot,
} from './elevageActivityPnl.js';
import { fmtCurrency, fmtNumber, fmtPercent } from './format.js';
import { PRODUCTION_FINANCE_LABELS, PRODUCTION_FINANCE_SOURCE } from './productionFinancialTruth.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);
const lower = (v) => String(v || '').toLowerCase();

const labelOf = (row = {}) => row.name || row.nom || row.id || 'Entité';
const isClosedAnimal = (row = {}) =>
  ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'].some((w) =>
    lower(row.status || row.statut).includes(w));

function unifiedLot(row, ctx) {
  return calculateUnifiedLotCost({
    lot: row,
    alimentationLogs: ctx.feedLogs || ctx.alimentationLogs || [],
    productionLogs: ctx.productionLogs || [],
    healthEvents: ctx.healthEvents || [],
  });
}

function unifiedAnimal(row, ctx) {
  return calculateUnifiedAnimalCost({
    animal: row,
    alimentationLogs: ctx.feedLogs || ctx.alimentationLogs || [],
    vaccins: ctx.healthEvents || [],
    healthEvents: ctx.healthEvents || [],
  });
}

function growthLagPct(decision = {}) {
  const adaptive = n(decision.adaptiveGainPerDay ?? decision.realGainPerDay);
  const real = n(decision.realGainPerDay);
  if (adaptive <= 0 || real <= 0) return 0;
  if (real >= adaptive) return 0;
  return Math.round(((adaptive - real) / adaptive) * 100);
}

function scoreChairLot(lot, ctx) {
  const decision = buildBroilerLotDecision(lot);
  let score = 0;
  const hints = [];
  const lag = growthLagPct(decision);
  if (decision.status === 'retard_croissance' || lag >= 8) {
    score += 75 + Math.min(lag, 25);
    hints.push(`retard de croissance de ${lag || 10} %`);
  }
  if (n(decision.mortalityRate) >= 5) {
    score += 40;
    hints.push(`mortalité ${decision.mortalityRate} %`);
  }
  const kpi = buildChairKpis(lot, ctx);
  const peers = arr(ctx.lots).filter(isChairLot).map((l) => buildChairKpis(l, ctx)).filter((p) => p.costPerKg > 0);
  if (kpi.costPerKg && peers.length > 1) {
    const avg = peers.reduce((s, p) => s + n(p.costPerKg), 0) / peers.length;
    const diff = ((kpi.costPerKg - avg) / avg) * 100;
    if (diff > 10) {
      score += 35;
      hints.push(`IC +${fmtPercent(diff)} vs lots chair`);
    }
  }
  if (kpi.reliable && kpi.margin != null && kpi.margin < 0) {
    score += 45;
    hints.push('marge brute technique négative');
  }
  return { score, hints, decision, kpi, kind: 'chair' };
}

function scorePondeuseLot(lot, ctx) {
  const decision = buildLayerLotDecision(lot, ctx.productionLogs || []);
  let score = 0;
  const hints = [];
  if (['baisse_ponte', 'casses_elevees', 'ramassage_manquant'].includes(decision.status)) {
    score += 70;
    if (decision.status === 'baisse_ponte') hints.push(`baisse de ponte (${decision.layingRateLabel || '-'})`);
    else if (decision.status === 'casses_elevees') hints.push('casses élevées');
    else hints.push('ramassage manquant');
  }
  if (n(decision.mortalityRate) >= 4) {
    score += 30;
    hints.push(`mortalité ${decision.mortalityRate} %`);
  }
  const kpi = buildPondeuseKpis(lot, ctx);
  if (kpi.reliable && kpi.margin != null && kpi.margin < 0) {
    score += 40;
    hints.push('marge brute technique négative');
  }
  return { score, hints, decision, kpi, kind: 'pondeuse' };
}

function scoreAnimal(animal, ctx, speciesKind) {
  const kpi = buildBovinKpis(animal, ctx);
  let score = 0;
  const hints = [];
  const entry = n(animal.poids_entree ?? animal.poids_initial);
  const weight = n(animal.poids ?? animal.weight);
  const days = n(animal.age_days ?? animal.duree_embouche_jours);
  const gmq = kpi.gmq;
  if (days > 30 && entry > 0 && weight > entry) {
    const expectedGmq = 800;
    if (gmq && gmq < expectedGmq * 0.85) {
      const lag = Math.round((1 - gmq / expectedGmq) * 100);
      score += 60 + Math.min(lag, 20);
      hints.push(`retard de croissance de ${lag} % (GMQ ${fmtNumber(gmq)} g/j)`);
    }
  }
  if (kpi.reliable && kpi.margin != null && kpi.margin < 0) {
    score += 40;
    hints.push('marge brute technique négative');
  }
  return { score, hints, kpi, kind: speciesKind };
}

function scoreTransformation(ctx) {
  const rows = arr(ctx.transformationRows);
  const recent = rows.filter((r) => /abattage|transformation|viande/.test(lower(`${r.kind || ''} ${r.kindLabel || ''}`)));
  const meatKg = n(ctx.meatStockKg);
  let score = 0;
  const hints = [];
  if (recent.length >= 2 && meatKg < 10) {
    score += 50;
    hints.push('sorties transformation sans stock viande visible');
  }
  if (recent.length === 0 && meatKg === 0) return { score: 0, hints: [], kind: 'transformation' };
  if (recent.length) hints.push(`${recent.length} sortie(s) récente(s)`);
  return { score, hints, kind: 'transformation', recentCount: recent.length, meatStockKg: meatKg };
}

export function listProductionDiagnosticTargets({
  lots = [],
  animaux = [],
  transformationRows = [],
  meatStockKg = 0,
  marginContext = {},
} = {}) {
  const ctx = { ...marginContext, lots, transformationRows, meatStockKg };
  const targets = [];

  arr(lots).filter((lot) => avicoleHasActiveBirds(lot) && isChairLot(lot)).forEach((lot) => {
    const { score, hints } = scoreChairLot(lot, ctx);
    targets.push({
      id: `lot:${lot.id}`,
      entityId: lot.id,
      type: 'lot_chair',
      category: 'Chair',
      label: labelOf(lot),
      entity: lot,
      criticalityScore: score,
      selectionHint: hints[0] || 'lot chair actif',
    });
  });

  arr(lots).filter((lot) => avicoleHasActiveBirds(lot) && isPondeuseLot(lot)).forEach((lot) => {
    const { score, hints } = scorePondeuseLot(lot, ctx);
    targets.push({
      id: `lot:${lot.id}`,
      entityId: lot.id,
      type: 'lot_pondeuse',
      category: 'Pondeuses',
      label: labelOf(lot),
      entity: lot,
      criticalityScore: score,
      selectionHint: hints[0] || 'bande pondeuse active',
    });
  });

  arr(animaux).filter((a) => !isClosedAnimal(a)).forEach((animal) => {
    let speciesKind;
    let category;
    if (isCaprinAnimal(animal)) {
      speciesKind = 'caprin';
      category = 'Caprins';
    } else if (isBovinAnimal(animal)) {
      speciesKind = 'bovin';
      category = 'Bovins';
    } else if (isOvinAnimal(animal)) {
      speciesKind = 'ovin';
      category = 'Ovins';
    } else return;

    const { score, hints } = scoreAnimal(animal, ctx, speciesKind);
    targets.push({
      id: `animal:${animal.id}`,
      entityId: animal.id,
      type: `animal_${speciesKind}`,
      category,
      label: labelOf(animal),
      entity: animal,
      criticalityScore: score,
      selectionHint: hints[0] || `${category.toLowerCase()} actif`,
    });
  });

  const tr = scoreTransformation(ctx);
  if (tr.score > 0 || n(tr.recentCount) > 0 || n(ctx.meatStockKg) > 0) {
    targets.push({
      id: 'transformation:hub',
      entityId: 'transformation',
      type: 'transformation',
      category: 'Transformation',
      label: 'Flux transformation / viande',
      entity: { recentCount: tr.recentCount, meatStockKg: tr.meatStockKg },
      criticalityScore: tr.score,
      selectionHint: tr.hints[0] || 'suivi viande produite',
    });
  }

  return targets.sort((a, b) => b.criticalityScore - a.criticalityScore);
}

export function pickMostCriticalTarget(options = {}) {
  const targets = listProductionDiagnosticTargets(options);
  if (!targets.length) return null;
  const top = targets[0];
  if (top.criticalityScore <= 0) {
    const fallback = targets.find((t) => t.criticalityScore > 0) || targets[0];
    return { target: fallback, auto: true };
  }
  return { target: top, auto: true };
}

export function buildProductionDiagnostic(target, marginContext = {}) {
  if (!target?.entity) return null;

  const ctx = { ...marginContext, lots: marginContext.lots || [] };
  const name = target.label || labelOf(target.entity);
  const selectionPrefix = target.type === 'transformation'
    ? 'Flux analysé'
    : target.type.startsWith('animal_')
      ? 'Animal analysé'
      : 'Lot analysé';
  const selectionReason = `${selectionPrefix} : ${name} (${target.selectionHint || 'priorité production'})`;

  if (target.type === 'transformation') {
    const recent = n(target.entity.recentCount);
    const stock = n(target.entity.meatStockKg);
    return {
      entityId: target.entityId,
      entityType: target.type,
      category: target.category,
      label: name,
      selectionReason,
      constat: recent ? `${recent} sortie(s) transformation récente(s).` : 'Peu de mouvements transformation sur la période.',
      causeProbable: stock < 10 && recent ? 'Stock viande non valorisé ou non saisi après abattage.' : 'Flux vivant → produit fini à suivre dans Transformation.',
      impact: stock < 10 ? 'Risque de perte de traçabilité et de marge non calculée sur la viande.' : 'Visibilité réduite sur le rendement carcasse.',
      actionRecommandee: 'Ouvrir Transformation, vérifier abattages et stock viande (Achats & Stock).',
      financial: {
        costLabel: PRODUCTION_FINANCE_LABELS.costTotal,
        costValue: '-',
        revenueLabel: PRODUCTION_FINANCE_LABELS.revenue,
        revenueValue: '-',
        margin: {
          label: PRODUCTION_FINANCE_LABELS.marginGross,
          value: '-',
          tone: 'neutral',
          note: PRODUCTION_FINANCE_LABELS.marginNote,
        },
        source: PRODUCTION_FINANCE_LABELS.partial,
      },
      reliable: false,
    };
  }

  const isLot = target.type.startsWith('lot_');
  const row = target.entity;
  const unified = isLot ? unifiedLot(row, ctx) : unifiedAnimal(row, ctx);
  const revenue = isLot ? revenueOfLot(row) : revenueOfAnimal(row);
  const totalCost = n(unified.totalCost);
  const margin = revenue > 0 ? revenue - totalCost : null;

  let constat;
  let causeProbable;
  let impact;
  let actionRecommandee;

  if (target.type === 'lot_chair') {
    const decision = buildBroilerLotDecision(row);
    const lag = growthLagPct(decision);
    const kpi = buildChairKpis(row, ctx);
    constat = `Poids moyen ${kpi.avgWeight?.toFixed(2) || '-'} kg · mortalité ${fmtNumber(kpi.mortality)} · statut ${decision.status || '-'}.`;
    if (decision.status === 'retard_croissance' || lag >= 8) {
      causeProbable = `Gain quotidien inférieur à la cible adaptative (écart ~${lag || 10} %).`;
      impact = 'Allongement du cycle et hausse de l’IC si la vente est retardée.';
      actionRecommandee = 'Vérifier ration, eau, température et Santé - pesée dans Avicole.';
    } else if (kpi.mortalityRate > 5) {
      causeProbable = 'Mortalité élevée sur la bande.';
      impact = 'Perte d’effectif et coût de production unitaire en hausse.';
      actionRecommandee = 'Analyser causes en Santé et journal mortalité Avicole.';
    } else if (margin != null && margin < 0) {
      causeProbable = 'Coût unifié supérieur au revenu enregistré sur la fiche.';
      impact = `Marge brute technique ${fmtCurrency(margin)}.`;
      actionRecommandee = 'Revoir prix de vente ou réduire IC via Alimentation.';
    } else {
      causeProbable = 'Performance globalement dans la norme pour les données disponibles.';
      impact = 'Continuer le suivi hebdomadaire.';
      actionRecommandee = 'Maintenir ramassages / pesées et surveiller l’IC.';
    }
  } else if (target.type === 'lot_pondeuse') {
    const decision = buildLayerLotDecision(row, ctx.productionLogs || []);
    const kpi = buildPondeuseKpis(row, ctx);
    constat = `Taux ponte ${decision.layingRateLabel || '-'} · œufs vendables période ${fmtNumber(kpi.eggsSellable)}.`;
    if (decision.status === 'baisse_ponte') {
      causeProbable = 'Production d’œufs sous l’objectif vivant ou âge du lot.';
      impact = 'Baisse de revenus œufs et hausse du coût par œuf.';
      actionRecommandee = 'Contrôler alimentation, lumière, eau et santé - Avicole journal ponte.';
    } else if (kpi.margin != null && kpi.margin < 0) {
      causeProbable = 'Coût unifié pondeuses supérieur aux ventes enregistrées.';
      impact = `Marge brute technique ${fmtCurrency(kpi.margin)}.`;
      actionRecommandee = 'Optimiser ration ou renégocier prix tablettes/œufs.';
    } else {
      causeProbable = 'Bande stable - surveiller casses et ramassages.';
      impact = 'Rendement ponte à maintenir.';
      actionRecommandee = 'Enregistrer les ramassages et suivre le stock œufs.';
    }
  } else {
    const kpi = buildBovinKpis(row, ctx);
    constat = `Poids ${fmtNumber(kpi.weight)} kg · GMQ ${kpi.gmq ? `${fmtNumber(kpi.gmq)} g/j` : '-'} · cible ${kpi.targetWeight || '-'} kg.`;
    const lag = kpi.gmq && kpi.gmq < 700 ? Math.round((1 - kpi.gmq / 800) * 100) : 0;
    if (lag >= 10) {
      causeProbable = `GMQ en retard (~${lag} % sous référence embouche).`;
      impact = 'Délai avant poids cible et coût alimentation accru.';
      actionRecommandee = 'Vérifier ration et santé - pesée sur Animaux.';
    } else if (margin != null && margin < 0) {
      causeProbable = 'Coût unifié animal supérieur au revenu fiche.';
      impact = `Marge brute technique ${fmtCurrency(margin)}.`;
      actionRecommandee = 'Réévaluer prix vente ou réduire coûts alimentation/santé.';
    } else {
      causeProbable = 'Cheptel dans la norme pour les données saisies.';
      impact = 'Suivi GMQ et coût/kg recommandé.';
      actionRecommandee = 'Pesée régulière et mise à jour fiche animal.';
    }
  }

  return {
    entityId: target.entityId,
    entityType: target.type,
    category: target.category,
    label: name,
    selectionReason,
    constat,
    causeProbable,
    impact,
    actionRecommandee,
    financial: {
      costLabel: PRODUCTION_FINANCE_LABELS.costTotal,
      costValue: totalCost > 0 ? fmtCurrency(totalCost) : '-',
      revenueLabel: PRODUCTION_FINANCE_LABELS.revenue,
      revenueValue: revenue > 0 ? fmtCurrency(revenue) : '-',
      margin: {
        label: PRODUCTION_FINANCE_LABELS.marginGross,
        value: margin != null ? fmtCurrency(margin) : '-',
        tone: margin > 0 ? 'good' : margin < 0 ? 'bad' : 'warn',
        note: PRODUCTION_FINANCE_LABELS.marginNote,
      },
      source: PRODUCTION_FINANCE_SOURCE,
    },
    reliable: totalCost > 0 && (margin != null || revenue > 0),
  };
}
