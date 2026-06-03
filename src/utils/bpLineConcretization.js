import { emitHorizonForm } from '../services/formModalManager.js';
import { toNumber } from './format.js';
import { investmentAmount, investmentAssetKind, investmentLabel, buildInvestmentRealizationWorkflow } from './investmentWorkflows.js';

export const BP_LINE_COMPLETED_EVENT = 'horizon-bp-line-completed';

export const BP_LINE_STATUS = {
  A_CONCRETISER: 'a_concretiser',
  CONCRETISE: 'concretise',
  ANNULEE: 'annulee',
};

export const BP_LINE_STATUS_OPTIONS = [
  { value: BP_LINE_STATUS.A_CONCRETISER, label: 'À concrétiser' },
  { value: BP_LINE_STATUS.CONCRETISE, label: 'Concrétisé' },
  { value: BP_LINE_STATUS.ANNULEE, label: 'Annulée' },
];

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const lower = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export const bpLineAmount = (line = {}) => toNumber(line.total) || toNumber(line.quantite) * toNumber(line.prix_unitaire) || investmentAmount(line);

export function normalizeBpLineStatus(line = {}) {
  const raw = lower(line.statut || line.status || '');
  if (['annule', 'annulee', 'annulé', 'archive', 'archivé'].includes(raw)) return BP_LINE_STATUS.ANNULEE;
  if (line.asset_id || line.asset_created_at || line.linked_finance_transaction_id || line.realization_key) return BP_LINE_STATUS.CONCRETISE;
  if (['concretise', 'concrétisé', 'effectif', 'lie_metier', 'realise', 'réalisé'].includes(raw)) return BP_LINE_STATUS.CONCRETISE;
  if (['a_concretiser', 'a concrétiser', 'prevu', 'prévu', 'source officielle', 'planifie', 'planifié'].includes(raw)) return BP_LINE_STATUS.A_CONCRETISER;
  return BP_LINE_STATUS.A_CONCRETISER;
}

export function bpLineStatusLabel(status = '') {
  return BP_LINE_STATUS_OPTIONS.find((item) => item.value === status)?.label || 'À concrétiser';
}

export function isBpLineEditable(line = {}) {
  return Boolean(line?.id) && !String(line.id).startsWith('off-') && !String(line.id).startsWith('cost-') && !String(line.id).startsWith('rev-');
}

export function canConcretizeBpLine(line = {}) {
  if (!isBpLineEditable(line)) return false;
  if (normalizeBpLineStatus(line) !== BP_LINE_STATUS.A_CONCRETISER) return false;
  if (line.asset_id || line.asset_created_at) return false;
  return bpLineAmount(line) > 0;
}

export function computeBpInvestmentTotals(lines = []) {
  const rows = Array.isArray(lines) ? lines : [];
  let prevu = 0;
  let concretise = 0;
  let annule = 0;
  let reste = 0;
  rows.forEach((line) => {
    const amount = bpLineAmount(line);
    const status = normalizeBpLineStatus(line);
    prevu += amount;
    if (status === BP_LINE_STATUS.ANNULEE) annule += amount;
    else if (status === BP_LINE_STATUS.CONCRETISE) concretise += amount;
    else reste += amount;
  });
  return { prevu, concretise, annule, reste, count: rows.length };
}

export function buildBpLineStatusPatch(status = BP_LINE_STATUS.A_CONCRETISER) {
  return {
    statut: status,
    status,
    updated_at: now(),
  };
}

export function buildBpLineConcretizationRoute(line = {}) {
  const kind = investmentAssetKind(line);
  const label = investmentLabel(line);
  const qty = Math.max(1, Math.round(toNumber(line.quantite) || 1));
  const unitCost = toNumber(line.prix_unitaire) || bpLineAmount(line) / qty;
  const total = bpLineAmount(line);
  const date = today();
  const baseFields = {
    bp_line_id: line.id,
    business_plan_id: line.business_plan_id || '',
    source_module: 'investissements',
    source_record_id: line.id,
    source: 'business_plan',
  };

  if (kind === 'avicole') {
    const isChair = lower(label).includes('chair') || lower(label).includes('poulet');
    const lotType = isChair ? 'Chair' : 'Pondeuse';
    return {
      navigate: { module: 'elevage', tab: 'Avicole' },
      form: {
        module: 'avicole',
        form_type: 'lot_create',
        intent_label: `Concrétiser · ${label}`,
        draft_fields: {
          ...baseFields,
          type: lotType,
          type_lot: isChair ? 'chair' : 'pondeuse',
          initial_count: qty,
          cout_total_achat: total,
          prix_unitaire_sujet: unitCost,
          purchase_cost: total,
          date_debut: date,
          date_entree: date,
          entry_date: date,
          name: label,
        },
      },
    };
  }

  if (kind === 'animal') {
    const animalType = lower(label).includes('mouton') ? 'Ovin' : lower(label).includes('chevre') || lower(label).includes('chèvre') ? 'Caprin' : 'Bovin';
    return {
      navigate: { module: 'elevage', tab: 'Animaux' },
      form: {
        module: 'animaux',
        form_type: 'animal_create',
        intent_label: `Concrétiser · ${label}`,
        draft_fields: {
          ...baseFields,
          espece: animalType,
          type: animalType,
          mode_acquisition: 'achat',
          purchase_cost: unitCost,
          cout_achat: unitCost * qty,
          quantite: qty,
          date: date,
          date_achat: date,
          date_entree_ferme: date,
          name: label,
        },
      },
    };
  }

  if (kind === 'culture') {
    return {
      navigate: { module: 'cultures', tab: null },
      form: {
        module: 'cultures',
        form_type: 'culture_create',
        intent_label: `Concrétiser · ${label}`,
        draft_fields: {
          ...baseFields,
          nom: lower(label).includes('poivron') ? 'Poivrons' : label,
          type: lower(label).includes('poivron') ? 'Poivrons' : label,
          surface: toNumber(line.quantite) || 0,
          unite_surface: line.unite || 'm²',
          budget_prevu: total,
          statut: 'planifiee',
          date_debut_campagne: date,
          date_semis: date,
        },
      },
    };
  }

  if (kind === 'stock') {
    return {
      navigate: { module: 'achats_stock', tab: 'Stock' },
      form: {
        module: 'stock',
        form_type: 'stock_purchase',
        intent_label: `Concrétiser · ${label}`,
        draft_fields: {
          ...baseFields,
          produit: label,
          name: label,
          quantite: qty,
          unite: line.unite || 'unité',
          prixUnit: unitCost,
          prix_unitaire: unitCost,
          montant: total,
          date,
        },
      },
    };
  }

  if (kind === 'equipement') {
    return {
      navigate: { module: 'equipements', tab: null },
      form: {
        module: 'equipements',
        form_type: 'equipement_create',
        intent_label: `Concrétiser · ${label}`,
        draft_fields: {
          ...baseFields,
          nom: label,
          name: label,
          categorie: line.categorie || 'Équipement agricole',
          valeur: total,
          cout_achat: total,
          date_achat: date,
        },
      },
    };
  }

  return null;
}

export function launchBpLineConcretization(line = {}, { onNavigate } = {}) {
  const route = buildBpLineConcretizationRoute(line);
  if (!route) return { ok: false, reason: 'no_route' };
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem('horizon_bp_pending_line', JSON.stringify({ id: line.id, business_plan_id: line.business_plan_id || '' }));
  }
  if (onNavigate) {
    const { module, tab } = route.navigate;
    if (tab) onNavigate(module, module === 'elevage' ? { tab } : { tab });
    else onNavigate(module);
  }
  window.setTimeout(() => {
    emitHorizonForm(route.form.module, route.form.form_type, route.form.intent_label, route.form.draft_fields);
  }, 380);
  return { ok: true, route };
}

export function buildBpLineCompletionWorkflow(line = {}, result = {}) {
  const amount = toNumber(result.amount ?? bpLineAmount(line));
  const date = result.date || today();
  const assetModule = result.assetModule || result.asset_module || '';
  const assetId = result.assetId || result.asset_id || '';
  const finance = buildInvestmentRealizationWorkflow(line, { amount, date });
  const linePatch = {
    ...(finance?.linePatch || {}),
    statut: BP_LINE_STATUS.CONCRETISE,
    status: BP_LINE_STATUS.CONCRETISE,
    montant_reel: amount,
    date_realisation: date,
    realized_at: now(),
    asset_module: assetModule,
    asset_id: assetId,
    asset_created_at: now(),
    asset_status: 'cree',
    concretized_at: now(),
    concretization_source: result.source || 'module_metier',
  };
  return {
    linePatch,
    financeTransaction: finance?.financeTransaction || null,
    proofDocument: finance?.proofDocument || null,
    event: {
      ...(finance?.event || {}),
      event_type: 'bp_ligne_concretisee',
      title: `BP concrétisé · ${investmentLabel(line)}`,
      description: `${amount} FCFA · actif ${assetModule || 'n/a'} ${assetId || ''}`.trim(),
    },
  };
}

export function dispatchBpLineCompleted(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BP_LINE_COMPLETED_EVENT, { detail }));
  window.sessionStorage.removeItem('horizon_bp_pending_line');
}

export function mergeBpDraftIntoInitial(initial = {}, draft = {}) {
  if (!draft || typeof draft !== 'object') return initial;
  return { ...initial, ...draft };
}
