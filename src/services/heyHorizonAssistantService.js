import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase.js';
import { interpretHorizonCommand, updateHorizonDraft } from './aiIntentEngine.js';
import { detectStrategicQuery, buildStrategicAnswer } from './heyHorizonStrategicAnswers.js';
import { saveLocalRecommendation } from './aiRecommendationsService.js';
import { interpretVoiceCommand } from './voiceCommands.js';

export const HEY_HORIZON_MODULE_LABELS = {
  dashboard: 'Accueil',
  assistant_erp: 'Assistant ERP',
  objectifs_croissance: 'Objectifs & croissance',
  elevage: 'Élevage',
  commercial: 'Commercial',
  achats_stock: 'Achats & Stock',
  finance_pilotage: 'Finance & Pilotage',
  activite_suivi: 'Activité & Suivi',
  documents_rapports: 'Documents & Rapports',
  rh: 'Opérations & Ressources',
  ventes: 'Commercial',
  finances: 'Finance & Pilotage',
  clients: 'Commercial',
  stock: 'Achats & Stock',
  sales_orders: 'Commercial',
  sales_opportunities: 'Commercial',
  payments: 'Finance & Pilotage',
  sante: 'Élevage',
  avicole: 'Élevage',
  animaux: 'Élevage',
  cultures: 'Cultures',
  documents: 'Documents & Rapports',
  taches: 'Activité & Suivi',
  alertes: 'Activité & Suivi',
  sync_activity: 'Vérifications',
  impact_business: 'Impact & Valeur',
  fournisseurs: 'Achats & Stock',
  tracabilite: 'Traçabilité',
  centre_ia: 'Centre décisionnel',
  rapports: 'Rapports',
  equipements: 'Opérations & Ressources',
  smartfarm: 'Smart Farm',
};

export const AUTO_OPEN_FORM_TYPES = new Set([
  'health_action', 'animal_creation', 'animal_weighing', 'animal_loss', 'entity_lookup',
  'sale_record', 'egg_production', 'poultry_mortality', 'poultry_close', 'stock_purchase',
  'stock_movement', 'stock_critical_lookup', 'task_creation', 'finance_entry',
  'equipment_action', 'financing_file', 'culture_harvest', 'supplier_invoice',
]);

const REFRESH_KEYS_BY_MODULE = {
  dashboard: ['animaux', 'avicole', 'sante', 'finances', 'stock', 'clients', 'fournisseurs', 'cultures', 'taches', 'alertes_center', 'business_events', 'sales_orders', 'payments'],
  centre_ia: ['stock', 'finances', 'avicole', 'animaux', 'cultures', 'alertes_center', 'business_events', 'sales_orders', 'payments', 'sensor_devices', 'camera_devices'],
  stock: ['stock', 'alimentation_logs', 'business_events'],
  finances: ['finances', 'payments', 'business_events'],
  fournisseurs: ['fournisseurs', 'finances', 'stock', 'business_events'],
  clients: ['clients', 'sales_orders', 'payments', 'business_events'],
  ventes: ['sales_orders', 'sales_order_items', 'deliveries', 'invoices', 'payments', 'stock', 'clients', 'business_events'],
  animaux: ['animaux', 'sante', 'alimentation_logs', 'sales_opportunities', 'business_events'],
  avicole: ['avicole', 'production_oeufs_logs', 'alimentation_logs', 'sales_opportunities', 'business_events'],
  sante: ['sante', 'veterinaires', 'stock', 'finances', 'taches', 'business_events'],
  cultures: ['cultures', 'stock', 'finances', 'sales_opportunities', 'business_events'],
  documents: ['documents', 'finances', 'sales_orders', 'business_events'],
  taches: ['taches', 'alertes_center', 'business_events'],
  alertes: ['alertes_center', 'whatsapp_logs', 'taches', 'business_events'],
  tracabilite: ['tracabilite', 'business_events'],
  smartfarm: ['sensor_devices', 'camera_devices', 'alertes_center', 'taches', 'business_events'],
  equipements: ['equipements', 'taches', 'finances', 'documents', 'business_events'],
  rh: ['finances', 'taches', 'business_events'],
};

export const normalizeHeyHorizonText = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

export function heyHorizonModuleLabel(key = '') {
  return HEY_HORIZON_MODULE_LABELS[key] || 'Espace lié';
}

export function shouldAutoOpenHeyHorizonForm(draft = {}) {
  return draft?.primary_module && draft?.form_type && AUTO_OPEN_FORM_TYPES.has(draft.form_type) && draft.status !== 'draft_incomplete';
}

export function openHeyHorizonForm(draft = {}, onNavigate) {
  if (!draft?.primary_module) return;
  onNavigate?.(draft.primary_module);
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent('horizon-open-form', { detail: { module: draft.primary_module, draft } }));
  }, 220);
}

export function isWeakHeyHorizonDraft(draft = {}, text = '') {
  const cleaned = normalizeHeyHorizonText(text);
  if (!draft || draft.status === 'unsupported' || draft.status === 'wake_only') return true;
  if (draft.primary_module !== 'ventes' && draft.primary_module !== 'commercial') return false;
  return !/(vend|vente|vends|client|paiement|paye|payé|commande|livr|facture|poulet|chair|oeuf|œuf|tablette)/.test(cleaned);
}

export function buildHeyHorizonAssistantText(draft) {
  if (!draft || draft.status === 'unsupported' || draft.status === 'wake_only') return null;
  const missing = draft.missing_fields || [];
  const impacted = (draft.impacted_modules || []).map(heyHorizonModuleLabel).join(', ');
  if (draft.form_type === 'health_action') {
    return missing.length
      ? `J’ai compris : fiche santé à préparer. Il manque ${missing.join(', ')}.`
      : `J’ai compris : fiche ${draft.draft_fields?.action_type || 'santé'} pour ${draft.draft_fields?.target_id || draft.draft_fields?.animal_id}. J’ouvre la fiche préremplie.`;
  }
  if (missing.length) {
    return `J’ai compris l’action. Il reste ${missing.length} champ(s) à compléter. Modules concernés : ${impacted || heyHorizonModuleLabel(draft.primary_module)}.`;
  }
  if (draft.next_required_form) {
    return `J’ai compris, mais un formulaire lié est requis : ${draft.next_required_form.title}.`;
  }
  return `Action prête. J’ouvre la fiche préremplie dans ${heyHorizonModuleLabel(draft.primary_module)}.`;
}

export function buildHeyHorizonRefreshKeys(result = {}, draft = {}) {
  const modules = new Set([
    ...(result.impacted_modules || []),
    draft.primary_module,
    'dashboard',
    'centre_ia',
    'alertes',
    'tracabilite',
  ].filter(Boolean));
  const keys = new Set();
  modules.forEach((module) => (REFRESH_KEYS_BY_MODULE[module] || [module]).forEach((key) => keys.add(key)));
  return [...keys];
}

export async function refreshHeyHorizonModules(refreshModule, result = {}, draft = {}) {
  const keys = buildHeyHorizonRefreshKeys(result, draft);
  if (!keys.length || !refreshModule) return [];
  await Promise.allSettled(keys.map((key) => refreshModule(key)));
  toast.success(`Modules rafraîchis : ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? '…' : ''}`);
  return keys;
}

export async function validateHeyHorizonDraft(draft, { refreshModule, onNavigate } = {}) {
  if (!draft) throw new Error('Aucun brouillon à valider');
  if (shouldAutoOpenHeyHorizonForm(draft)) {
    openHeyHorizonForm(draft, onNavigate);
    return { ok: true, executed: false, message: 'Fiche préremplie ouverte pour validation', openedForm: true };
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  const response = await fetch('/api/assistant/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      draft,
      confirmed: true,
      execute: true,
      user_id: sessionData?.session?.user?.id || null,
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.message || result.execution?.results?.find?.((item) => item.error)?.error || 'Validation impossible');
  }
  await refreshHeyHorizonModules(refreshModule, result, draft);
  window.dispatchEvent(new CustomEvent('horizon-assistant-executed', { detail: result }));
  if (draft.primary_module) onNavigate?.(draft.primary_module);
  return result;
}

export function updateHeyHorizonDraftField(currentDraft, key, value) {
  if (!currentDraft) return currentDraft;
  return {
    ...currentDraft,
    draft_fields: { ...(currentDraft.draft_fields || {}), [key]: value },
    missing_fields: (currentDraft.missing_fields || []).filter((field) => field !== key),
  };
}

/**
 * Traite une commande Hey Horizon (stratégique ou brouillon).
 * Retourne { kind: 'strategic'|'draft'|'empty'|'error', strategic, draft, assistantText, journalEntry }
 */
export function processHeyHorizonCommand(rawText = '', { dataMap = {}, currentDraft = null, allowWeakDraft = false } = {}) {
  const cleaned = normalizeHeyHorizonText(rawText);
  if (!cleaned) {
    return { kind: 'empty', assistantText: 'Je suis prêt. Dis-moi l’action à faire : vaccin, vente, stock, œufs, tâche…' };
  }
  const strategicType = detectStrategicQuery(rawText);
  if (strategicType) {
    const answer = buildStrategicAnswer(strategicType, dataMap);
    const journalEntry = {
      type: 'strategic',
      text: rawText,
      module: answer?.route,
      confidence_score: answer?.confidence,
      action: answer?.title,
    };
    saveLocalRecommendation(journalEntry);
    return {
      kind: 'strategic',
      strategic: answer,
      draft: null,
      assistantText: answer?.summary || 'Analyse stratégique disponible.',
      journalEntry,
    };
  }
  const nextDraft = currentDraft
    ? updateHorizonDraft(currentDraft, rawText, dataMap)
    : interpretHorizonCommand(rawText, dataMap);
  if (nextDraft?.status === 'wake_only') {
    return { kind: 'empty', assistantText: 'Je suis prêt. Quelle action veux-tu faire ?' };
  }
  if (nextDraft?.status === 'unsupported') {
    const fallback = interpretVoiceCommand(rawText, dataMap);
    return {
      kind: 'error',
      draft: null,
      assistantText: fallback.answer || 'Commande non reconnue. Essaie une action rapide ou précise.',
      fallbackModule: fallback.moduleKey,
    };
  }
  const weak = !allowWeakDraft && isWeakHeyHorizonDraft(nextDraft, rawText);
  const draftText = weak ? null : buildHeyHorizonAssistantText(nextDraft);
  if (!draftText) {
    const fallback = interpretVoiceCommand(rawText, dataMap);
    return {
      kind: 'error',
      draft: null,
      assistantText: fallback.answer || 'Je n’ai pas assez compris. Précise vente, vaccin, stock, œufs, tâche ou dépense.',
      fallbackModule: fallback.moduleKey,
    };
  }
  const journalEntry = {
    type: 'draft',
    text: rawText,
    module: nextDraft.primary_module,
    confidence_score: Math.round((nextDraft.confidence || 0.85) * 100),
    action: nextDraft.ui?.title || nextDraft.intent,
  };
  saveLocalRecommendation(journalEntry);
  return {
    kind: 'draft',
    strategic: null,
    draft: nextDraft,
    assistantText: draftText,
    journalEntry,
    autoOpenForm: shouldAutoOpenHeyHorizonForm(nextDraft),
  };
}
