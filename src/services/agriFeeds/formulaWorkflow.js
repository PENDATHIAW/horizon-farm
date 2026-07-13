/**
 * AGRI FEEDS - création / mise à jour formules + versions + coûts théoriques.
 */
import { computeTheoreticalFormulaCost, compareFormulaCostToPrevious, availableStockForMaterial } from './feedCostEngine.js';
import { assertCanSetFormulaStatus, buildNextVersionCode, formulaStatusLabel } from './formulaLifecycleService.js';
import { toNumber } from '../../utils/format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (v) => String(v || '').trim();

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function prepareFormulaDraft(payload = {}, context = {}) {
  const name = clean(payload.name);
  if (!name) return { ok: false, error: 'Nom de formule obligatoire.' };
  const species = clean(payload.target_species) || 'other';
  const formulaId = clean(payload.id) || makeId('FF');
  const formulaCode = clean(payload.formula_code) || `AF-${species.slice(0, 3).toUpperCase()}-${formulaId.slice(-4)}`;

  const formula = {
    id: formulaId,
    formula_code: formulaCode,
    name,
    target_species: species,
    target_stage: clean(payload.target_stage) || '',
    objective: clean(payload.objective) || '',
    status: clean(payload.status) || 'draft',
    created_by: clean(payload.created_by) || context.userName || '',
    technical_validation_status: '',
    technical_validator_name: '',
    notes: clean(payload.notes) || '',
    created_from: 'agri_feeds_formula_workflow',
  };

  const versionMeta = buildNextVersionCode(formula, []);
  const versionId = makeId('FFV');
  const materials = arr(context.feed_raw_materials);
  const ingredientInputs = arr(payload.ingredients);

  const enrichedIngredients = ingredientInputs.map((ing, idx) => {
    const material = materials.find((m) => String(m.id) === String(ing.raw_material_id));
    return {
      id: makeId('FFI') + idx,
      formula_version_id: versionId,
      raw_material_id: ing.raw_material_id,
      raw_material_name: material?.name || '',
      percentage: toNumber(ing.percentage),
      quantity_for_100kg: toNumber(ing.percentage),
      latest_unit_cost: toNumber(ing.latest_unit_cost),
      notes: ing.notes || '',
      is_experimental: Boolean(material?.is_experimental),
    };
  });

  const cost = computeTheoreticalFormulaCost(enrichedIngredients, context);
  const stockAlerts = cost.ingredients.map((ing) => {
    const avail = availableStockForMaterial(ing.raw_material_id, context);
    const needed = toNumber(ing.quantity_for_100kg);
    if (needed > 0 && avail.kg < needed) {
      return {
        type: 'stock_insuffisant',
        severity: 'attention',
        message: `Stock insuffisant pour ${ing.raw_material_name || ing.raw_material_id} (${avail.kg} kg dispo / ${needed} kg pour 100 kg).`,
      };
    }
    return null;
  }).filter(Boolean);

  const previousVersions = arr(context.feed_formula_versions)
    .filter((v) => String(v.formula_id) === formulaId)
    .sort((a, b) => toNumber(b.version_number) - toNumber(a.version_number));
  const previousCost = previousVersions[0] ? toNumber(previousVersions[0].theoretical_cost_per_kg) : 0;
  const costCompare = compareFormulaCostToPrevious(cost.theoretical_cost_per_kg, previousCost);

  const version = {
    id: versionId,
    formula_id: formulaId,
    version_number: versionMeta.version_number,
    version_code: versionMeta.version_code,
    theoretical_cost_per_kg: cost.theoretical_cost_per_kg,
    expected_performance_notes: clean(payload.expected_performance_notes) || '',
    change_reason: clean(payload.change_reason) || 'Création initiale',
    status: 'draft',
    active: true,
    created_from: 'agri_feeds_formula_workflow',
  };

  return {
    ok: true,
    formula,
    version,
    ingredients: cost.ingredients.map((ing, idx) => ({
      ...enrichedIngredients[idx],
      ...ing,
      formula_version_id: versionId,
    })),
    cost,
    alerts: [...cost.alerts, ...stockAlerts],
    costCompare,
    businessEvent: {
      event_type: 'agri_feeds_formule_creee',
      module_source: 'agri_feeds',
      entity_type: 'feed_formula',
      entity_id: formulaId,
      title: `Formule créée - ${name}`,
      description: `${formulaCode} · ${version.version_code} · ${cost.theoretical_cost_per_kg.toFixed(0)} FCFA/kg`,
      amount: cost.theoretical_cost_per_kg,
      event_date: new Date().toISOString().slice(0, 10),
      severity: 'info',
    },
  };
}

export async function commitFormulaDraft(preview = {}, handlers = {}) {
  if (!preview?.ok) throw new Error(preview?.error || 'Formule invalide');
  const results = {};
  if (handlers.onCreateFormula) results.formula = await handlers.onCreateFormula(preview.formula);
  if (handlers.onCreateVersion) results.version = await handlers.onCreateVersion(preview.version);
  if (handlers.onCreateIngredient) {
    results.ingredients = [];
    for (const ing of preview.ingredients) {
      results.ingredients.push(await handlers.onCreateIngredient(ing));
    }
  }
  if (handlers.onCreateBusinessEvent && preview.businessEvent) {
    await handlers.onCreateBusinessEvent(preview.businessEvent);
  }
  return results;
}

export function prepareFormulaStatusChange(formula = {}, nextStatus = '', dataMap = {}, meta = {}) {
  const gate = assertCanSetFormulaStatus(formula, nextStatus, dataMap);
  if (!gate.ok) return { ok: false, error: gate.message, gate };

  const patch = {
    id: formula.id,
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };
  if (nextStatus === 'internally_validated' || nextStatus === 'commercializable') {
    patch.technical_validation_status = 'validated';
    patch.technical_validator_name = clean(meta.validatorName) || formula.technical_validator_name || 'Responsable AGRI FEEDS';
  }

  return {
    ok: true,
    patch,
    businessEvent: {
      event_type: 'agri_feeds_formule_statut',
      module_source: 'agri_feeds',
      entity_type: 'feed_formula',
      entity_id: formula.id,
      title: `Statut formule - ${formulaStatusLabel(nextStatus)}`,
      description: `${formula.name || formula.formula_code} → ${formulaStatusLabel(nextStatus)}`,
      event_date: new Date().toISOString().slice(0, 10),
      severity: nextStatus === 'commercializable' ? 'haute' : 'info',
    },
  };
}
