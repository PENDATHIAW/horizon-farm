import { emitHorizonForm } from '../services/formModalManager.js';
import { toNumber } from './format.js';
import { investmentAmount, investmentAssetKind, investmentLabel, buildInvestmentRealizationWorkflow } from './investmentWorkflows.js';

export const BP_LINE_COMPLETED_EVENT = 'horizon-bp-line-completed';
export const BP_COST_COMPLETED_EVENT = 'horizon-bp-cost-completed';
export const BP_PENDING_FORM_KEY = 'horizon_bp_pending_form';

/** Module cible du formulaire (finance → finances pour FinancesV12). */
export function normalizeBpFormModule(module = '') {
  const key = lower(module);
  if (key === 'finance' || key === 'finance_pilotage') return 'finances';
  return module;
}

/** Ouvre la fiche préremplie avec plusieurs tentatives (modules lazy-loaded). */
export function emitBpConcretizationForm(route = {}, { retries = [80, 350, 800, 1400] } = {}) {
  if (!route?.form || typeof window === 'undefined') return;
  const module = normalizeBpFormModule(route.form.module);
  const { form_type, intent_label, draft_fields } = route.form;
  try {
    window.sessionStorage.setItem(BP_PENDING_FORM_KEY, JSON.stringify({
      module,
      form_type,
      intent_label,
      draft_fields,
      navigate: route.navigate || null,
      ts: Date.now(),
    }));
  } catch { /* ignore */ }
  retries.forEach((delay) => {
    window.setTimeout(() => {
      emitHorizonForm(module, form_type, intent_label, draft_fields);
    }, delay);
  });
}

export function readBpPendingForm() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(BP_PENDING_FORM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - Number(parsed.ts || 0) > 1000 * 60 * 30) {
      window.sessionStorage.removeItem(BP_PENDING_FORM_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearBpPendingForm() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(BP_PENDING_FORM_KEY);
}

export const BP_LINE_STATUS = {
  PREVU: 'prevu',
  A_CONCRETISER: 'a_concretiser',
  EN_COURS: 'en_cours',
  CONCRETISE_PARTIEL: 'concretise_partiel',
  CONCRETISE: 'concretise',
  REPORTE: 'reporte',
  ANNULE: 'annule',
  ANNULEE: 'annulee',
  REMPLACE: 'remplace',
  A_JUSTIFIER: 'a_justifier',
  BLOQUE: 'bloque',
};

export const BP_LINE_STATUS_OPTIONS = [
  { value: BP_LINE_STATUS.PREVU, label: 'Prévu' },
  { value: BP_LINE_STATUS.A_CONCRETISER, label: 'À concrétiser' },
  { value: BP_LINE_STATUS.EN_COURS, label: 'En cours' },
  { value: BP_LINE_STATUS.CONCRETISE_PARTIEL, label: 'Concrétisé partiellement' },
  { value: BP_LINE_STATUS.CONCRETISE, label: 'Concrétisé' },
  { value: BP_LINE_STATUS.REPORTE, label: 'Reporté' },
  { value: BP_LINE_STATUS.ANNULE, label: 'Annulé' },
  { value: BP_LINE_STATUS.REMPLACE, label: 'Remplacé' },
  { value: BP_LINE_STATUS.A_JUSTIFIER, label: 'À justifier' },
  { value: BP_LINE_STATUS.BLOQUE, label: 'Bloqué' },
];

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const lower = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export const bpLineAmount = (line = {}) => toNumber(line.total) || toNumber(line.quantite) * toNumber(line.prix_unitaire) || investmentAmount(line);

export function normalizeBpLineStatus(line = {}) {
  const raw = lower(line.statut || line.status || '');
  if (['bloque', 'blocked'].includes(raw)) return BP_LINE_STATUS.BLOQUE;
  if (['a_justifier', 'a justifier'].includes(raw)) return BP_LINE_STATUS.A_JUSTIFIER;
  if (['remplace', 'remplacé'].includes(raw)) return BP_LINE_STATUS.REMPLACE;
  if (['reporte', 'reporté'].includes(raw)) return BP_LINE_STATUS.REPORTE;
  if (['annule', 'annulee', 'annulé', 'archive', 'archivé'].includes(raw)) return BP_LINE_STATUS.ANNULE;
  if (['en_cours', 'en cours'].includes(raw)) return BP_LINE_STATUS.EN_COURS;
  if (['concretise_partiel', 'concrétisé partiellement', 'partiel'].includes(raw)) return BP_LINE_STATUS.CONCRETISE_PARTIEL;
  const prevu = Number(line.montant_prevu ?? bpLineAmount(line)) || 0;
  const paye = Number(line.montant_paye ?? line.montant_reel ?? 0) || 0;
  if (paye > 0 && prevu > 0 && paye < prevu - 0.5) return BP_LINE_STATUS.CONCRETISE_PARTIEL;
  if (line.asset_id || line.asset_created_at || (line.linked_finance_transaction_id && paye >= prevu - 0.5)) return BP_LINE_STATUS.CONCRETISE;
  if (['concretise', 'concrétisé', 'effectif', 'lie_metier', 'realise', 'réalisé'].includes(raw)) return BP_LINE_STATUS.CONCRETISE;
  if (['prevu', 'prévu', 'source officielle'].includes(raw)) return BP_LINE_STATUS.PREVU;
  if (['a_concretiser', 'a concrétiser', 'planifie', 'planifié'].includes(raw)) return BP_LINE_STATUS.A_CONCRETISER;
  return BP_LINE_STATUS.A_CONCRETISER;
}

export function bpLineStatusLabel(status = '') {
  return BP_LINE_STATUS_OPTIONS.find((item) => item.value === status)?.label || 'À concrétiser';
}

export function isBpLineEditable(line = {}) {
  return Boolean(line?.id) && !String(line.id).startsWith('off-') && !String(line.id).startsWith('cost-') && !String(line.id).startsWith('rev-');
}

export function isBpCostEditable(cost = {}) {
  return Boolean(cost?.id) && !String(cost.id).startsWith('cost-') && !String(cost.id).startsWith('rev-');
}

export const bpCostAmount = (cost = {}) => toNumber(cost.montant_reel ?? cost.montant_mensuel ?? cost.amount ?? cost.montant);

export function bpCostLabel(cost = {}) {
  return cost.designation || cost.libelle || cost.nom || cost.name || cost.id || 'Charge BP';
}

export function bpCostModuleRoute(cost = {}) {
  const text = lower(`${cost.designation || ''} ${cost.categorie || ''}`);
  const amount = bpCostAmount(cost);
  const date = today();
  const baseFields = {
    bp_cost_id: cost.id,
    bp_line_id: cost.id,
    business_plan_id: cost.business_plan_id || '',
    source_module: 'investissements',
    source_record_id: cost.id,
    source: 'business_plan_charge',
    montant: amount,
    montant_mensuel: amount,
  };

  if (/poussin.*chair|cartons poussins|poussins_chair/.test(text)) {
    return {
      label: 'Élevage / Avicole',
      navigate: { module: 'elevage', tab: 'Avicole' },
      form: {
        module: 'avicole',
        form_type: 'lot_create',
        intent_label: `Concrétiser charge · ${bpCostLabel(cost)}`,
        draft_fields: {
          ...baseFields,
          type: 'Chair',
          type_lot: 'chair',
          initial_count: 500,
          cout_total_achat: amount,
          prix_unitaire_sujet: Math.round(amount / 500) || 700,
          purchase_cost: amount,
          name: bpCostLabel(cost),
          date_debut: date,
          date_entree: date,
        },
      },
    };
  }
  if (/achat.*bovin|achat bœuf|achat boeuf/.test(text)) {
    return {
      label: 'Élevage / Animaux',
      navigate: { module: 'elevage', tab: 'Animaux' },
      form: {
        module: 'animaux',
        form_type: 'animal_create',
        intent_label: `Concrétiser charge · ${bpCostLabel(cost)}`,
        draft_fields: {
          ...baseFields,
          espece: 'Bovin',
          type: 'Bovin',
          mode_acquisition: 'achat',
          quantite: 5,
          purchase_cost: Math.round(amount / 5) || amount,
          cout_achat: amount,
          date: date,
          date_achat: date,
          name: bpCostLabel(cost),
        },
      },
    };
  }
  if (/vaccin|prophylaxie|sante|santé/.test(text)) {
    return {
      label: 'Élevage / Santé',
      navigate: { module: 'elevage', tab: 'Santé' },
      form: {
        module: 'sante',
        form_type: 'health_action',
        intent_label: `Concrétiser charge · ${bpCostLabel(cost)}`,
        draft_fields: {
          ...baseFields,
          action_type: 'vaccin',
          produit: bpCostLabel(cost),
          cout: amount,
          montant: amount,
          date,
        },
      },
    };
  }
  if (/aliment|feed|son|mais|maïs|fourrage|litiere|litière|emballage|gaz/.test(text)) {
    const produit = bpCostLabel(cost);
    return {
      label: 'Achats / Stock',
      navigate: { module: 'achats_stock', tab: 'Stock' },
      form: {
        module: 'stock',
        form_type: 'stock_purchase',
        intent_label: `Concrétiser charge · ${produit}`,
        draft_fields: {
          ...baseFields,
          produit,
          name: produit,
          quantite: 1,
          unite: 'lot',
          prixUnit: amount,
          prix_unitaire: amount,
          montant: amount,
          date,
        },
      },
    };
  }
  return {
    label: 'Finance / Trésorerie',
    navigate: { module: 'finance_pilotage', tab: 'Trésorerie' },
    form: {
      module: 'finances',
      form_type: 'finance_entry',
      intent_label: `Concrétiser charge · ${bpCostLabel(cost)}`,
      draft_fields: {
        ...baseFields,
        type: 'sortie',
        categorie: cost.categorie || 'charge_bp',
        libelle: bpCostLabel(cost),
        description: `Charge BP mensuelle · ${bpCostLabel(cost)}`,
        statut: 'a_payer',
        date,
      },
    },
  };
}

export function canConcretizeBpCost(cost = {}) {
  if (!isBpCostEditable(cost)) return false;
  const status = normalizeBpLineStatus(cost);
  if ([BP_LINE_STATUS.ANNULE, BP_LINE_STATUS.BLOQUE, BP_LINE_STATUS.REMPLACE].includes(status)) return false;
  if (status === BP_LINE_STATUS.CONCRETISE && cost.linked_finance_transaction_id) return false;
  if (![BP_LINE_STATUS.A_CONCRETISER, BP_LINE_STATUS.EN_COURS, BP_LINE_STATUS.CONCRETISE_PARTIEL, BP_LINE_STATUS.PREVU].includes(status)) {
    return false;
  }
  return bpCostAmount(cost) > 0;
}

export function bpCostPlannedAmount(cost = {}) {
  return toNumber(cost.montant_prevu ?? cost.montant_mensuel ?? cost.amount ?? cost.montant) || bpCostAmount(cost);
}

export function computeBpCostTotals(costs = []) {
  const rows = Array.isArray(costs) ? costs : [];
  let prevu = 0;
  let concretise = 0;
  let annule = 0;
  let reste = 0;
  rows.forEach((cost) => {
    const planned = bpCostPlannedAmount(cost);
    const paid = toNumber(cost.montant_paye ?? cost.montant_reel ?? 0);
    const status = normalizeBpLineStatus(cost);
    prevu += planned;
    if (status === BP_LINE_STATUS.ANNULE || status === BP_LINE_STATUS.ANNULEE) annule += planned;
    else if (status === BP_LINE_STATUS.CONCRETISE) concretise += paid || planned;
    else if (status === BP_LINE_STATUS.CONCRETISE_PARTIEL) {
      concretise += paid;
      reste += Math.max(0, planned - paid);
    } else reste += Math.max(0, planned - paid);
  });
  return { prevu, concretise, annule, reste, count: rows.length };
}

export function buildBpCostConcretizationRoute(cost = {}) {
  return bpCostModuleRoute(cost);
}

export function launchBpCostConcretization(cost = {}, { onNavigate, partial = false } = {}) {
  const route = buildBpCostConcretizationRoute(cost);
  if (!route?.form) return { ok: false, reason: 'no_route' };
  const planned = bpCostPlannedAmount(cost);
  const alreadyPaid = toNumber(cost.montant_paye ?? cost.montant_reel ?? 0);
  const draftFields = {
    ...route.form.draft_fields,
    montant_prevu: planned,
    montant_paye: alreadyPaid,
    concretization_mode: partial || normalizeBpLineStatus(cost) === BP_LINE_STATUS.CONCRETISE_PARTIEL ? 'partiel' : 'complet',
  };
  if (partial && alreadyPaid > 0) {
    draftFields.montant = Math.max(0, planned - alreadyPaid);
    draftFields.amount = draftFields.montant;
  }
  const enrichedRoute = {
    ...route,
    form: {
      ...route.form,
      intent_label: partial
        ? `Concrétisation partielle · ${bpCostLabel(cost)}`
        : route.form.intent_label,
      draft_fields: draftFields,
    },
  };
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem('horizon_bp_pending_cost', JSON.stringify({
      id: cost.id,
      business_plan_id: cost.business_plan_id || '',
      partial: Boolean(partial),
    }));
  }
  if (onNavigate) {
    const { module, tab } = route.navigate;
    if (tab) onNavigate(module, module === 'elevage' ? { tab } : { tab });
    else onNavigate(module);
  }
  emitBpConcretizationForm(enrichedRoute);
  return { ok: true, route: enrichedRoute };
}

export function buildBpCostCompletionWorkflow(cost = {}, result = {}) {
  const planned = bpCostPlannedAmount(cost);
  const previousPaid = toNumber(cost.montant_paye ?? cost.montant_reel ?? 0);
  const increment = toNumber(result.amount ?? bpCostAmount(cost));
  const amount = result.cumulative === false ? increment : previousPaid + increment;
  const date = result.date || today();
  const isPartial = amount > 0 && amount < planned - 0.5;
  const status = isPartial ? BP_LINE_STATUS.CONCRETISE_PARTIEL : BP_LINE_STATUS.CONCRETISE;
  const finance = buildInvestmentRealizationWorkflow(
    { ...cost, designation: bpCostLabel(cost) },
    { amount: increment > 0 ? increment : amount, date, proofThreshold: 50000 },
  );
  const linePatch = {
    ...(finance?.linePatch || {}),
    statut: status,
    status,
    montant_prevu: planned,
    montant_paye: amount,
    montant_reel: amount,
    reste_a_realiser: Math.max(0, planned - amount),
    date_realisation: date,
    realized_at: now(),
    linked_record_id: result.linked_record_id || result.assetId || result.asset_id || cost.linked_record_id || '',
    linked_finance_transaction_id: finance?.financeTransaction?.id || result.finance_transaction_id || cost.linked_finance_transaction_id || '',
    concretized_at: now(),
    concretization_source: result.source || 'module_metier',
    target_module: result.targetModule || result.target_module || '',
    concretization_partial: isPartial,
  };
  return {
    linePatch,
    financeTransaction: finance?.financeTransaction || null,
    proofDocument: finance?.proofDocument || null,
    event: {
      ...(finance?.event || {}),
      event_type: 'bp_charge_concretisee',
      title: isPartial
        ? `Charge BP partielle · ${bpCostLabel(cost)}`
        : `Charge BP concrétisée · ${bpCostLabel(cost)}`,
      description: `${amount} / ${planned} FCFA · ${result.targetModule || result.target_module || 'module métier'}`.trim(),
    },
  };
}

export function dispatchBpCostCompleted(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BP_COST_COMPLETED_EVENT, { detail }));
  window.sessionStorage.removeItem('horizon_bp_pending_cost');
}

export function canConcretizeBpLine(line = {}) {
  if (!isBpLineEditable(line)) return false;
  const status = normalizeBpLineStatus(line);
  if ([BP_LINE_STATUS.ANNULE, BP_LINE_STATUS.REMPLACE, BP_LINE_STATUS.BLOQUE, BP_LINE_STATUS.CONCRETISE].includes(status)) return false;
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
    if (status === BP_LINE_STATUS.ANNULE || status === BP_LINE_STATUS.ANNULEE) annule += amount;
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
  const text = lower(`${label} ${line.categorie || ''} ${line.nature || ''}`);
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
    issue_key: line.issue_key || '',
    source_bp_sheet: line.source_bp_sheet || '',
    source_bp_line: line.source_bp_line || '',
  };

  if (/tresorerie|fonds de roulement initial|cash depart/.test(text) || line.nature === 'tresorerie_depart') {
    return {
      navigate: { module: 'finance_pilotage', tab: 'Trésorerie' },
      form: {
        module: 'finance',
        form_type: 'finance_entry',
        intent_label: `Trésorerie de départ · ${label}`,
        draft_fields: {
          ...baseFields,
          type: 'entree',
          categorie: 'tresorerie_depart',
          libelle: label,
          montant: total,
          date,
          statut: 'encaisse',
        },
      },
    };
  }

  if (/stock de matieres|stock de départ|stock initial|stock_depart/.test(text) || line.nature === 'stock_initial') {
    return {
      navigate: { module: 'achats_stock', tab: 'Stock' },
      form: {
        module: 'stock',
        form_type: 'stock_purchase',
        intent_label: `Stock initial · ${label}`,
        draft_fields: {
          ...baseFields,
          produit: label,
          name: label,
          quantite: qty,
          montant: total,
          prixUnit: unitCost,
          date,
        },
      },
    };
  }

  if (/amortissement|amortissable/.test(text) || line.nature === 'investissement_amortissable') {
    return {
      navigate: { module: 'finance_pilotage', tab: 'Rentabilité' },
      form: {
        module: 'finance',
        form_type: 'finance_entry',
        intent_label: `Amortissement BP · ${label}`,
        draft_fields: {
          ...baseFields,
          type: 'sortie',
          categorie: 'amortissement',
          libelle: label,
          montant: total,
          date,
        },
      },
    };
  }

  if (/papier|administratif|communication|creation entreprise|site/.test(text)) {
    return {
      navigate: { module: 'documents_rapports', tab: 'Bibliothèque' },
      form: {
        module: 'documents',
        form_type: 'document_upload',
        intent_label: `Justificatif BP · ${label}`,
        draft_fields: {
          ...baseFields,
          title: label,
          montant: total,
          date,
        },
      },
    };
  }

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
  emitBpConcretizationForm(route);
  return { ok: true, route };
}

/** Ouvre Trésorerie avec fiche préremplie pour lier une opération finance réelle à une ligne BP. */
export function launchBpFinanceLink(line = {}, { onNavigate } = {}) {
  if (line.linked_finance_transaction_id) {
    onNavigate?.('finance_pilotage', { tab: 'Trésorerie' });
    return { ok: true, linked: true };
  }
  const label = investmentLabel(line) || bpCostLabel(line);
  const amount = bpLineAmount(line) || bpCostAmount(line);
  const route = {
    navigate: { module: 'finance_pilotage', tab: 'Trésorerie' },
    form: {
      module: 'finances',
      form_type: 'finance_entry',
      intent_label: `Lier opération · ${label}`,
      draft_fields: {
        bp_line_id: line.id,
        bp_cost_id: line.bp_cost_id || line.id,
        business_plan_id: line.business_plan_id || '',
        source_module: 'investissements',
        source_record_id: line.id,
        type: 'sortie',
        categorie: line.categorie || 'investissement',
        libelle: label,
        montant: amount,
        date: today(),
        statut: 'paye',
      },
    },
  };
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem('horizon_bp_pending_line', JSON.stringify({ id: line.id, business_plan_id: line.business_plan_id || '' }));
  }
  onNavigate?.('finance_pilotage', { tab: 'Trésorerie' });
  emitBpConcretizationForm(route);
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
    linked_record_id: assetId || line.linked_record_id || '',
    asset_module: assetModule,
    asset_id: assetId,
    asset_created_at: now(),
    asset_status: 'cree',
    concretized_at: now(),
    concretization_source: result.source || 'module_metier',
    issue_key: result.issue_key || line.issue_key || finance?.event?.id || '',
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
