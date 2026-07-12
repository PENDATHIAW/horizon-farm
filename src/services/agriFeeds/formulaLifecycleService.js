/**
 * AGRI FEEDS — cycle de vie des formules + garde-fous commercialisation.
 */
import { FORMULA_STATUSES } from '../../config/agriFeeds.config.js';
import { toNumber } from '../../utils/format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const ALLOWED_TRANSITIONS = {
  draft: ['internal_testing', 'abandoned'],
  internal_testing: ['to_improve', 'internally_validated', 'abandoned'],
  to_improve: ['internal_testing', 'abandoned'],
  internally_validated: ['client_testing', 'commercializable', 'to_improve', 'suspended'],
  client_testing: ['commercializable', 'to_improve', 'suspended', 'abandoned'],
  commercializable: ['suspended', 'abandoned', 'client_testing'],
  suspended: ['internally_validated', 'commercializable', 'abandoned'],
  abandoned: [],
};

export function formulaStatusLabel(status) {
  return FORMULA_STATUSES.find((s) => s.value === status)?.label || status;
}

export function canTransitionFormulaStatus(from, to) {
  const allowed = ALLOWED_TRANSITIONS[norm(from)] || [];
  return allowed.includes(norm(to));
}

/**
 * Conditions pour passer commercializable.
 */
export function evaluateCommercializableGate(formula = {}, dataMap = {}) {
  const formulaId = String(formula.id || '');
  const versions = arr(dataMap.feed_formula_versions)
    .filter((v) => String(v.formula_id) === formulaId);
  const versionIds = new Set(versions.map((v) => String(v.id)));
  const trials = arr(dataMap.feed_trials).filter((t) => versionIds.has(String(t.formula_version_id)));
  const closedTrials = trials.filter((t) => t.end_date || t.decision);
  const humanValidated = trials.some((t) => t.reviewed_by_human && ['validate', 'validated'].includes(norm(t.decision)));
  const orders = arr(dataMap.feed_production_orders).filter((o) => versionIds.has(String(o.formula_version_id)));
  const completedOrders = orders.filter((o) => norm(o.status).includes('complet') && toNumber(o.real_cost_per_kg) > 0);
  const finished = arr(dataMap.feed_finished_batches).filter((b) => versionIds.has(String(b.formula_version_id)));
  const qc = arr(dataMap.feed_quality_checks).filter((q) => {
    const related = String(q.related_id || '');
    return finished.some((b) => String(b.id) === related)
      || orders.some((o) => String(o.id) === related)
      || norm(q.result).includes('ok')
      || norm(q.status).includes('pass');
  });

  const checks = [
    {
      id: 'trial_closed',
      ok: closedTrials.length >= 1,
      label: 'Au moins un test interne terminé',
    },
    {
      id: 'real_cost',
      ok: completedOrders.length >= 1 || finished.some((b) => toNumber(b.real_cost_per_kg || b.unit_cost) > 0),
      label: 'Coût réel de production calculé',
    },
    {
      id: 'animal_performance',
      ok: trials.some((t) => toNumber(t.feed_conversion_ratio) > 0
        || toNumber(t.mortality_rate) >= 0
        || toNumber(t.ending_weight_avg) > 0
        || toNumber(t.egg_production_total) > 0),
      label: 'Performance animale liée',
    },
    {
      id: 'human_validation',
      ok: humanValidated || Boolean(formula.technical_validator_name && norm(formula.technical_validation_status).includes('valid')),
      label: 'Confirmation enregistrée',
    },
    {
      id: 'quality_check',
      ok: qc.length >= 1 || finished.some((b) => ['accepted', 'ok', 'conforme'].includes(norm(b.quality_status))),
      label: 'Contrôle qualité minimum',
    },
  ];

  const blockers = checks.filter((c) => !c.ok).map((c) => c.label);
  return {
    allowed: blockers.length === 0,
    checks,
    blockers,
    message: blockers.length
      ? `Commercialisation bloquée : ${blockers.join(' · ')}.`
      : 'Conditions réunies pour le statut commercialisable (confirmation requise pour confirmer).',
  };
}

export function assertCanSetFormulaStatus(formula, nextStatus, dataMap = {}) {
  const from = norm(formula.status || 'draft');
  const to = norm(nextStatus);
  if (from === to) return { ok: true };

  if (!canTransitionFormulaStatus(from, to)) {
    return {
      ok: false,
      message: `Transition interdite : ${formulaStatusLabel(from)} → ${formulaStatusLabel(to)}.`,
    };
  }

  if (to === 'commercializable') {
    const gate = evaluateCommercializableGate(formula, dataMap);
    if (!gate.allowed) {
      return { ok: false, message: gate.message, gate };
    }
  }

  return { ok: true };
}

export function buildNextVersionCode(formula = {}, existingVersions = []) {
  const versions = arr(existingVersions).filter((v) => String(v.formula_id) === String(formula.id));
  const maxNum = versions.reduce((m, v) => Math.max(m, toNumber(v.version_number)), 0);
  const next = maxNum + 1;
  const base = formula.formula_code || formula.id || 'FORM';
  return {
    version_number: next,
    version_code: `${base}-v${next}`,
  };
}

export function duplicateFormulaVersion(version = {}, ingredients = [], formula = {}, allVersions = []) {
  const next = buildNextVersionCode(formula, allVersions);
  const newVersionId = `FFV-${Date.now().toString(36).toUpperCase()}`;
  const newIngredients = arr(ingredients)
    .filter((i) => String(i.formula_version_id) === String(version.id))
    .map((ing, idx) => ({
      ...ing,
      id: `FFI-${Date.now().toString(36).toUpperCase()}-${idx}`,
      formula_version_id: newVersionId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

  return {
    version: {
      ...version,
      id: newVersionId,
      version_number: next.version_number,
      version_code: next.version_code,
      status: 'draft',
      active: true,
      change_reason: `Duplication de ${version.version_code || version.id}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    ingredients: newIngredients,
  };
}
