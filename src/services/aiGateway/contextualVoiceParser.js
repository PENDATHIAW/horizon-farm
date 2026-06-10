/**
 * Saisie vocale contextuelle — une phrase → un ou plusieurs brouillons à valider.
 */

import { interpretHorizonCommand, interpretHorizonAnimalBirthDraft } from '../aiIntentEngine.js';
import {
  AI_DRAFT_SOURCES,
  createAiActionDraft,
  normalizeLegacyDraft,
  TARGET_WORKFLOWS,
} from './aiActionDrafts.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

const n = (value) => {
  const num = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(num) ? num : null;
};

const includesAny = (text, words) => words.some((w) => text.includes(lower(w)));

function extractQuantity(raw = '') {
  const text = lower(raw);
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(sacs?|sachets?|kg|tablettes?|plateaux?|oeufs?|œufs?|poulets?|tetes?|têtes?|unites?)/);
  if (!match) return { quantity: extractAnyNumber(raw), unit: '' };
  return { quantity: n(match[1]), unit: match[2].replace(/s$/, '') };
}

function extractAnyNumber(raw = '') {
  const match = lower(raw).match(/(\d+(?:[.,]\d+)?)/);
  return match ? n(match[1]) : null;
}

function extractPaymentStatus(raw = '') {
  const text = lower(raw);
  if (includesAny(text, ['paye cash', 'payé cash', 'cash', 'paye', 'payé', 'regle', 'réglé']) && !includesAny(text, ['a payer', 'à payer', 'credit'])) return 'paid';
  if (includesAny(text, ['credit', 'crédit', 'a payer', 'impaye'])) return 'credit';
  if (includesAny(text, ['partiel', 'acompte'])) return 'partial';
  return 'unknown';
}

function extractUnitPrice(raw = '') {
  const text = lower(raw);
  const each = text.match(/(?:a|à|@)\s*(\d+(?:[.,]\d+)?)\s*(?:fcfa|f\s*cfa|xof)/);
  if (each) return n(each[1]);
  const unit = text.match(/(\d+(?:[.,]\d+)?)\s*(?:fcfa|f\s*cfa|xof)\s*(?:l\s*unit|\/\s*unite|chacun|piece|pièce)/);
  return unit ? n(unit[1]) : null;
}

function extractClientName(raw = '') {
  const m = raw.match(/(?:a|à|chez)\s+([^,.\d]+?)(?:\s*,|\s+paye|\s+\d)/i);
  return m?.[1] ? clean(m[1]) : '';
}

function resolveLotInContext(raw = '', lots = []) {
  const text = lower(raw);
  const idMatch = raw.match(/\b(LOT[-_][A-Z0-9-]+)\b/i);
  if (idMatch) {
    const id = idMatch[0].replace(/\s+/g, '').toUpperCase();
    const hit = arr(lots).find((l) => clean(l.id).toUpperCase() === id);
    return hit?.id || id;
  }
  const numMatch = text.match(/lot\s*(?:de\s+)?(?:chair|pondeuse|avicole)?\s*(\d+)/);
  if (numMatch) {
    const num = numMatch[1];
    const candidates = arr(lots).filter((lot) => {
      const label = lower(`${lot.nom || ''} ${lot.name || ''} ${lot.libelle || ''} ${lot.id || ''}`);
      return label.includes(`lot ${num}`) || label.includes(`lot${num}`) || clean(lot.id).endsWith(num);
    });
    if (candidates.length === 1) return candidates[0].id;
    if (candidates.length > 1) return { ambiguous: true, candidates };
  }
  if (text.includes('chair')) {
    const chair = arr(lots).find((l) => /chair|broiler/i.test(lower(`${l.type || ''} ${l.nom || ''}`)));
    if (chair) return chair.id;
  }
  return '';
}

function findFeedStock(raw = '', stocks = []) {
  const text = lower(raw);
  const needle = text.includes('pondeuse') ? 'pondeuse' : text.includes('chair') ? 'chair' : 'aliment';
  return arr(stocks).find((s) => lower(`${s.produit || ''} ${s.nom || ''} ${s.categorie || ''}`).includes(needle)) || null;
}

function detectVoiceScenario(raw = '') {
  const text = lower(raw);
  if (includesAny(text, ['distribu', 'distribue', 'distribué', 'nourri', 'donne de l aliment', "donné de l'aliment", 'ration', 'alimentation'])) {
    return 'feeding';
  }
  if (includesAny(text, ['isole', 'isolé', 'isolement']) && includesAny(text, ['malade', 'malades', 'suspect'])) {
    return 'isolation_health';
  }
  if (includesAny(text, ['ramass', 'tablette', 'oeuf', 'œuf', 'ponte'])) return 'egg_production';
  if (includesAny(text, ['naissance', 'mise bas', 'veau', 'agneau', 'chevreau', 'portee', 'portée'])) return 'animal_birth';
  if (includesAny(text, ['mort', 'decede', 'décédé', 'perdu', 'vole', 'volé']) && (hasAnimalId(raw) || includesAny(text, ['animal', 'bovin', 'vache', 'brebis', 'chevre', 'chèvre', 'embouche', 'ovin', 'caprin', 'boucle']))) return 'animal_loss';
  if (includesAny(text, ['pese', 'pesé', 'pesee', 'poids', 'kilo']) && (hasAnimalId(raw) || includesAny(text, ['animal', 'bovin', 'vache', 'brebis', 'chevre', 'embouche', 'ovin', 'caprin']))) return 'animal_weighing';
  if (includesAny(text, ['vendu', 'vente', 'vendre', 'vends'])) return 'sale';
  return 'auto';
}

function hasAnimalId(raw = '') {
  const text = String(raw || '').toUpperCase();
  return /\b([A-Z]{2,6}[-_ ]?\d{1,6})\b/.test(text);
}

function buildFeedingLegacyDraft(rawInput = '', dataMap = {}) {
  const { quantity, unit } = extractQuantity(rawInput);
  const lotRef = resolveLotInContext(rawInput, dataMap.lots || dataMap.avicole);
  const stock = findFeedStock(rawInput, dataMap.stock || dataMap.stocks);
  const fields = {
    lot_id: typeof lotRef === 'object' ? '' : lotRef,
    quantite: quantity,
    unite: unit || 'sac',
    stock_id: stock?.id || '',
    produit: stock?.produit || stock?.nom || 'aliment',
    date: new Date().toISOString().slice(0, 10),
    notes: rawInput,
  };
  const missing = [];
  if (!fields.quantite) missing.push('quantite');
  if (typeof lotRef === 'object' && lotRef?.ambiguous) missing.push('lot_ambiguous');
  if (!fields.lot_id) missing.push('lot_id');

  return {
    status: missing.length ? 'draft_incomplete' : 'awaiting_validation',
    intent: 'feeding_distribution',
    confidence: missing.length ? 0.55 : 0.84,
    raw_input: rawInput,
    primary_module: 'elevage',
    form_type: 'feeding_distribution',
    requires_validation: true,
    missing_fields: missing,
    warnings: missing.includes('lot_ambiguous') ? ['Plusieurs lots correspondent — précisez le lot.'] : [],
    draft_fields: fields,
    impacted_modules: ['elevage', 'stock', 'finances', 'centre_ia'],
    proposed_actions: [],
    ui: {
      title: 'Distribution aliment à valider',
      subtitle: 'Alimentation + sortie stock + coût lot',
    },
  };
}

function buildIsolationHealthLegacy(rawInput = '', dataMap = {}) {
  const qty = extractQuantity(rawInput).quantity || extractAnyNumber(rawInput);
  const lotRef = resolveLotInContext(rawInput, dataMap.lots || dataMap.avicole);
  const fields = {
    action_type: 'isolement',
    type_soin: 'isolement',
    soin_type: 'isolement',
    nom: 'Isolement sanitaire',
    quantite: qty,
    lot_id: typeof lotRef === 'object' ? '' : lotRef,
    date: new Date().toISOString().slice(0, 10),
    notes: rawInput,
    statut_sante_apres: 'suspect',
  };
  const missing = [];
  if (typeof lotRef === 'object' && lotRef?.ambiguous) missing.push('lot_ambiguous');
  if (!fields.lot_id) missing.push('lot_id');
  if (!fields.quantite) missing.push('quantite');

  return {
    status: missing.length ? 'draft_incomplete' : 'awaiting_validation',
    intent: 'health_action',
    confidence: missing.length ? 0.52 : 0.8,
    raw_input: rawInput,
    primary_module: 'elevage',
    form_type: 'health_action',
    requires_validation: true,
    missing_fields: missing,
    warnings: [],
    draft_fields: fields,
    impacted_modules: ['elevage', 'sante', 'taches', 'centre_ia'],
    ui: { title: 'Isolement sanitaire à valider', subtitle: 'Événement santé + suivi' },
  };
}

function createChainDraft({
  groupId,
  order,
  title,
  description,
  bundledWith,
  intent = 'chain_step',
  targetWorkflow = TARGET_WORKFLOWS.INSIGHT_ONLY,
}) {
  return createAiActionDraft({
    intent,
    confidence: 0.92,
    source: AI_DRAFT_SOURCES.VOICE,
    draft: {
      chain_group: groupId,
      step_order: order,
      title,
      description,
      bundled_with: bundledWith,
      executable: false,
    },
    target_workflow: targetWorkflow,
    required_validation: false,
    warnings: [],
    missing_fields: [],
    status: 'chain_info',
    raw_input: '',
    meta: { role: 'chain', bundledWith },
    confirmation_required: false,
  });
}

function expandDraftChain(primary, phrase = '', scenario = '') {
  const groupId = primary.id;
  const chains = [];

  if (scenario === 'egg_production' || primary.intent === 'egg_production') {
    chains.push(createChainDraft({
      groupId,
      order: 2,
      title: 'Entrée stock œufs',
      description: 'Lors de la validation du ramassage, les œufs vendables entrent en stock automatiquement.',
      bundledWith: primary.id,
    }));
  }

  if (scenario === 'isolation_health') {
    chains.push(createChainDraft({
      groupId,
      order: 2,
      title: 'Événement santé',
      description: 'Isolement et mise à jour du statut sanitaire du lot.',
      bundledWith: primary.id,
    }));
    const taskDraft = createAiActionDraft({
      intent: 'task_creation',
      confidence: 0.78,
      source: AI_DRAFT_SOURCES.VOICE,
      draft: {
        chain_group: groupId,
        step_order: 2,
        primary_module: 'activite_suivi',
        form_type: 'task_creation',
        fields: {
          title: `Suivi isolement — ${primary.draft?.fields?.lot_id || 'lot'}`,
          due_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          priority: 'haute',
          module_lie: 'elevage',
          related_id: primary.draft?.fields?.lot_id || '',
        },
        legacy_hey: {
          status: 'awaiting_validation',
          intent: 'task_creation',
          primary_module: 'taches',
          form_type: 'task_creation',
          draft_fields: {
            title: `Suivi isolement — ${primary.draft?.fields?.lot_id || 'lot'}`,
            due_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
            priority: 'haute',
          },
        },
      },
      target_workflow: TARGET_WORKFLOWS.OPEN_FORM,
      required_validation: true,
      warnings: ['Validez la tâche de suivi après l\'événement santé.'],
      missing_fields: [],
      status: 'awaiting_validation',
      raw_input: phrase,
      meta: { role: 'secondary', chain_group: groupId },
    });
    chains.push(taskDraft);
  }

  if (scenario === 'sale' || primary.intent === 'sale_record') {
    const paid = extractPaymentStatus(phrase) === 'paid';
    if (paid) {
      chains.push(createChainDraft({ groupId, order: 2, title: 'Encaissement', description: 'Paiement enregistré avec la vente (workflow vente unique).', bundledWith: primary.id }));
      chains.push(createChainDraft({ groupId, order: 3, title: 'Écriture finance', description: 'Transaction finance créée par les effets de bord vente.', bundledWith: primary.id }));
      chains.push(createChainDraft({ groupId, order: 4, title: 'Sortie stock', description: 'Mouvement stock lié à la vente.', bundledWith: primary.id }));
    }
  }

  if (scenario === 'feeding' || primary.intent === 'feeding_distribution') {
    chains.push(createChainDraft({ groupId, order: 2, title: 'Sortie stock aliment', description: 'Décompte stock à la validation de l\'alimentation.', bundledWith: primary.id }));
    chains.push(createChainDraft({ groupId, order: 3, title: 'Coût alimentation lot', description: 'Coût aliment cumulé sur le lot.', bundledWith: primary.id }));
  }

  return chains;
}

function legacyToGatewayDraft(legacy, phrase, options = {}) {
  const gw = normalizeLegacyDraft(legacy, { source: AI_DRAFT_SOURCES.VOICE, ...options });
  gw.draft.legacy_hey = legacy;
  gw.draft.primary_module = legacy.primary_module;
  gw.draft.form_type = legacy.form_type;
  gw.draft.title = legacy.ui?.title;
  gw.draft.subtitle = legacy.ui?.subtitle;
  gw.meta = { role: 'primary', scenario: options.scenario };
  if (options.scenario === 'feeding') {
    gw.target_workflow = TARGET_WORKFLOWS.FEEDING;
  }
  if (legacy.intent === 'egg_production') {
    gw.target_workflow = TARGET_WORKFLOWS.OPEN_FORM;
    gw.draft.workflow_hint = 'commitElevageEggProduction';
  }
  return gw;
}

/**
 * Parse une phrase terrain en brouillons (1 principal + chaîne d'impacts).
 */
export function parseContextualVoicePhrase(phrase = '', dataMap = {}) {
  const raw = clean(phrase);
  if (!raw) {
    return { drafts: [], clarify: 'Phrase vide — répétez votre action.', phrase: raw };
  }

  const scenario = detectVoiceScenario(raw);
  let legacy;

  if (scenario === 'feeding') {
    legacy = buildFeedingLegacyDraft(raw, dataMap);
  } else if (scenario === 'isolation_health') {
    legacy = buildIsolationHealthLegacy(raw, dataMap);
  } else if (scenario === 'animal_birth') {
    legacy = interpretHorizonAnimalBirthDraft(raw, dataMap);
  } else if (['animal_weighing', 'animal_loss'].includes(scenario)) {
    legacy = interpretHorizonCommand(raw, dataMap);
  } else {
    legacy = interpretHorizonCommand(raw, dataMap);
  }

  if (scenario === 'sale' && legacy.intent === 'sale_record') {
    const { quantity, unit } = extractQuantity(raw);
    const unitPrice = extractUnitPrice(raw);
    const product = lower(raw).includes('poulet') ? 'poulet' : legacy.draft_fields?.product_name;
    legacy.draft_fields = {
      ...legacy.draft_fields,
      product_name: product || legacy.draft_fields?.product_name,
      quantity: quantity || legacy.draft_fields?.quantity,
      unit,
      prix_unitaire: unitPrice,
      payment_amount: unitPrice && quantity ? unitPrice * quantity : legacy.draft_fields?.payment_amount,
      payment_status: extractPaymentStatus(raw) === 'paid' ? 'paid' : legacy.draft_fields?.payment_status,
      client_name: extractClientName(raw) || legacy.draft_fields?.client_name,
    };
    if (extractPaymentStatus(raw) === 'paid') {
      legacy.draft_fields.montant_paye = legacy.draft_fields.payment_amount;
    }
  }

  if (legacy.status === 'wake_only') {
    return { drafts: [], clarify: '', phrase: raw, wake: true };
  }

  if (legacy.status === 'unsupported') {
    return {
      drafts: [],
      clarify: legacy.warnings?.[0] || 'Je n\'ai pas reconnu l\'action. Précisez : vente, œufs, alimentation, santé ou achat.',
      phrase: raw,
    };
  }

  const lotAmbiguous = legacy.missing_fields?.includes('lot_ambiguous')
    || typeof resolveLotInContext(raw, dataMap.lots || dataMap.avicole) === 'object';
  if (lotAmbiguous) {
    return {
      drafts: legacy.status !== 'unsupported' ? [legacyToGatewayDraft(legacy, raw, { scenario })] : [],
      clarify: 'Plusieurs lots correspondent. Dites par exemple « lot chair 3 » ou l\'identifiant LOT-…',
      phrase: raw,
    };
  }

  if (legacy.status === 'draft_incomplete' && (legacy.missing_fields?.length || 0) > 1) {
    return {
      drafts: [legacyToGatewayDraft(legacy, raw, { scenario })],
      clarify: `Précisez : ${legacy.missing_fields.join(', ')}.`,
      phrase: raw,
    };
  }

  const primary = legacyToGatewayDraft(legacy, raw, { scenario });
  const chains = expandDraftChain(primary, raw, scenario);
  const drafts = [primary, ...chains];

  return { drafts, clarify: '', phrase: raw, scenario };
}
