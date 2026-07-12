/**
 * AGRI FEEDS — essais internes + comparaison Phase 1 + confirmation.
 *
 * Fournit :
 *   - prepareTrial / commitTrial              : ouvre un essai (lot × formule)
 *   - prepareCloseTrial / commitCloseTrial    : clôture, KPI, décision proposée,
 *                                               comparaison Phase 1 formalisée
 *   - proposeTrialDecision                    : décision proposée par l’IA
 *   - prepareHumanValidation / commit         : confirmation explicite
 *
 * L’IA propose. L’humain décide.
 */
import { compareMarketFeedToAgriFeedsFormula } from './phase1FeedBenchmarkEngine.js';
import { toNumber } from '../../utils/format.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const clean = (v) => String(v || '').trim();
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function daysBetween(start, end) {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (!s || !e || Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
}

function computeTrialKpis(payload, opts = {}) {
  const startingCount = toNumber(payload.starting_count);
  const endingCount = toNumber(payload.ending_count);
  const startingWeight = toNumber(payload.starting_weight_avg);
  const endingWeight = toNumber(payload.ending_weight_avg);
  const totalFeed = toNumber(payload.total_feed_consumed);
  const totalCost = toNumber(payload.total_feed_cost || (totalFeed * toNumber(opts.unitCostPerKg)));
  const mortalityCount = toNumber(payload.mortality_count
    || (startingCount > 0 && endingCount >= 0 ? Math.max(0, startingCount - endingCount) : 0));
  const mortalityRate = startingCount > 0 ? (mortalityCount / startingCount) * 100 : null;

  const gain = startingCount > 0 && startingWeight > 0 && endingWeight > 0
    ? (endingWeight - startingWeight) * Math.max(endingCount, 1)
    : null;
  const fcr = gain && gain > 0 ? totalFeed / gain : null;
  const subjects = Math.max(1, endingCount || startingCount);
  const costPerAnimal = totalCost > 0 ? totalCost / subjects : null;
  const eggs = toNumber(payload.egg_production_total);
  const trays = eggs > 0 ? eggs / 30 : 0;
  const costPerTray = trays > 0 ? totalCost / trays : null;
  const layingRate = eggs > 0 && subjects > 0
    ? (eggs / (subjects * (daysBetween(payload.start_date, payload.end_date) || 1))) * 100
    : null;
  const costPerKgGain = gain && gain > 0 ? totalCost / gain : null;

  return {
    total_feed_consumed: totalFeed,
    total_feed_cost: totalCost,
    mortality_count: mortalityCount,
    mortality_rate: mortalityRate,
    feed_conversion_ratio: fcr,
    cost_feed_per_animal: costPerAnimal,
    cost_feed_per_tray: costPerTray,
    cost_feed_per_kg_gain: costPerKgGain,
    laying_rate: layingRate,
    egg_production_total: eggs || null,
    weight_gain_total: gain,
  };
}

/**
 * Propose une décision de sortie de test :
 *   validate / improve / retest / abandon
 * L’IA propose, l’humain décide.
 */
export function proposeTrialDecision({ trial = {}, comparison = null } = {}) {
  const mortality = toNumber(trial.mortality_rate);
  const fcr = toNumber(trial.feed_conversion_ratio);
  const overall = norm(comparison?.status || '');
  const favorable = arr(comparison?.comparison || []).filter((c) => c.result === 'favorable').length;
  const worse = arr(comparison?.comparison || []).filter((c) => c.result === 'moins_performant').length;

  const reasons = [];
  const warnings = [];

  if (!comparison || overall === 'insufficient_data' || overall === 'donnees_insuffisantes') {
    reasons.push('Comparaison Phase 1 encore incomplète');
  }
  if (mortality > 10) {
    reasons.push(`Mortalité élevée (${mortality.toFixed(1)} %)`);
    return {
      value: 'abandon',
      label: 'Proposer d’abandonner',
      confidence: 'moyenne',
      reasons,
      warnings,
    };
  }
  if (fcr > 0 && fcr > 2.5) {
    warnings.push(`Indice de consommation élevé (${fcr.toFixed(2)})`);
  }

  if (overall === 'favorable' && favorable >= 3 && mortality <= 7) {
    return {
      value: 'validate',
      label: 'Proposer de valider',
      confidence: 'haute',
      reasons: [`${favorable} indicateur(s) favorable(s)`, `Mortalité ${mortality.toFixed(1)} %`],
      warnings,
    };
  }
  if (overall === 'moins_performant' || worse > favorable) {
    return {
      value: 'improve',
      label: 'Proposer d’améliorer la formule',
      confidence: 'moyenne',
      reasons: [`${worse} indicateur(s) moins performants`],
      warnings,
    };
  }
  if (favorable === 0 && worse === 0) {
    return {
      value: 'retest',
      label: 'Proposer un nouveau cycle',
      confidence: 'faible',
      reasons: ['Aucun indicateur conclusif — cycle supplémentaire recommandé'],
      warnings,
    };
  }
  return {
    value: 'improve',
    label: 'Proposer d’améliorer',
    confidence: 'moyenne',
    reasons: reasons.length ? reasons : ['Résultat mitigé'],
    warnings,
  };
}

export function prepareTrial(payload = {}, dataMap = {}) {
  const versionId = clean(payload.formula_version_id);
  if (!versionId) return { ok: false, error: 'Version de formule obligatoire.' };
  const version = arr(dataMap.feed_formula_versions).find((v) => String(v.id) === versionId);
  if (!version) return { ok: false, error: 'Version de formule introuvable.' };

  const formula = arr(dataMap.feed_formulas).find((f) => String(f.id) === String(version.formula_id));
  if (['abandoned', 'suspended'].includes(norm(formula?.status || ''))) {
    return { ok: false, error: 'Formule suspendue ou abandonnée — essai bloqué.' };
  }

  const animalLotId = clean(payload.animal_lot_id);
  if (!animalLotId) return { ok: false, error: 'Lot / animal cible obligatoire.' };
  const lot = arr(dataMap.avicole || dataMap.lots).find((l) => String(l.id) === animalLotId)
    || arr(dataMap.animaux).find((a) => String(a.id) === animalLotId);

  const finishedId = clean(payload.finished_batch_id);
  const finished = finishedId
    ? arr(dataMap.feed_finished_batches).find((b) => String(b.id) === finishedId)
    : null;
  if (finishedId && !finished) {
    return { ok: false, error: 'Lot produit fini introuvable.' };
  }
  if (finished && norm(finished.quality_status) === 'rejected') {
    return { ok: false, error: 'Lot fini rejeté — utilisation en essai bloquée.' };
  }

  const id = clean(payload.id) || makeId('FTR');
  const trialCode = clean(payload.trial_code) || `TR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${id.slice(-4)}`;

  const trial = {
    id,
    trial_code: trialCode,
    formula_version_id: versionId,
    finished_batch_id: finishedId || null,
    animal_lot_id: animalLotId,
    animal_type: clean(payload.animal_type)
      || (lot?.type || formula?.target_species || ''),
    species: clean(payload.species || formula?.target_species || ''),
    target_stage: clean(payload.target_stage || formula?.target_stage || ''),
    start_date: clean(payload.start_date) || new Date().toISOString().slice(0, 10),
    end_date: null,
    starting_count: toNumber(payload.starting_count
      || lot?.current_count || lot?.initial_count || 0),
    ending_count: 0,
    starting_weight_avg: toNumber(payload.starting_weight_avg || lot?.weight_avg || 0),
    ending_weight_avg: null,
    total_feed_consumed: 0,
    total_feed_cost: 0,
    feed_conversion_ratio: null,
    mortality_count: 0,
    mortality_rate: null,
    egg_production_total: null,
    laying_rate: null,
    cost_feed_per_animal: null,
    cost_feed_per_tray: null,
    cost_feed_per_kg_gain: null,
    revenue: null,
    margin: null,
    decision: null,
    decision_notes: '',
    reviewed_by_human: false,
    reviewed_by: null,
    reviewed_at: null,
    phase1_comparison_id: null,
    phase1_comparison: false,
    status: 'in_progress',
    notes: clean(payload.notes) || '',
    created_from: 'agri_feeds_trial_workflow',
  };

  return {
    ok: true,
    trial,
    formula,
    version,
    finished,
    businessEvent: {
      event_type: 'agri_feeds_trial_open',
      module_source: 'agri_feeds',
      entity_type: 'feed_trial',
      entity_id: id,
      title: `Essai ouvert — ${trialCode}`,
      description: `${formula?.name || version.version_code} · lot ${animalLotId} · ${trial.starting_count} sujets`,
      event_date: trial.start_date,
      severity: 'info',
    },
  };
}

export async function commitTrial(preview = {}, handlers = {}) {
  if (!preview?.ok) throw new Error(preview?.error || 'Essai invalide');
  const results = {};
  if (handlers.onCreateTrial) {
    results.trial = await handlers.onCreateTrial(preview.trial);
  }
  if (handlers.onCreateBusinessEvent && preview.businessEvent) {
    await handlers.onCreateBusinessEvent(preview.businessEvent);
  }
  return results;
}

export function prepareCloseTrial(payload = {}, dataMap = {}) {
  const trialId = clean(payload.trial_id || payload.id);
  const trial = arr(dataMap.feed_trials).find((t) => String(t.id) === trialId);
  if (!trial) return { ok: false, error: 'Essai introuvable.' };
  if (norm(trial.status) === 'closed') return { ok: false, error: 'Essai déjà clôturé.' };
  if (norm(trial.status) === 'cancelled') return { ok: false, error: 'Essai annulé.' };

  const endDate = clean(payload.end_date) || new Date().toISOString().slice(0, 10);
  if (endDate < String(trial.start_date || '')) {
    return { ok: false, error: 'Date de clôture antérieure à la date de démarrage.' };
  }

  const finished = trial.finished_batch_id
    ? arr(dataMap.feed_finished_batches).find((b) => String(b.id) === String(trial.finished_batch_id))
    : null;

  const kpis = computeTrialKpis(
    {
      ...trial,
      ending_count: payload.ending_count,
      ending_weight_avg: payload.ending_weight_avg,
      total_feed_consumed: payload.total_feed_consumed,
      total_feed_cost: payload.total_feed_cost,
      mortality_count: payload.mortality_count,
      egg_production_total: payload.egg_production_total,
      start_date: trial.start_date,
      end_date: endDate,
    },
    { unitCostPerKg: toNumber(finished?.unit_cost) },
  );

  if (toNumber(payload.total_feed_consumed) <= 0) {
    return { ok: false, error: 'Quantité totale d’aliment consommée obligatoire.' };
  }
  if (toNumber(payload.ending_count) < 0) {
    return { ok: false, error: 'Effectif final invalide.' };
  }

  const comparison = compareMarketFeedToAgriFeedsFormula({
    dataMap,
    animalLotId: trial.animal_lot_id,
    formulaVersionId: trial.formula_version_id,
    period: { start: trial.start_date, end: endDate },
  });

  const proposal = proposeTrialDecision({ trial: { ...trial, ...kpis }, comparison });

  const comparisonId = makeId('FPC');
  const comparisonRow = {
    id: comparisonId,
    trial_id: trial.id,
    formula_version_id: trial.formula_version_id,
    animal_lot_id: trial.animal_lot_id,
    reference_source: 'phase_1_market',
    reference_period_start: comparison?.market?.period_start || trial.start_date,
    reference_period_end: comparison?.market?.period_end || endDate,
    market_snapshot: comparison?.market || {},
    agri_snapshot: comparison?.agriFeeds || {},
    metrics: comparison?.comparison || [],
    overall_status: comparison?.status || 'donnees_insuffisantes',
    overall_message: comparison?.message || '',
    favorable_count: arr(comparison?.comparison).filter((m) => m.result === 'favorable').length,
    worse_count: arr(comparison?.comparison).filter((m) => m.result === 'moins_performant').length,
    equivalent_count: arr(comparison?.comparison).filter((m) => m.result === 'equivalent').length,
    reviewed_by_human: false,
    reviewed_by: null,
    reviewed_at: null,
    created_at: new Date().toISOString(),
  };

  const trialPatch = {
    id: trial.id,
    ...kpis,
    end_date: endDate,
    status: 'closed',
    phase1_comparison_id: comparisonId,
    phase1_comparison: true,
    revenue: toNumber(payload.revenue) || trial.revenue,
    margin: toNumber(payload.revenue)
      ? toNumber(payload.revenue) - kpis.total_feed_cost
      : trial.margin,
    updated_at: new Date().toISOString(),
  };

  return {
    ok: true,
    trial,
    trialPatch,
    comparison,
    comparisonRow,
    proposal,
    kpis,
    businessEvent: {
      event_type: 'agri_feeds_trial_closed',
      module_source: 'agri_feeds',
      entity_type: 'feed_trial',
      entity_id: trial.id,
      title: `Essai clôturé — ${trial.trial_code}`,
      description: `${kpis.total_feed_consumed} kg · IC ${kpis.feed_conversion_ratio?.toFixed?.(2) || '—'} · `
        + `Mort. ${kpis.mortality_rate?.toFixed?.(1) || '—'} % · Proposition IA : ${proposal.label}`,
      amount: kpis.total_feed_cost,
      event_date: endDate,
      severity: proposal.value === 'abandon' ? 'moyenne' : 'info',
    },
    alert: proposal.value === 'abandon' ? {
      title: `Essai à revoir — ${trial.trial_code}`,
      message: `Suggestion : abandon (${proposal.reasons.join(' · ')}). Confirmation requise.`,
      severity: 'moyenne',
      module_source: 'agri_feeds',
      entity_id: trial.id,
      action_recommandee: 'Décision humaine à saisir dans Tests & comparaison.',
      created_from: 'agri_feeds_trial_workflow',
    } : null,
  };
}

export async function commitCloseTrial(preview = {}, handlers = {}) {
  if (!preview?.ok) throw new Error(preview?.error || 'Clôture essai invalide');
  const results = {};
  if (handlers.onUpdateTrial) {
    results.trial = await handlers.onUpdateTrial(preview.trialPatch.id, preview.trialPatch);
  }
  if (handlers.onCreateComparison && preview.comparisonRow) {
    results.comparison = await handlers.onCreateComparison(preview.comparisonRow);
  }
  if (handlers.onCreateBusinessEvent && preview.businessEvent) {
    await handlers.onCreateBusinessEvent(preview.businessEvent);
  }
  if (handlers.onCreateAlert && preview.alert) {
    await handlers.onCreateAlert(preview.alert);
  }
  return results;
}

/**
 * Confirmation explicite d’un essai clôturé.
 * L’IA a proposé, l’humain confirme (ou choisit une autre décision).
 */
export function prepareHumanValidation(payload = {}, dataMap = {}) {
  const trialId = clean(payload.trial_id || payload.id);
  const trial = arr(dataMap.feed_trials).find((t) => String(t.id) === trialId);
  if (!trial) return { ok: false, error: 'Essai introuvable.' };
  if (norm(trial.status) !== 'closed') {
    return { ok: false, error: 'Seul un essai clôturé peut être validé.' };
  }
  const decision = norm(payload.decision);
  if (!['validate', 'improve', 'abandon', 'retest'].includes(decision)) {
    return { ok: false, error: 'Décision humaine invalide.' };
  }
  const validator = clean(payload.reviewed_by);
  if (!validator) return { ok: false, error: 'Nom du validateur obligatoire.' };

  const trialPatch = {
    id: trial.id,
    decision,
    decision_notes: clean(payload.decision_notes) || '',
    reviewed_by_human: true,
    reviewed_by: validator,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const comparisonPatch = trial.phase1_comparison_id ? {
    id: trial.phase1_comparison_id,
    reviewed_by_human: true,
    reviewed_by: validator,
    reviewed_at: trialPatch.reviewed_at,
  } : null;

  return {
    ok: true,
    trial,
    trialPatch,
    comparisonPatch,
    businessEvent: {
      event_type: 'agri_feeds_trial_human_validation',
      module_source: 'agri_feeds',
      entity_type: 'feed_trial',
      entity_id: trial.id,
      title: `Essai validé humainement — ${trial.trial_code}`,
      description: `Décision : ${decision} · Par : ${validator}`,
      event_date: new Date().toISOString().slice(0, 10),
      severity: 'info',
    },
  };
}

export async function commitHumanValidation(preview = {}, handlers = {}) {
  if (!preview?.ok) throw new Error(preview?.error || 'Validation invalide');
  const results = {};
  if (handlers.onUpdateTrial) {
    results.trial = await handlers.onUpdateTrial(preview.trialPatch.id, preview.trialPatch);
  }
  if (handlers.onUpdateComparison && preview.comparisonPatch) {
    results.comparison = await handlers.onUpdateComparison(preview.comparisonPatch.id, preview.comparisonPatch);
  }
  if (handlers.onCreateBusinessEvent && preview.businessEvent) {
    await handlers.onCreateBusinessEvent(preview.businessEvent);
  }
  return results;
}

export { computeTrialKpis };
